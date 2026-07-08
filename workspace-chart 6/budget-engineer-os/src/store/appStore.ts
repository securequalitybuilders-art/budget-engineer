import { create } from 'zustand';
import {
  CadDocument, BimModel, BOQ, TransactionEvent, ProjectRecord, MaterialSystem, RevisionRecord,
} from '../domain/types';
import { nextRev } from '../lib/drawingRegister';
import { designFingerprint } from '../lib/fingerprint';
import { designMetrics } from '../lib/designMetrics';
import { summarizeChanges } from '../lib/designMetrics';
import { db } from '../lib/db';
import { seedCadDocument } from '../lib/cadSeed';
import { generateBimModel } from '../engine/bimGenerator';
import { generateBoqFromBim } from '../engine/boqGenerator';
import { RebarSpec, DEFAULT_REBAR_SPEC } from '../lib/rebarSpec';
import { LoadCombo } from '../lib/loadEngine';
import { SectionConfig } from '../lib/sectionSvg';
import { SoilClass, DEFAULT_SOIL, sizeFootings } from '../lib/footingSizer';
import { RateCard, DEFAULT_RATE_CARD, RATE_CARDS } from '../lib/rateCard';
import { parseBrief } from '../ai/briefParser';
import { parseWithEngine, AiEngine } from '../ai/aiProvider';
import { generateDesignFromBrief } from '../ai/designEngine';

