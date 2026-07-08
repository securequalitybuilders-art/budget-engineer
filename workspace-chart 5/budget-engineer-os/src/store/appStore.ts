import { create } from 'zustand';
import { db } from '../lib/db';
import { loadPersistedUserId, persistUserId } from '../lib/session';
import type { User } from '../domain/rbac';
import type { ProjectRecord } from '../domain/project';
import type { CadDocument, CadWall, CadBlock, CadOpening, CadFloor, Vec2 } from '../domain/cad';
import type { BimModel } from '../domain/bim';
import type { BOQ } from '../domain/boq';
import type { ProjectSnapshot } from '../domain/versioning';
import type { GovernanceRecord, GovernanceComment } from '../domain/governance';
import type { TransactionEvent } from '../domain/transaction';
import { generateBimModel } from '../engine/bimGenerator';
import { generateBoqFromBim } from '../engine/boqGenerator';
function uuid8(): string { return Math.random().toString(36).slice(2, 10); }
function now(): number { return Date.now(); }
const seedUsers: User[] = [
  { id: 'user-1', name: 'Dzenhare Owner', role: 'owner' },
  { id: 'user-2', name: 'QS Reviewer', role: 'reviewer' },
  { id: 'user-3', name: 'Stakeholder Viewer', role: 'viewer' },
];
function seedCad(projectId: string): CadDocument {
  const floor1: CadFloor = { id: 'floor-1', name: 'Ground Floor', elevation: 0, height: 3 };
  return {
    id: `cad-${projectId}`, projectId, name: 'Demo Plan', floors: [floor1],
    rebarSpec: { barSize: 'Y12', spacing: 200, layers: 2 },
    walls: [
      { id: 'w1', floorId: 'floor-1', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.2, height: 3, name: 'South Wall', structural: true, metadata: { ifcClass: 'IfcWallStandardCase', category: 'Wall', material: 'concrete' } },
      { id: 'w2', floorId: 'floor-1', start: { x: 12, y: 0 }, end: { x: 12, y: 8 }, thickness: 0.2, height: 3, name: 'East Wall', structural: true, metadata: { ifcClass: 'IfcWallStandardCase', category: 'Wall', material: 'concrete' } },
      { id: 'w3', floorId: 'floor-1', start: { x: 12, y: 8 }, end: { x: 0, y: 8 }, thickness: 0.2, height: 3, name: 'North Wall', structural: true, metadata: { ifcClass: 'IfcWallStandardCase', category: 'Wall', material: 'concrete' } },
      { id: 'w4', floorId: 'floor-1', start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, thickness: 0.2, height: 3, name: 'West Wall', structural: true, metadata: { ifcClass: 'IfcWallStandardCase', category: 'Wall', material: 'concrete' } },
      { id: 'w5', floorId: 'floor-1', start: { x: 6, y: 0 }, end: { x: 6, y: 8 }, thickness: 0.2, height: 3, name: 'Partition', structural: false, metadata: { ifcClass: 'IfcWall', category: 'Wall', material: 'concrete' } },
    ],
    openings: [
      { id: 'o1', wallId: 'w2', floorId: 'floor-1', kind: 'door', offset: 3, width: 0.9, name: 'Main Door', metadata: { ifcClass: 'IfcDoor', category: 'Opening' } },
    ],
    blocks: [
      { id: 'b1', floorId: 'floor-1', kind: 'sofa', position: { x: 3, y: 3 }, width: 1.8, depth: 0.9, name: 'Living Sofa', metadata: { ifcClass: 'IfcBuildingElementProxy', category: 'Furniture' } },
    ],
  };
}
export interface AppState {
  projects: ProjectRecord[];
  activeProjectId: string | null;
  cad: CadDocument | null;
  bim: BimModel | null;
  boq: BOQ | null;
  transactions: TransactionEvent[];
  snapshots: ProjectSnapshot[];
  portfolio: ProjectSnapshot[];
  users: User[];
  currentUser: User;
  selectedElementId: string | null;
  selectedElementIds: string[];
  activeFloorId: string | null;
  show3d: boolean;
  compareLeftProjectId: string | null;
  compareRightProjectId: string | null;
  mepEnabled: boolean;
  materialSystem: 'concrete' | 'steel' | 'timber';
  initialize: () => Promise<void>;
  createProject: (name: string) => Promise<void>;
  openProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  switchUser: (id: string) => void;
  setSelectedElement: (id: string | null) => void;
  setSelectedElements: (ids: string[]) => void;
  setActiveFloorId: (id: string | null) => void;
  toggleShow3d: () => void;
  moveCadWall: (wallId: string, dx: number, dy: number) => void;
  moveCadBlock: (blockId: string, x: number, y: number) => void;
  moveCadWallEndpoint: (wallId: string, end: 'start' | 'end', x: number, y: number) => void;
  addCadWall: (floorId: string, start: Vec2, end: Vec2) => void;
  deleteCadElement: (kind: 'wall' | 'block', id: string) => void;
  addCadOpening: (wallId: string, kind: 'door' | 'window', offset?: number) => void;
  deleteCadOpening: (openingId: string) => void;
    updateCadWallProps: (wallId: string, props: Partial<Pick<CadWall, 'thickness' | 'structural' | 'name' | 'material' | 'height' | 'metadata'>>) => void;
    updateCadWallsProps: (wallIds: string[], props: Partial<Pick<CadWall, 'thickness' | 'structural' | 'name' | 'material' | 'height' | 'metadata'>>) => void;
  updateCadOpening: (openingId: string, patch: Partial<Pick<CadOpening, 'kind' | 'width'>>) => void;
  updateCadOpeningFamily: (openingId: string, params: Record<string, string | number | boolean>) => void;
  moveCadOpening: (openingId: string, offset: number) => void;
  duplicateCadSelection: (bimIds: string[], dx?: number, dy?: number) => void;
  trimExtendCadWalls: (wallAId: string, wallBId: string) => void;
  generateStructuralColumns: (floorId: string) => void;
  generateStructuralBeams: (floorId: string) => void;
  generateFoundationFootings: (floorId: string) => void;
  calculateMepTakeoff: () => void;
  autoHealClashes: () => void;
  importCadFromIfc: (ifcText: string) => Promise<{ ok: boolean; message: string }>;
  createSnapshot: (name?: string) => Promise<void>;
  restoreSnapshot: (snapshotId: string) => Promise<void>;
  setCompareLeftProjectId: (id: string | null) => void;
  setCompareRightProjectId: (id: string | null) => void;
  addGovernanceNote: (message: string) => Promise<void>;
  sendToReview: (note?: string) => Promise<void>;
  approveProject: (note?: string) => Promise<void>;
  rejectProject: (reason?: string) => Promise<void>;
  setMaterialSystem: (system: 'concrete' | 'steel' | 'timber') => void;
  updateCadElementMaterial: (elementId: string, material: 'concrete' | 'steel' | 'timber') => void;
  setRebarSpec: (spec: import('../domain/cad').RebarSpec) => void;
  regenerateAll: () => Promise<void>;
}
function round2(n: number): number { return Math.round(n * 100) / 100; }
export const useAppStore = create<AppState>((set, get) => {
  const log = async (action: string, entityType: TransactionEvent['entityType'], summary: string, before?: string, after?: string) => {
    const s = get();
    const ev: TransactionEvent = { id: `txn-${uuid8()}`, projectId: s.activeProjectId || 'none', entityType, action, actor: s.currentUser.name, summary, before, after, timestamp: now() };
    await db.transactions.add(ev);
    set(state => ({ transactions: [ev, ...state.transactions] }));
  };
  const persistCadAndRegen = async (nextCad: CadDocument, action: string, summary: string) => {
    const s = get();
    const projectId = s.activeProjectId || nextCad.projectId;
    await db.cadDocs.put(nextCad);
      const bim = generateBimModel(nextCad, projectId);
      await db.bimModels.put(bim);
      const boq = generateBoqFromBim(bim, nextCad.rebarSpec);
      await db.boqs.put(boq);
    await log(action, 'CAD', summary, undefined, undefined);
    set({ cad: nextCad, bim, boq });
  };
  const persistedUserId = loadPersistedUserId();
  const initialUser = seedUsers.find(u => u.id === persistedUserId) || seedUsers[0];
  return {
    projects: [], activeProjectId: null, cad: null, bim: null, boq: null, transactions: [], snapshots: [], portfolio: [], users: seedUsers, currentUser: initialUser, selectedElementId: null, selectedElementIds: [], activeFloorId: 'floor-1', show3d: false,
    compareLeftProjectId: null, compareRightProjectId: null, mepEnabled: false, materialSystem: 'concrete',
    initialize: async () => {
      const projs = await db.projects.toArray();
      if (projs.length === 0) {
        const p: ProjectRecord = { id: 'project-demo-1', name: 'Demo Budget Engineer Project', region: 'Zimbabwe', currency: 'USD', status: 'active', createdAt: now() };
        await db.projects.add(p);
        const cad = seedCad(p.id);
        await db.cadDocs.put(cad);
        const bim = generateBimModel(cad, p.id);
        await db.bimModels.put(bim);
        const boq = generateBoqFromBim(bim, cad.rebarSpec);
        await db.boqs.put(boq);
        const snap: ProjectSnapshot = { id: `snap-${uuid8()}`, projectId: p.id, name: 'Initial', createdAt: now(), cadId: cad.id, bimId: bim.id, boqId: boq.id };
        await db.snapshots.add(snap);
        set({ projects: [p], activeProjectId: p.id, cad, bim, boq, snapshots: [snap], activeFloorId: 'floor-1' });
        await log('PROJECT_INIT', 'PROJECT', 'Initialized demo project and seeded CAD/BIM/BOQ', undefined, undefined);
      } else {
        set({ projects: projs });
      }
    },
    createProject: async (name) => {
      const p: ProjectRecord = { id: `project-${uuid8()}`, name, region: 'Zimbabwe', currency: 'USD', status: 'active', createdAt: now() };
      await db.projects.add(p);
      const cad = seedCad(p.id);
      await db.cadDocs.put(cad);
      const bim = generateBimModel(cad, p.id);
      await db.bimModels.put(bim);
      const boq = generateBoqFromBim(bim, cad.rebarSpec);
      await db.boqs.put(boq);
      set(state => ({ projects: [...state.projects, p], activeProjectId: p.id, cad, bim, boq, snapshots: state.snapshots, activeFloorId: 'floor-1' }));
      await log('PROJECT_CREATE', 'PROJECT', `Created project ${name}`, undefined, undefined);
    },
    openProject: async (id) => {
      const cad = await db.cadDocs.get(`cad-${id}`);
      const bim = await db.bimModels.get(`bim-cad-${id}`);
      const boq = await db.boqs.get(`boq-bim-cad-${id}`);
      if (cad && bim && boq) {
        set({ activeProjectId: id, cad, bim, boq, selectedElementId: null, selectedElementIds: [], activeFloorId: cad.floors[0]?.id || null });
      }
    },
    archiveProject: async (id) => {
      await db.projects.update(id, { status: 'archived' });
      set(state => ({ projects: state.projects.map(p => p.id === id ? { ...p, status: 'archived' } : p) }));
      await log('PROJECT_ARCHIVE', 'PROJECT', `Archived project ${id}`, undefined, undefined);
    },
    switchUser: (id) => {
      const user = get().users.find(u => u.id === id) || get().users[0];
      persistUserId(user.id);
      set({ currentUser: user });
    },
    setSelectedElement: (id) => set({ selectedElementId: id }),
    setSelectedElements: (ids) => set({ selectedElementIds: ids }),
    setActiveFloorId: (id) => set({ activeFloorId: id }),
    toggleShow3d: () => set(state => ({ show3d: !state.show3d })),
    moveCadWall: async (wallId, dx, dy) => {
      const s = get(); if (!s.cad) return;
      const next: CadDocument = { ...s.cad, walls: s.cad.walls.map(w => w.id === wallId ? { ...w, start: { x: round2(w.start.x + dx), y: round2(w.start.y + dy) }, end: { x: round2(w.end.x + dx), y: round2(w.end.y + dy) } } : w) };
      await persistCadAndRegen(next, 'CAD_WALL_MOVED', `Moved wall ${wallId}`);
    },
    moveCadBlock: async (blockId, x, y) => {
      const s = get(); if (!s.cad) return;
      const next: CadDocument = { ...s.cad, blocks: s.cad.blocks.map(b => b.id === blockId ? { ...b, position: { x: round2(x), y: round2(y) } } : b) };
      await persistCadAndRegen(next, 'CAD_BLOCK_MOVED', `Moved block ${blockId}`);
    },
    moveCadWallEndpoint: async (wallId, end, x, y) => {
      const s = get(); if (!s.cad) return;
      const next: CadDocument = { ...s.cad, walls: s.cad.walls.map(w => w.id === wallId ? { ...w, [end]: { x: round2(x), y: round2(y) } } : w) };
      await persistCadAndRegen(next, 'CAD_WALL_RESHAPED', `Reshaped wall ${wallId}`);
    },
    addCadWall: async (floorId, start, end) => {
      const s = get(); if (!s.cad) return;
      const mat = s.materialSystem || 'concrete';
      const w: CadWall = { id: `w-${uuid8()}`, floorId, start, end, thickness: 0.2, height: 3, structural: true, name: 'New Wall', metadata: { ifcClass: 'IfcWallStandardCase', category: 'Wall', material: mat } };
      const next: CadDocument = { ...s.cad, walls: [...s.cad.walls, w] };
      await persistCadAndRegen(next, 'CAD_WALL_ADDED', `Added wall ${w.id}`);
    },
    deleteCadElement: async (kind, id) => {
      const s = get(); if (!s.cad) return;
      let next: CadDocument = { ...s.cad };
      if (kind === 'wall') { next.walls = s.cad.walls.filter(w => w.id !== id); next.openings = s.cad.openings.filter(o => o.wallId !== id); } else { next.blocks = s.cad.blocks.filter(b => b.id !== id); }
      const sel = s.selectedElementId === id ? null : s.selectedElementId;
      const sels = s.selectedElementIds.filter(x => x !== id);
      await persistCadAndRegen(next, 'CAD_ELEMENT_DELETED', `Deleted ${kind} ${id}`);
      set({ selectedElementId: sel, selectedElementIds: sels });
    },
    addCadOpening: async (wallId, kind, offset = 0.5) => {
      const s = get(); if (!s.cad) return;
      const o: CadOpening = { id: `o-${uuid8()}`, wallId, floorId: s.cad.walls.find(w => w.id === wallId)?.floorId || 'floor-1', kind, offset: round2(offset), width: kind === 'door' ? 0.9 : 1.2, sillHeight: kind === 'window' ? 0.9 : undefined, headHeight: 2.1, metadata: { ifcClass: kind === 'door' ? 'IfcDoor' : 'IfcWindow', category: 'Opening' } };
      const next: CadDocument = { ...s.cad, openings: [...s.cad.openings, o] };
      await persistCadAndRegen(next, 'CAD_OPENING_ADDED', `Added ${kind} ${o.id}`);
    },
    deleteCadOpening: async (openingId) => {
      const s = get(); if (!s.cad) return;
      const next: CadDocument = { ...s.cad, openings: s.cad.openings.filter(o => o.id !== openingId) };
      await persistCadAndRegen(next, 'CAD_OPENING_DELETED', `Deleted opening ${openingId}`);
    },
    updateCadWallProps: async (wallId, props) => {
      const s = get(); if (!s.cad) return;
      const next: CadDocument = { ...s.cad, walls: s.cad.walls.map(w => w.id === wallId ? { ...w, ...props } : w) };
      await persistCadAndRegen(next, 'CAD_WALL_PROPS_UPDATED', `Updated wall ${wallId}`);
    },
    updateCadWallsProps: async (wallIds, props) => {
      const s = get(); if (!s.cad) return;
      const next: CadDocument = { ...s.cad, walls: s.cad.walls.map(w => wallIds.includes(w.id) ? { ...w, ...props } : w) };
      await persistCadAndRegen(next, 'CAD_WALLS_BATCH_UPDATED', `Batch updated ${wallIds.length} walls`);
    },
    updateCadOpening: async (openingId, patch) => {
      const s = get(); if (!s.cad) return;
      const next: CadDocument = { ...s.cad, openings: s.cad.openings.map(o => o.id === openingId ? { ...o, ...patch, metadata: { ...o.metadata, ifcClass: patch.kind === 'door' ? 'IfcDoor' : patch.kind === 'window' ? 'IfcWindow' : o.metadata?.ifcClass || 'IfcDoor', category: o.metadata?.category || 'Opening' } } : o) };
      await persistCadAndRegen(next, 'CAD_OPENING_UPDATED', `Updated opening ${openingId}`);
    },
    updateCadOpeningFamily: async (openingId, params) => {
      const s = get(); if (!s.cad) return;
      const next: CadDocument = { ...s.cad, openings: s.cad.openings.map(o => o.id === openingId ? { ...o, metadata: { ...o.metadata, ifcClass: o.metadata?.ifcClass || 'IfcDoor', category: o.metadata?.category || 'Opening', properties: { ...(o.metadata?.properties || {}), ...params } } } : o) };
      await persistCadAndRegen(next, 'CAD_OPENING_FAMILY_UPDATED', `Updated opening family ${openingId}`);
    },
    moveCadOpening: async (openingId, offset) => {
      const s = get(); if (!s.cad) return;
      const next: CadDocument = { ...s.cad, openings: s.cad.openings.map(o => o.id === openingId ? { ...o, offset: round2(offset) } : o) };
      await persistCadAndRegen(next, 'CAD_OPENING_MOVED', `Moved opening ${openingId}`);
    },
    duplicateCadSelection: async (bimIds, dx = 0, dy = 0) => {
      const s = get(); if (!s.cad) return;
      const newIds: string[] = [];
      const idMap = new Map<string, string>();
      let walls = s.cad.walls; let blocks = s.cad.blocks; let openings = s.cad.openings;
      for (const bid of bimIds) {
        const cadId = bid.replace(/^bim-/, '');
        const w = s.cad.walls.find(x => x.id === cadId);
        if (w) { const nid = `w-${uuid8()}`; idMap.set(w.id, nid); walls = [...walls, { ...w, id: nid, start: { x: round2(w.start.x + dx), y: round2(w.start.y + dy) }, end: { x: round2(w.end.x + dx), y: round2(w.end.y + dy) } }]; newIds.push(nid); }
        const b = s.cad.blocks.find(x => x.id === cadId);
        if (b) { const nid = `b-${uuid8()}`; blocks = [...blocks, { ...b, id: nid, position: { x: round2(b.position.x + dx), y: round2(b.position.y + dy) } }]; newIds.push(nid); }
      }
      for (const o of s.cad.openings) { if (bimIds.includes(`bim-${o.id}`) && idMap.has(o.wallId)) { openings = [...openings, { ...o, id: `o-${uuid8()}`, wallId: idMap.get(o.wallId)! }]; } }
      const next: CadDocument = { ...s.cad, walls, blocks, openings };
      await persistCadAndRegen(next, 'CAD_SELECTION_DUPLICATED', `Duplicated ${bimIds.length} elements`);
      set({ selectedElementIds: newIds.map(id => `bim-${id}`) });
    },
    trimExtendCadWalls: async (wallAId, wallBId) => {
      const s = get(); if (!s.cad) return;
      const a = s.cad.walls.find(w => w.id === wallAId); const b = s.cad.walls.find(w => w.id === wallBId);
      if (!a || !b) return;
      const ax = a.end.x - a.start.x, ay = a.end.y - a.start.y;
      const bx = b.end.x - b.start.x, by = b.end.y - b.start.y;
      const d = ax * by - ay * bx; if (Math.abs(d) < 1e-6) return;
      const cx = b.start.x - a.start.x, cy = b.start.y - a.start.y;
      const t = (cx * by - cy * bx) / d; const u = (cx * ay - cy * ax) / d;
      const ix = round2(a.start.x + ax * t), iy = round2(a.start.y + ay * t);
      const dist = (p: Vec2) => Math.hypot(p.x - ix, p.y - iy);
      const aEnd = dist(a.start) < dist(a.end) ? 'start' : 'end';
      const bEnd = dist(b.start) < dist(b.end) ? 'start' : 'end';
      const next: CadDocument = { ...s.cad, walls: s.cad.walls.map(w => w.id === wallAId ? { ...w, [aEnd]: { x: ix, y: iy } } : w.id === wallBId ? { ...w, [bEnd]: { x: ix, y: iy } } : w) };
      await persistCadAndRegen(next, 'CAD_WALLS_TRIMMED_JOINED', `Trimmed/joined walls ${wallAId} & ${wallBId}`);
    },
    generateStructuralColumns: async (floorId) => {
      const s = get(); if (!s.cad) return;
      const nodes: Vec2[] = [];
      const tol = 0.1;
      for (const w of s.cad.walls.filter(w => w.floorId === floorId && w.structural)) {
        for (const p of [w.start, w.end]) {
          if (!nodes.some(n => Math.hypot(n.x - p.x, n.y - p.y) < tol)) nodes.push(p);
        }
      }
      const existing = new Set(s.cad.blocks.filter(b => b.floorId === floorId && b.kind === 'column').map(b => `${round2(b.position.x)},${round2(b.position.y)}`));
      const newBlocks: CadBlock[] = [];
      for (const n of nodes) {
        const key = `${round2(n.x)},${round2(n.y)}`;
        if (!existing.has(key)) {
          const mat = s.materialSystem || 'concrete';
          newBlocks.push({ id: `col-${uuid8()}`, floorId, kind: 'column', position: { x: round2(n.x), y: round2(n.y) }, width: 0.3, depth: 0.3, name: 'Structural Column', metadata: { ifcClass: 'IfcBuildingElementProxy', category: 'Structural', material: mat, properties: { material: '30MPa Concrete', capacity: '1200kN' } } });
        }
      }
      const next: CadDocument = { ...s.cad, blocks: [...s.cad.blocks, ...newBlocks] };
      await persistCadAndRegen(next, 'CAD_STRUCTURAL_COLUMNS_GENERATED', `Generated ${newBlocks.length} columns`);
    },
    generateStructuralBeams: async (floorId) => {
      const s = get(); if (!s.cad) return;
      const columns = s.cad.blocks.filter(b => b.floorId === floorId && b.kind === 'column');
      const walls = s.cad.walls.filter(w => w.floorId === floorId && w.structural);
      const newBeams: CadWall[] = [];
      const seen = new Set<string>();
      for (let i = 0; i < columns.length; i++) {
        for (let j = i + 1; j < columns.length; j++) {
          const a = columns[i].position; const b = columns[j].position;
          const onWall = walls.some(w => {
            const t1 = (a.x - w.start.x) * (w.end.x - w.start.x) + (a.y - w.start.y) * (w.end.y - w.start.y);
            const t2 = (b.x - w.start.x) * (w.end.x - w.start.x) + (b.y - w.start.y) * (w.end.y - w.start.y);
            const len2 = (w.end.x - w.start.x) ** 2 + (w.end.y - w.start.y) ** 2;
            if (len2 < 1e-6) return false;
            const u1 = t1 / len2, u2 = t2 / len2;
            return (u1 >= -0.01 && u1 <= 1.01 && u2 >= -0.01 && u2 <= 1.01);
          });
          if (!onWall) {
            const key = `${round2(a.x)},${round2(a.y)}->${round2(b.x)},${round2(b.y)}`;
            if (!seen.has(key)) {
              seen.add(key);
              const mat = s.materialSystem || 'concrete';
              newBeams.push({ id: `beam-${uuid8()}`, floorId, start: { x: round2(a.x), y: round2(a.y) }, end: { x: round2(b.x), y: round2(b.y) }, thickness: 0.25, height: 0.35, name: 'Link Beam', structural: true, metadata: { ifcClass: 'IfcBeam', category: 'Beam', material: mat } });
            }
          }
        }
      }
      const next: CadDocument = { ...s.cad, walls: [...s.cad.walls, ...newBeams] };
      await persistCadAndRegen(next, 'CAD_STRUCTURAL_BEAMS_GENERATED', `Generated ${newBeams.length} link beams between columns`);
    },
    generateFoundationFootings: async (floorId) => {
      const s = get(); if (!s.cad) return;
      const columns = s.cad.blocks.filter(b => b.floorId === floorId && b.kind === 'column');
      const existing = new Set(s.cad.blocks.filter(b => b.floorId === floorId && b.kind === 'footing').map(b => `${round2(b.position.x)},${round2(b.position.y)}`));
      const newFootings: CadBlock[] = [];
      for (const col of columns) {
        const key = `${round2(col.position.x)},${round2(col.position.y)}`;
        if (!existing.has(key)) {
          const mat = s.materialSystem || 'concrete';
          newFootings.push({ id: `ft-${uuid8()}`, floorId, kind: 'footing', position: { x: round2(col.position.x), y: round2(col.position.y) }, width: 1.0, depth: 0.4, name: 'Pad Footing', metadata: { ifcClass: 'IfcFooting', category: 'Footing', material: mat, properties: { material: '30MPa Concrete', rebar: 'Y12 @ 200 c/c', bearing: '150 kPa' } } });
        }
      }
      const next: CadDocument = { ...s.cad, blocks: [...s.cad.blocks, ...newFootings] };
      await persistCadAndRegen(next, 'CAD_FOUNDATION_FOOTINGS_GENERATED', `Generated ${newFootings.length} pad footings under columns`);
    },
    calculateMepTakeoff: async () => {
      const s = get(); if (!s.cad || !s.bim) return;
      set({ mepEnabled: true });
      await persistCadAndRegen(s.cad, 'CAD_MEP_TAKEOFF_CALCULATED', 'Calculated MEP takeoff');
    },
    autoHealClashes: async () => {
      const s = get(); if (!s.cad) return;
      let next: CadDocument = { ...s.cad };
      let changed = false;
      for (const o of next.openings) {
        const w = next.walls.find(w => w.id === o.wallId);
        if (!w) continue;
        const len = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
        if (o.offset < 0.3) { o.offset = 0.5; changed = true; }
        if (o.offset + o.width > len - 0.3) { o.offset = round2(len - o.width - 0.5); changed = true; }
      }
      for (const b of next.blocks) {
        const touching = next.walls.some(w => {
          const mid = { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
          return Math.hypot(b.position.x - mid.x, b.position.y - mid.y) < 0.5;
        });
        if (touching) { b.position = { x: round2(b.position.x + 1.0), y: round2(b.position.y + 1.0) }; changed = true; }
      }
      if (changed) await persistCadAndRegen(next, 'BIM_CLASHES_RESOLVED', 'Auto-healed spatial clashes');
    },
    importCadFromIfc: async (ifcText) => {
      try {
        const s = get(); const projectId = s.activeProjectId || 'imported';
        const lines = ifcText.split(/\r?\n/);
        const index = new Map<string, string>();
        for (const line of lines) { const m = line.match(/#(\d+)\s*=\s*(.+)/); if (m) index.set(`#${m[1]}`, m[2]); }
        const psets: Record<string, Record<string, string>> = {};
        for (const line of lines) {
          const m = line.match(/#(\d+)\s*=\s*IFCPROPERTYSINGLEVALUE\s*\(\s*'([^']+)'\s*,[^,]*,\s*(\w+)\s*\(\s*(?:'([^']*)'|([^)]*))\s*\)/i);
          if (!m) continue;
          const pid = `#${m[1]}`; const name = m[2]; const val = m[4] !== undefined ? m[4] : (m[5] || '');
          for (const k of Object.keys(psets)) { if (index.get(k)?.includes(pid)) psets[k][name] = val; }
        }
        for (const line of lines) {
          const m = line.match(/#(\d+)\s*=\s*IFCPROPERTYSET\s*\([^,]*,\s*[^,]*,\s*'Dzenhare_CAD'/i);
          if (m) psets[`#${m[1]}`] = {};
        }
        const walls: CadWall[] = [];
        const openings: CadOpening[] = [];
        const blocks: CadBlock[] = [];
        const floors: CadFloor[] = [{ id: 'floor-1', name: 'Ground Floor', elevation: 0, height: 3 }];
        for (const line of lines) {
          const wm = line.match(/#(\d+)\s*=\s*IFCWALLSTANDARDCASE/i);
          if (wm) {
            const ps = Object.values(psets).find(p => p.type === 'wall');
            if (ps) {
              const sx = parseFloat(ps.startX || '0');
              const sy = parseFloat(ps.startY || '0');
              const ex = parseFloat(ps.endX || '0');
              const ey = parseFloat(ps.endY || '0');
              walls.push({ id: ps.id || `w-${uuid8()}`, floorId: 'floor-1', start: { x: sx, y: sy }, end: { x: ex, y: ey }, thickness: parseFloat(ps.thickness || '0.2'), height: parseFloat(ps.height || '3'), name: ps.name || 'Wall', structural: ps.structural === 'true', metadata: { ifcClass: 'IfcWallStandardCase', category: 'Wall' } });
            }
          }
        }
        const cad: CadDocument = { id: `cad-${projectId}`, projectId, name: 'Imported', floors, walls, openings, blocks };
        await persistCadAndRegen(cad, 'CAD_IFC_IMPORTED', 'Imported IFC into CAD');
        return { ok: true, message: 'IFC imported' };
      } catch (e) { return { ok: false, message: String(e) }; }
    },
    createSnapshot: async (name) => {
      const s = get(); if (!s.activeProjectId || !s.cad || !s.bim || !s.boq) return;
      const snap: ProjectSnapshot = { id: `snap-${uuid8()}`, projectId: s.activeProjectId, name: name || `Snapshot ${s.snapshots.length + 1}`, createdAt: now(), cadId: s.cad.id, bimId: s.bim.id, boqId: s.boq.id };
      await db.snapshots.add(snap);
      set(state => ({ snapshots: [...state.snapshots, snap] }));
      await log('SNAPSHOT_CREATE', 'PROJECT', `Created snapshot ${snap.name}`, undefined, undefined);
    },
    restoreSnapshot: async (snapshotId) => {
      const snap = await db.snapshots.get(snapshotId); if (!snap) return;
      const cad = await db.cadDocs.get(snap.cadId); const bim = await db.bimModels.get(snap.bimId); const boq = await db.boqs.get(snap.boqId);
      if (cad && bim && boq) { set({ cad, bim, boq, activeProjectId: snap.projectId, activeFloorId: cad.floors[0]?.id || null }); await log('SNAPSHOT_RESTORE', 'PROJECT', `Restored snapshot ${snap.name}`, undefined, undefined); }
    },
    setCompareLeftProjectId: (id) => set({ compareLeftProjectId: id }),
    setCompareRightProjectId: (id) => set({ compareRightProjectId: id }),
    addGovernanceNote: async (message) => {
      const s = get(); if (!s.activeProjectId) return;
      const g = await db.governance.get(s.activeProjectId) || { projectId: s.activeProjectId, approvalState: 'draft', comments: [], lastUpdated: now() };
      const c: GovernanceComment = { id: `gc-${uuid8()}`, author: s.currentUser.name, role: s.currentUser.role, message, timestamp: now() };
      g.comments.push(c); g.lastUpdated = now(); await db.governance.put(g);
    },
    sendToReview: async (note) => {
      const s = get(); if (!s.activeProjectId) return;
      const g = await db.governance.get(s.activeProjectId) || { projectId: s.activeProjectId, approvalState: 'draft', comments: [], lastUpdated: now() };
      g.approvalState = 'review'; g.reviewedBy = s.currentUser.name; g.reviewedAt = now(); if (note) g.comments.push({ id: `gc-${uuid8()}`, author: s.currentUser.name, role: s.currentUser.role, message: note, action: 'review', timestamp: now() }); g.lastUpdated = now(); await db.governance.put(g); await log('GOVERNANCE_REVIEW', 'PROJECT', 'Sent to review', undefined, undefined);
    },
    approveProject: async (note) => {
      const s = get(); if (!s.activeProjectId) return;
      const g = await db.governance.get(s.activeProjectId) || { projectId: s.activeProjectId, approvalState: 'draft', comments: [], lastUpdated: now() };
      g.approvalState = 'approved'; g.approvedBy = s.currentUser.name; g.approvedAt = now(); if (note) g.comments.push({ id: `gc-${uuid8()}`, author: s.currentUser.name, role: s.currentUser.role, message: note, action: 'approve', timestamp: now() }); g.lastUpdated = now(); await db.governance.put(g); await log('GOVERNANCE_APPROVE', 'PROJECT', 'Project approved', undefined, undefined);
    },
    rejectProject: async (reason) => {
      const s = get(); if (!s.activeProjectId) return;
      const g = await db.governance.get(s.activeProjectId) || { projectId: s.activeProjectId, approvalState: 'draft', comments: [], lastUpdated: now() };
      g.approvalState = 'rejected'; g.rejectedBy = s.currentUser.name; g.rejectedAt = now(); g.rejectionReason = reason;
      g.comments.push({ id: `gc-${uuid8()}`, author: s.currentUser.name, role: s.currentUser.role, message: reason || 'Rejected', action: 'reject', reason: reason || undefined, timestamp: now() });
      g.lastUpdated = now(); await db.governance.put(g); await log('GOVERNANCE_REJECT', 'PROJECT', 'Project rejected', undefined, undefined);
    },
    setMaterialSystem: async (system) => {
      const s = get(); if (!s.cad) return;
      set({ materialSystem: system });
      await log('CAD_MATERIAL_DEFAULT_CHANGED', 'CAD', `Set default material to ${system}`);
    },
    setRebarSpec: async (spec) => {
      const s = get(); if (!s.cad) return;
      const next: CadDocument = { ...s.cad, rebarSpec: spec };
      await db.cadDocs.put(next);
      const bim = generateBimModel(next, s.activeProjectId || next.projectId);
      await db.bimModels.put(bim);
      const boq = generateBoqFromBim(bim, spec);
      await db.boqs.put(boq);
      await log('CAD_REBAR_SPEC_CHANGED', 'CAD', `Changed rebar spec to ${spec.barSize} @ ${spec.spacing} c/c, ${spec.layers} layer(s)`);
      set({ cad: next, bim, boq });
    },
    updateCadElementMaterial: async (elementId, material) => {
      const s = get(); if (!s.cad) return;
      const ifcMap: Record<string, { wall: string; beam: string; column: string; footing: string }> = {
        concrete: { wall: 'IfcWallStandardCase', beam: 'IfcBeam', column: 'IfcColumn', footing: 'IfcFooting' },
        steel: { wall: 'IfcWallStandardCase', beam: 'IfcBeam', column: 'IfcColumn', footing: 'IfcFooting' },
        timber: { wall: 'IfcWallStandardCase', beam: 'IfcBeam', column: 'IfcColumn', footing: 'IfcFooting' },
      };
      const next: CadDocument = {
        ...s.cad,
        walls: s.cad.walls.map(w => w.id === elementId ? { ...w, metadata: { ...w.metadata, category: w.metadata?.category || 'Wall', material, ifcClass: ifcMap[material].beam } } : w),
        blocks: s.cad.blocks.map(b => b.id === elementId ? { ...b, metadata: { ...b.metadata, category: b.metadata?.category || 'Structural', material, ifcClass: ifcMap[material].column } } : b),
      };
      await persistCadAndRegen(next, 'CAD_ELEMENT_MATERIAL_CHANGED', `Changed material of ${elementId} to ${material}`);
    },
    regenerateAll: async () => {
      const s = get(); if (!s.cad) return;
      const bim = generateBimModel(s.cad, s.activeProjectId || s.cad.projectId);
      await db.bimModels.put(bim); const boq = generateBoqFromBim(bim, s.cad?.rebarSpec); await db.boqs.put(boq);
      set({ bim, boq }); await log('BIM_REGENERATE', 'BIM', 'Regenerated BIM and BOQ', undefined, undefined);
    },
  };
});