const uid = () => Math.random().toString(36).slice(2, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;

interface AppState {
  ready: boolean;
  project: ProjectRecord | null;
  projects: ProjectRecord[];
  activeProjectId: string;
  cad: CadDocument | null;
  bim: BimModel | null;
  boq: BOQ | null;
  transactions: TransactionEvent[];
  materialSystem: MaterialSystem;
  rebarSpec: RebarSpec;
  loadCombo: LoadCombo;
  soil: SoilClass;
  rateCard: RateCard;
  selectedElementId: string | null;
  activeFloorId: string | null;
  sectionConfig: SectionConfig | null;
  briefText: string;
  aiEngine: AiEngine;
  aiStatus: string | null;
  currentRevision: string;
  revisionLog: RevisionRecord['log'];

  initialize: () => Promise<void>;
  createProject: (name: string) => Promise<void>;
  openProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  bumpRevision: (note: string) => Promise<void>;
  setSelectedElement: (id: string | null) => void;
  setActiveFloor: (id: string) => void;
  setSectionConfig: (c: SectionConfig) => void;
  setLoadCombo: (c: LoadCombo) => Promise<void>;
  setSoil: (s: SoilClass) => Promise<void>;
  setRateCard: (card: RateCard) => Promise<void>;
  setRegion: (regionId: string) => Promise<void>;
  setBriefText: (t: string) => void;
  setAiEngine: (e: AiEngine) => void;
  generateFromBrief: () => Promise<void>;
  setMaterialSystem: (m: MaterialSystem) => Promise<void>;
  setRebarSpec: (spec: RebarSpec) => Promise<void>;
  moveCadWall: (wallId: string, dx: number, dy: number) => Promise<void>;
  moveCadBlock: (blockId: string, dx: number, dy: number) => Promise<void>;
}

const DEMO_ID = 'project-demo-1';

async function regenAndPersist(
  set: (p: Partial<AppState>) => void,
  get: () => AppState,
  nextCad: CadDocument,
  action: string,
  summary: string,
) {
  const bim = generateBimModel(nextCad);
  const schedule = sizeFootings(bim, get().loadCombo, get().soil);
  const boq = generateBoqFromBim(bim, get().rateCard, get().rebarSpec, schedule);
  await db.cadDocs.put(nextCad);
  await db.bimModels.put(bim);
  await db.boqs.put(boq);
  const tx: TransactionEvent = {
    id: uid(), projectId: nextCad.projectId, timestamp: Date.now(),
    actor: 'Dzenhare Owner', action, entityType: 'CAD', summary,
  };
  await db.transactions.put(tx);
  set({ cad: nextCad, bim, boq, transactions: [tx, ...get().transactions].slice(0, 100) });
}

/** Load (or seed) a project's full state and set it as active. */
async function loadProjectIntoState(
  set: (p: Partial<AppState>) => void,
  get: () => AppState,
  projectId: string,
) {
  const project = await db.projects.get(projectId);
  let cad = await db.cadDocs.get(`cad-${projectId}`);
  if (!cad) {
    cad = seedCadDocument(projectId, project?.name ?? 'New Scheme');
    await db.cadDocs.put(cad);
  }
  const bim = generateBimModel(cad);
  const schedule = sizeFootings(bim, get().loadCombo, get().soil);
  const boq = generateBoqFromBim(bim, get().rateCard, get().rebarSpec, schedule);
  await db.bimModels.put(bim);
  await db.boqs.put(boq);
  const transactions = await db.transactions
    .where('projectId').equals(projectId).reverse().sortBy('timestamp');
  let revRec = await db.revisions.get(projectId);
  if (!revRec) {
    revRec = {
      projectId, current: 'A',
      log: [{ rev: 'A', date: new Date().toISOString().slice(0, 10), note: 'First issue', by: 'Dzenhare Owner', fingerprint: designFingerprint(cad, boq), metrics: designMetrics(cad, bim, boq) }],
    };
    await db.revisions.put(revRec);
  }
  set({
    project: project ?? null,
    activeProjectId: projectId,
    cad, bim, boq,
    materialSystem: cad.materialSystem,
    activeFloorId: cad.floors[0]?.id ?? null,
    selectedElementId: null,
    transactions: transactions.slice(0, 100),
    currentRevision: revRec.current,
    revisionLog: revRec.log,
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  project: null,
  projects: [],
  activeProjectId: DEMO_ID,
  cad: null,
  bim: null,
  boq: null,
  transactions: [],
  materialSystem: 'concrete',
  rebarSpec: DEFAULT_REBAR_SPEC,
  loadCombo: 'ultimate',
  soil: DEFAULT_SOIL,
  rateCard: DEFAULT_RATE_CARD,
  selectedElementId: null,
  activeFloorId: null,
  sectionConfig: null,
  briefText: '3 bedroom house with 2 bathrooms, open plan kitchen and lounge, 120 m², single storey',
  aiEngine: 'local-rules',
  aiStatus: null,
  currentRevision: 'A',
  revisionLog: [],

  async initialize() {
    // ensure the demo project exists
    let demo = await db.projects.get(DEMO_ID);
    if (!demo) {
      demo = { id: DEMO_ID, name: 'Demo Budget Engineer Project', createdAt: Date.now() };
      await db.projects.put(demo);
    }
    const projects = await db.projects.toArray();
    await loadProjectIntoState(set, get, DEMO_ID);
    set({ ready: true, projects });
  },

  async createProject(name) {
    const id = `project-${uid()}`;
    const rec: ProjectRecord = { id, name: name.trim() || 'Untitled Scheme', createdAt: Date.now() };
    await db.projects.put(rec);
    await loadProjectIntoState(set, get, id); // seeds CAD/BIM/BOQ/revisions
    const projects = await db.projects.toArray();
    set({ projects });
  },

  async openProject(id) {
    await loadProjectIntoState(set, get, id);
  },

  async archiveProject(id) {
    const rec = await db.projects.get(id);
    if (!rec) return;
    await db.projects.put({ ...rec, archived: !rec.archived });
    const projects = await db.projects.toArray();
    set({ projects });
    // if archiving the active project, switch to the first non-archived one
    if (id === get().activeProjectId && !rec.archived) {
      const next = projects.find((p) => !p.archived && p.id !== id) ?? projects[0];
      if (next) await loadProjectIntoState(set, get, next.id);
    }
  },

  async renameProject(id, name) {
    const rec = await db.projects.get(id);
    if (!rec) return;
    await db.projects.put({ ...rec, name: name.trim() || rec.name });
    const projects = await db.projects.toArray();
    set({ projects, project: id === get().activeProjectId ? { ...rec, name } : get().project });
  },

  async bumpRevision(note) {
    const pid = get().activeProjectId;
    const rec = await db.revisions.get(pid);
    const prev = rec?.current ?? 'A';
    const log = rec?.log ?? [];
    const newRev = nextRev(prev);
    const c = get().cad; const b = get().bim; const bq = get().boq;
    const fp = c ? designFingerprint(c, bq) : undefined;
    const metrics = c && b ? designMetrics(c, b, bq) : undefined;
    // Stage 63: if no note given, auto-summarise the changes since the last issue
    let resolvedNote = note?.trim() ?? '';
    if (!resolvedNote) {
      const prevMetrics = log.length ? log[log.length - 1].metrics : undefined;
      if (prevMetrics && metrics) {
        const changes = summarizeChanges(prevMetrics, metrics);
        resolvedNote = changes.length ? changes.map((ch) => ch.text).join(', ') : 'No measurable change';
      } else {
        resolvedNote = 'Design revision';
      }
    }
    const entry = { rev: newRev, date: new Date().toISOString().slice(0, 10), note: resolvedNote, by: 'Dzenhare Owner', fingerprint: fp, metrics };
    const nextLog = [...log, entry];
    await db.revisions.put({ projectId: pid, current: newRev, log: nextLog });
    const tx: TransactionEvent = {
      id: uid(), projectId: pid, timestamp: Date.now(),
      actor: 'Dzenhare Owner', action: 'REVISION_BUMPED', entityType: 'PROJECT',
      summary: `Issued Rev ${newRev}: ${entry.note}`,
    };
    await db.transactions.put(tx);
    set({ currentRevision: newRev, revisionLog: nextLog, transactions: [tx, ...get().transactions].slice(0, 100) });
  },

  setSelectedElement(id) { set({ selectedElementId: id }); },
  setActiveFloor(id) { set({ activeFloorId: id }); },
  setSectionConfig(c) { set({ sectionConfig: c }); },
  async setLoadCombo(c) {
    set({ loadCombo: c });
    const cad = get().cad;
    if (!cad) return;
    await regenAndPersist(set, get, cad, 'LOAD_COMBO_CHANGED', `Load combination set to ${c}`);
  },
  async setSoil(s) {
    set({ soil: s });
    const cad = get().cad;
    if (!cad) return;
    await regenAndPersist(set, get, cad, 'SOIL_CHANGED', `Soil class set to ${s} — footings re-sized`);
  },
  setBriefText(t) { set({ briefText: t }); },
  setAiEngine(e) { set({ aiEngine: e, aiStatus: null }); },

  async generateFromBrief() {
    const engine = get().aiEngine;
    set({ aiStatus: engine === 'webllm' ? 'Loading local model… (first run downloads it)' : 'Parsing brief…' });
    const parsed = await parseWithEngine(get().briefText, engine);
    const cad = generateDesignFromBrief(parsed, get().activeProjectId, get().materialSystem);
    set({
      activeFloorId: cad.floors[0]?.id ?? null,
      selectedElementId: null,
      aiStatus: parsed.fellBack
        ? `Local LLM unavailable (${parsed.fallbackReason}) — used rules parser`
        : `Parsed by ${parsed.engineUsed === 'webllm' ? 'local LLM' : 'rules parser'}`,
    });
    await regenAndPersist(set, get, cad, 'AI_DESIGN_GENERATED',
      `[${parsed.engineUsed}] ${parsed.buildingType}: ${parsed.bedrooms} bed / ${parsed.bathrooms} bath / ${parsed.approxAreaM2} m²`);
  },

  async setMaterialSystem(m) {
    const cad = get().cad;
    if (!cad) return;
    const next: CadDocument = {
      ...cad,
      materialSystem: m,
      walls: cad.walls.map((w) => ({ ...w, metadata: { ...w.metadata, material: w.metadata.material ?? m } })),
    };
    set({ materialSystem: m });
    await regenAndPersist(set, get, next, 'MATERIAL_SYSTEM_CHANGED', `Default material set to ${m}`);
  },

  async setRebarSpec(spec) {
    set({ rebarSpec: spec });
    const cad = get().cad;
    if (!cad) return;
    // re-run BOQ with the new spec (geometry unchanged)
    await regenAndPersist(set, get, cad, 'REBAR_SPEC_OVERRIDE',
      `Rebar spec set to Y${spec.diameter} @ ${spec.spacing} c/c x${spec.layers}`);
  },

  async setRateCard(card) {
    set({ rateCard: card });
    const cad = get().cad;
    if (!cad) return;
    await regenAndPersist(set, get, cad, 'RATE_CARD_UPDATED',
      `Rate card updated: ${card.region} (${card.currency})`);
  },

  async setRegion(regionId) {
    const card = RATE_CARDS[regionId] ?? DEFAULT_RATE_CARD;
    set({ rateCard: card });
    const cad = get().cad;
    if (!cad) return;
    await regenAndPersist(set, get, cad, 'REGION_CHANGED',
      `Region set to ${card.region} (${card.currency})`);
  },

  async moveCadWall(wallId, dx, dy) {
    const cad = get().cad;
    if (!cad) return;
    const next: CadDocument = {
      ...cad,
      walls: cad.walls.map((w) => w.id === wallId
        ? { ...w, start: { x: round2(w.start.x + dx), y: round2(w.start.y + dy) }, end: { x: round2(w.end.x + dx), y: round2(w.end.y + dy) } }
        : w),
    };
    await regenAndPersist(set, get, next, 'CAD_WALL_MOVED', `Moved ${wallId} by (${dx}, ${dy})`);
  },

  async moveCadBlock(blockId, dx, dy) {
    const cad = get().cad;
    if (!cad) return;
    const next: CadDocument = {
      ...cad,
      blocks: cad.blocks.map((b) => b.id === blockId
        ? { ...b, position: { x: round2(b.position.x + dx), y: round2(b.position.y + dy) } }
        : b),
    };
    await regenAndPersist(set, get, next, 'CAD_BLOCK_MOVED', `Moved ${blockId} by (${dx}, ${dy})`);
  },
}));
