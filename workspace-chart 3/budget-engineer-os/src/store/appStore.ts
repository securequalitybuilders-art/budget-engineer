import { create } from 'zustand';
import type { CadDocument, CadWall, CadOpening } from '../domain/cad';
import type { BimModel, BimElement } from '../domain/bim';
import type { BOQ } from '../domain/boq';
import type { TransactionEvent } from '../domain/transaction';
import type { ProjectSnapshot } from '../domain/versioning';
import type { ProjectRecord } from '../domain/project';
import type { GovernanceRecord } from '../domain/governance';
import type { UserRecord } from '../domain/rbac';
import { createSeedCadDocument } from '../lib/cadSeed';
import { parseIfcStep } from '../lib/ifc/ifcImport';
import { generateBimModel } from '../engine/bimGenerator';
import { generateBoqFromBim } from '../engine/boqGenerator';
import { db } from '../lib/db';
import { diffProjectState, type SnapshotDiff } from '../lib/snapshotDiff';
import { buildPortfolioMetric, type PortfolioMetric } from '../lib/portfolioMetrics';
import { compareBoqLineItems, type BoqLineComparison } from '../lib/boqCompare';
import { filterSnapshotsByProject, filterTransactionsByProject } from '../lib/projectFilters';
import { getGovernance, setGovernanceState, addGovernanceComment } from '../lib/governanceDb';
import { canApprove, canComment, canReject, canReview } from '../lib/rbac';
import { loadPersistedUserId, persistUserId } from '../lib/session';

export type SnapshotComparisonState = {
  snapshotAId?: string;
  snapshotBId?: string;
  diff?: SnapshotDiff;
  highlightIds: string[];
  removedIds: string[];
  modifiedIds: string[];
  boqLineItems: BoqLineComparison[];
};

type AppState = {
  users: UserRecord[];
  currentUser: UserRecord;
  projects: ProjectRecord[];
  governance: GovernanceRecord;
  activeProjectId?: string;
  compareLeftProjectId?: string;
  compareRightProjectId?: string;
  cad: CadDocument;
  bim: BimModel;
  boq: BOQ;
  transactions: TransactionEvent[];
  snapshots: ProjectSnapshot[];
  portfolio: PortfolioMetric[];
  comparison: SnapshotComparisonState;
  activeFloorId: string | 'all';
  selectedElementId?: string;
  selectedElementIds: string[];
  ghostElements: BimElement[];
  initialized: boolean;
  initialize: () => Promise<void>;
  switchUser: (id: string) => void;
  setActiveFloor: (id: string | 'all') => void;
  setSelectedElement: (id?: string) => void;
  setSelectedElements: (ids: string[]) => void;
  setCompareLeftProject: (id: string) => void;
  setCompareRightProject: (id: string) => void;
  regenerateBim: () => Promise<void>;
  moveCadWall: (wallId: string, dx: number, dy: number) => Promise<void>;
  moveCadWalls: (wallIds: string[], dx: number, dy: number) => Promise<void>;
  moveCadBlock: (blockId: string, x: number, y: number) => Promise<void>;
  moveCadBlocks: (blockIds: string[], dx: number, dy: number) => Promise<void>;
  moveCadWallEndpoint: (wallId: string, end: 'start' | 'end', x: number, y: number) => Promise<void>;
  moveCadOpening: (openingId: string, offset: number) => Promise<void>;
  addCadWall: (floorId: string, start: { x: number; y: number }, end: { x: number; y: number }) => Promise<void>;
  deleteCadElement: (kind: 'wall' | 'block', id: string) => Promise<void>;
  deleteCadElements: (items: { kind: 'wall' | 'block'; id: string }[]) => Promise<void>;
  duplicateCadSelection: (bimIds: string[], dx?: number, dy?: number) => Promise<string[]>;
  addCadOpening: (wallId: string, kind: 'door' | 'window', offset: number) => Promise<void>;
  deleteCadOpening: (openingId: string) => Promise<void>;
  updateCadWallProps: (wallId: string, patch: { thickness?: number; structural?: boolean; name?: string }) => Promise<void>;
  updateCadOpening: (openingId: string, patch: { kind?: 'door' | 'window'; width?: number }) => Promise<void>;
  importCadFromIfc: (ifcText: string) => Promise<{ ok: boolean; message: string }>;
  logExport: (kind: 'IFC_JSON' | 'BOQ_CSV' | 'ZIP_PACKAGE') => Promise<void>;
  createSnapshot: () => Promise<void>;
  restoreSnapshot: (snapshotId: string) => Promise<void>;
  selectSnapshotA: (id: string) => Promise<void>;
  selectSnapshotB: (id: string) => Promise<void>;
  renameSelectedZone: (name: string) => Promise<void>;
  assignSelectedZoneProgram: (program: string) => Promise<void>;
  createProject: () => Promise<void>;
  openProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  sendToReview: (note?: string) => Promise<void>;
  approveProject: (note?: string) => Promise<void>;
  rejectProject: (reason?: string) => Promise<void>;
  addGovernanceNote: (message: string) => Promise<void>;
};

const seedUsers: UserRecord[] = [
  { id: 'user-1', name: 'Dzenhare Owner', role: 'owner' },
  { id: 'user-2', name: 'QS Reviewer', role: 'reviewer' },
  { id: 'user-3', name: 'Stakeholder Viewer', role: 'viewer' },
];
const seedProject: ProjectRecord = { id: 'project-demo-1', name: 'Demo Budget Engineer Project', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
const seedCad = createSeedCadDocument(seedProject.id);
const seedBim = generateBimModel(seedCad);
const seedBoq = generateBoqFromBim(seedBim);
const seedGovernance: GovernanceRecord = { projectId: seedProject.id, approvalState: 'draft', versionLabel: 'v0.1-enterprise', owner: 'Dzenhare Studio', reviewers: ['QS Lead', 'Architect Lead'], comments: [], lastUpdated: new Date().toISOString() };
const makeEvent = (partial: Omit<TransactionEvent, 'id' | 'timestamp'>): TransactionEvent => ({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...partial });
async function refreshCore() { const transactions = await db.transactions.orderBy('timestamp').reverse().toArray(); const snapshots = await db.snapshots.orderBy('timestamp').reverse().toArray(); const projects = await db.projects.toArray(); return { transactions, snapshots, projects }; }
async function buildPortfolio(snapshots: ProjectSnapshot[]): Promise<PortfolioMetric[]> { const metrics: PortfolioMetric[] = []; for (const snapshot of snapshots) { const [bim, boq] = await Promise.all([db.bimModels.get(snapshot.bimId), db.boqs.get(snapshot.boqId)]); if (bim && boq) metrics.push(buildPortfolioMetric(snapshot, boq, bim)); } return metrics; }
function updateZone(bim: BimModel, zoneId: string, mutate: (zone: Extract<BimElement, { type: 'roomZone' }>) => Extract<BimElement, { type: 'roomZone' }>): BimModel { return { ...bim, elements: bim.elements.map((e) => e.id === zoneId && e.type === 'roomZone' ? mutate(e) : e) }; }
async function computeComparison(snapshotAId: string | undefined, snapshotBId: string | undefined) { if (!snapshotAId || !snapshotBId) return { diff: undefined, highlightIds: [], removedIds: [], modifiedIds: [], ghostElements: [], boqLineItems: [] }; const a = await db.snapshots.get(snapshotAId); const b = await db.snapshots.get(snapshotBId); if (!a || !b) return { diff: undefined, highlightIds: [], removedIds: [], modifiedIds: [], ghostElements: [], boqLineItems: [] }; const [aBim, aBoq, bBim, bBoq] = await Promise.all([db.bimModels.get(a.bimId), db.boqs.get(a.boqId), db.bimModels.get(b.bimId), db.boqs.get(b.boqId)]); if (!aBim || !aBoq || !bBim || !bBoq) return { diff: undefined, highlightIds: [], removedIds: [], modifiedIds: [], ghostElements: [], boqLineItems: [] }; const diff = diffProjectState(aBim, aBoq, bBim, bBoq); const ghostElements = aBim.elements.filter((e) => diff.removedIds.includes(e.id)); const boqLineItems = compareBoqLineItems(aBoq, bBoq); return { diff, highlightIds: diff.addedIds, removedIds: diff.removedIds, modifiedIds: diff.modifiedIds, ghostElements, boqLineItems }; }

function round2(n: number): number { return Math.round(n * 100) / 100; }
function shortId(prefix: string): string { return `${prefix}-${crypto.randomUUID().slice(0, 8)}`; }

// Shared write path for direct 2D-plan CAD edits: persist the new CAD doc, then
// regenerate BIM + BOQ so quantities/cost stay in sync, log an audit transaction,
// and refresh derived state. This is what makes the CAD <-> BIM journey bidirectional.
async function persistCadAndRegen(
  set: (partial: Partial<AppState>) => void,
  get: () => AppState,
  nextCad: CadDocument,
  action: string,
  summary: string,
): Promise<void> {
  const bim = generateBimModel(nextCad);
  const boq = generateBoqFromBim(bim);
  await db.cadDocs.put(nextCad);
  await db.bimModels.put(bim);
  await db.boqs.put(boq);
  await db.transactions.put(makeEvent({ actor: 'USER', action, entityType: 'CAD', entityId: nextCad.id, summary, metadata: { projectId: nextCad.projectId } }));
  const core = await refreshCore();
  const projectId = get().activeProjectId;
  const snapshots = filterSnapshotsByProject(core.snapshots, projectId);
  const portfolio = await buildPortfolio(snapshots);
  set({ projects: core.projects, cad: nextCad, bim, boq, transactions: filterTransactionsByProject(core.transactions, projectId), snapshots, portfolio });
}

export const useAppStore = create<AppState>((set, get) => ({
  users: seedUsers, currentUser: seedUsers[0], projects: [], governance: seedGovernance, activeProjectId: seedProject.id, compareLeftProjectId: seedProject.id, compareRightProjectId: undefined, cad: seedCad, bim: seedBim, boq: seedBoq, transactions: [], snapshots: [], portfolio: [], comparison: { highlightIds: [], removedIds: [], modifiedIds: [], boqLineItems: [] }, activeFloorId: 'all', selectedElementId: undefined, selectedElementIds: [], ghostElements: [], initialized: false,
  initialize: async () => { const persistedUserId = loadPersistedUserId(); const persistedUser = persistedUserId ? get().users.find((u) => u.id === persistedUserId) : undefined; if (persistedUser) set({ currentUser: persistedUser }); const existingProject = await db.projects.get(seedProject.id); const existingCad = await db.cadDocs.get(seedCad.id); const existingBim = await db.bimModels.get(seedBim.id); const existingBoq = await db.boqs.get(seedBoq.id); const core = await refreshCore(); const scopedSnapshots = filterSnapshotsByProject(core.snapshots, seedProject.id); const portfolio = await buildPortfolio(scopedSnapshots); if (!existingProject || !existingCad || !existingBim || !existingBoq) { await db.projects.put(seedProject); await db.governance.put(seedGovernance); await db.cadDocs.put(seedCad); await db.bimModels.put(seedBim); await db.boqs.put(seedBoq); await db.transactions.put(makeEvent({ actor: 'SYSTEM', action: 'PROJECT_INITIALIZED', entityType: 'PROJECT', entityId: seedProject.id, summary: 'Seed project created in IndexedDB for Budget Engineer OS.', metadata: { projectId: seedProject.id } })); const refreshed = await refreshCore(); const filteredSnapshots = filterSnapshotsByProject(refreshed.snapshots, seedProject.id); const refreshedPortfolio = await buildPortfolio(filteredSnapshots); set({ projects: refreshed.projects, governance: seedGovernance, activeProjectId: seedProject.id, cad: seedCad, bim: seedBim, boq: seedBoq, transactions: filterTransactionsByProject(refreshed.transactions, seedProject.id), snapshots: filteredSnapshots, portfolio: refreshedPortfolio, initialized: true }); return; } const governance = await getGovernance(existingProject.id); set({ projects: core.projects, governance, activeProjectId: existingProject.id, cad: existingCad, bim: existingBim, boq: existingBoq, transactions: filterTransactionsByProject(core.transactions, existingProject.id), snapshots: filterSnapshotsByProject(core.snapshots, existingProject.id), portfolio, initialized: true }); },
  switchUser: (id) => { const user = get().users.find((u) => u.id === id); if (user) { persistUserId(user.id); set({ currentUser: user }); } },
  setActiveFloor: (id) => set({ activeFloorId: id }), setSelectedElement: (id) => set({ selectedElementId: id, selectedElementIds: id ? [id] : [] }), setSelectedElements: (ids) => set({ selectedElementId: ids[0], selectedElementIds: ids }), setCompareLeftProject: (id) => set({ compareLeftProjectId: id }), setCompareRightProject: (id) => set({ compareRightProjectId: id }),
  regenerateBim: async () => { const cad = get().cad; const bim = generateBimModel(cad); const boq = generateBoqFromBim(bim); await db.bimModels.put(bim); await db.boqs.put(boq); await db.transactions.put(makeEvent({ actor: 'USER', action: 'BIM_REGENERATED', entityType: 'BIM', entityId: bim.id, summary: 'Regenerated BIM model and synced BOQ from current CAD source.', metadata: { projectId: cad.projectId } })); const core = await refreshCore(); const projectId = get().activeProjectId; const snapshots = filterSnapshotsByProject(core.snapshots, projectId); const portfolio = await buildPortfolio(snapshots); set({ projects: core.projects, bim, boq, transactions: filterTransactionsByProject(core.transactions, projectId), snapshots, portfolio }); },
  moveCadWall: async (wallId, dx, dy) => { const prev = get().cad; const nextCad: CadDocument = { ...prev, walls: prev.walls.map((w) => w.id === wallId ? { ...w, start: { x: round2(w.start.x + dx), y: round2(w.start.y + dy) }, end: { x: round2(w.end.x + dx), y: round2(w.end.y + dy) } } : w) }; await persistCadAndRegen(set, get, nextCad, 'CAD_WALL_MOVED', `Moved wall ${wallId} by (${dx.toFixed(2)}, ${dy.toFixed(2)})m in 2D plan.`); },
  moveCadWalls: async (wallIds, dx, dy) => { if (wallIds.length === 0) return; const ids = new Set(wallIds); const prev = get().cad; const nextCad: CadDocument = { ...prev, walls: prev.walls.map((w) => ids.has(w.id) ? { ...w, start: { x: round2(w.start.x + dx), y: round2(w.start.y + dy) }, end: { x: round2(w.end.x + dx), y: round2(w.end.y + dy) } } : w) }; await persistCadAndRegen(set, get, nextCad, 'CAD_WALLS_MOVED', `Moved ${wallIds.length} wall(s) by (${dx.toFixed(2)}, ${dy.toFixed(2)})m in 2D plan.`); },
  moveCadBlock: async (blockId, x, y) => { const prev = get().cad; const nextCad: CadDocument = { ...prev, blocks: prev.blocks.map((b) => b.id === blockId ? { ...b, position: { x: round2(x), y: round2(y) } } : b) }; await persistCadAndRegen(set, get, nextCad, 'CAD_BLOCK_MOVED', `Repositioned object ${blockId} to (${x.toFixed(2)}, ${y.toFixed(2)})m in 2D plan.`); },
  moveCadBlocks: async (blockIds, dx, dy) => { if (blockIds.length === 0) return; const ids = new Set(blockIds); const prev = get().cad; const nextCad: CadDocument = { ...prev, blocks: prev.blocks.map((b) => ids.has(b.id) ? { ...b, position: { x: round2(b.position.x + dx), y: round2(b.position.y + dy) } } : b) }; await persistCadAndRegen(set, get, nextCad, 'CAD_BLOCKS_MOVED', `Moved ${blockIds.length} object(s) by (${dx.toFixed(2)}, ${dy.toFixed(2)})m in 2D plan.`); },
  moveCadWallEndpoint: async (wallId, end, x, y) => { const prev = get().cad; const nextCad: CadDocument = { ...prev, walls: prev.walls.map((w) => w.id === wallId ? { ...w, [end]: { x: round2(x), y: round2(y) } } : w) }; await persistCadAndRegen(set, get, nextCad, 'CAD_WALL_RESHAPED', `Reshaped wall ${wallId} ${end} endpoint to (${x.toFixed(2)}, ${y.toFixed(2)})m.`); },
  moveCadOpening: async (openingId, offset) => { const prev = get().cad; const opening = prev.openings.find((o) => o.id === openingId); const wall = opening ? prev.walls.find((w) => w.id === opening.wallId) : undefined; if (!opening || !wall) return; const wallLength = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y); const maxOffset = Math.max(0, wallLength); const nextOffset = Math.max(0, Math.min(round2(offset), maxOffset)); const nextCad: CadDocument = { ...prev, openings: prev.openings.map((o) => o.id === openingId ? { ...o, offset: nextOffset } : o) }; await persistCadAndRegen(set, get, nextCad, 'CAD_OPENING_MOVED', `Moved opening ${openingId} to ${nextOffset.toFixed(2)}m along wall ${wall.id}.`); },
  addCadWall: async (floorId, start, end) => { const prev = get().cad; const id = shortId('w'); const newWall: CadWall = { id, floorId, start: { x: round2(start.x), y: round2(start.y) }, end: { x: round2(end.x), y: round2(end.y) }, thickness: 0.2, height: 3, name: 'New Wall', metadata: { ifcClass: 'IfcWall', category: 'wall', properties: { structural: true } } }; const nextCad: CadDocument = { ...prev, walls: [...prev.walls, newWall] }; await persistCadAndRegen(set, get, nextCad, 'CAD_WALL_ADDED', `Added wall ${id} on ${floorId}.`); },
  deleteCadElement: async (kind, id) => { const prev = get().cad; let nextCad: CadDocument; if (kind === 'wall') { nextCad = { ...prev, walls: prev.walls.filter((w) => w.id !== id), openings: prev.openings.filter((o) => o.wallId !== id) }; } else { nextCad = { ...prev, blocks: prev.blocks.filter((b) => b.id !== id) }; } const selectedIds = get().selectedElementIds; const nextSelectedIds = selectedIds.filter((selId) => selId !== `bim-${id}`); set({ selectedElementId: nextSelectedIds[0], selectedElementIds: nextSelectedIds }); await persistCadAndRegen(set, get, nextCad, 'CAD_ELEMENT_DELETED', `Deleted ${kind} ${id} from 2D plan.`); },
  deleteCadElements: async (items) => { if (items.length === 0) return; const prev = get().cad; const wallIds = new Set(items.filter((item) => item.kind === 'wall').map((item) => item.id)); const blockIds = new Set(items.filter((item) => item.kind === 'block').map((item) => item.id)); const nextCad: CadDocument = { ...prev, walls: prev.walls.filter((w) => !wallIds.has(w.id)), openings: prev.openings.filter((o) => !wallIds.has(o.wallId)), blocks: prev.blocks.filter((b) => !blockIds.has(b.id)) }; const removedBimIds = new Set(items.map((item) => `bim-${item.id}`)); const nextSelectedIds = get().selectedElementIds.filter((id) => !removedBimIds.has(id)); set({ selectedElementId: nextSelectedIds[0], selectedElementIds: nextSelectedIds }); await persistCadAndRegen(set, get, nextCad, 'CAD_ELEMENTS_DELETED', `Deleted ${items.length} CAD element(s) from 2D plan.`); },
  duplicateCadSelection: async (bimIds, dx = 1, dy = 1) => { if (bimIds.length === 0) return []; const prev = get().cad; const rawIds = bimIds.map((id) => id.replace(/^bim-/, '')); const wallIdSet = new Set(prev.walls.filter((w) => rawIds.includes(w.id)).map((w) => w.id)); const blockIdSet = new Set(prev.blocks.filter((b) => rawIds.includes(b.id)).map((b) => b.id)); const openingIdSet = new Set(prev.openings.filter((o) => rawIds.includes(o.id)).map((o) => o.id)); const duplicatedWalls = prev.walls.filter((w) => wallIdSet.has(w.id)).map((w) => ({ ...w, id: shortId('w'), start: { x: round2(w.start.x + dx), y: round2(w.start.y + dy) }, end: { x: round2(w.end.x + dx), y: round2(w.end.y + dy) }, name: `${w.name} Copy` })); const wallIdMap = new Map(prev.walls.filter((w) => wallIdSet.has(w.id)).map((w, index) => [w.id, duplicatedWalls[index]?.id ?? w.id])); const duplicatedOpenings = prev.openings.filter((o) => openingIdSet.has(o.id) || wallIdSet.has(o.wallId)).flatMap((o) => { const mappedWallId = wallIdMap.get(o.wallId); if (!mappedWallId) return []; return [{ ...o, id: shortId('o'), wallId: mappedWallId, name: `${o.name} Copy` }]; }); const duplicatedBlocks = prev.blocks.filter((b) => blockIdSet.has(b.id)).map((b) => ({ ...b, id: shortId('b'), position: { x: round2(b.position.x + dx), y: round2(b.position.y + dy) }, name: `${b.name} Copy` })); const nextCad: CadDocument = { ...prev, walls: [...prev.walls, ...duplicatedWalls], openings: [...prev.openings, ...duplicatedOpenings], blocks: [...prev.blocks, ...duplicatedBlocks] }; const nextSelectedIds = [...duplicatedWalls.map((w) => `bim-${w.id}`), ...duplicatedOpenings.map((o) => `bim-${o.id}`), ...duplicatedBlocks.map((b) => `bim-${b.id}`)]; set({ selectedElementId: nextSelectedIds[0], selectedElementIds: nextSelectedIds }); await persistCadAndRegen(set, get, nextCad, 'CAD_SELECTION_DUPLICATED', `Duplicated ${bimIds.length} selected CAD item(s) with offset (${dx.toFixed(2)}, ${dy.toFixed(2)})m.`); return nextSelectedIds; },
  addCadOpening: async (wallId, kind, offset) => { const prev = get().cad; const wall = prev.walls.find((w) => w.id === wallId); if (!wall) return; const id = shortId('o'); const opening: CadOpening = { id, wallId, floorId: wall.floorId, kind, offset: round2(offset), width: kind === 'door' ? 0.9 : 1.2, sillHeight: kind === 'window' ? 0.9 : 0, headHeight: 2.1, name: kind === 'door' ? 'New Door' : 'New Window', metadata: { ifcClass: kind === 'door' ? 'IfcDoor' : 'IfcWindow', category: 'opening', properties: { fireRated: false } } }; const nextCad: CadDocument = { ...prev, openings: [...prev.openings, opening] }; await persistCadAndRegen(set, get, nextCad, 'CAD_OPENING_ADDED', `Added ${kind} ${id} on wall ${wallId}.`); },
  deleteCadOpening: async (openingId) => { const prev = get().cad; const nextCad: CadDocument = { ...prev, openings: prev.openings.filter((o) => o.id !== openingId) }; const nextSelectedIds = get().selectedElementIds.filter((id) => id !== `bim-${openingId}`); set({ selectedElementId: nextSelectedIds[0], selectedElementIds: nextSelectedIds }); await persistCadAndRegen(set, get, nextCad, 'CAD_OPENING_DELETED', `Deleted opening ${openingId} from 2D plan.`); },
  updateCadWallProps: async (wallId, patch) => { const prev = get().cad; const nextCad: CadDocument = { ...prev, walls: prev.walls.map((w) => w.id === wallId ? { ...w, thickness: patch.thickness !== undefined ? round2(patch.thickness) : w.thickness, name: patch.name ?? w.name, metadata: patch.structural !== undefined ? { ...w.metadata, properties: { ...w.metadata.properties, structural: patch.structural } } : w.metadata } : w) }; await persistCadAndRegen(set, get, nextCad, 'CAD_WALL_PROPS_UPDATED', `Updated wall ${wallId} properties.`); },
  updateCadOpening: async (openingId, patch) => { const prev = get().cad; const nextCad: CadDocument = { ...prev, openings: prev.openings.map((o) => o.id === openingId ? { ...o, kind: patch.kind ?? o.kind, width: patch.width !== undefined ? round2(patch.width) : o.width, name: patch.kind ? (patch.kind === 'door' ? 'Door' : 'Window') : o.name, metadata: patch.kind ? { ...o.metadata, ifcClass: patch.kind === 'door' ? 'IfcDoor' : 'IfcWindow' } : o.metadata } : o) }; await persistCadAndRegen(set, get, nextCad, 'CAD_OPENING_UPDATED', `Updated opening ${openingId}.`); },
  importCadFromIfc: async (ifcText) => { const prev = get().cad; const parsed = parseIfcStep(ifcText, prev.projectId); if (!parsed) return { ok: false, message: 'No importable Budget Engineer elements found in this IFC file.' }; const nextCad: CadDocument = { ...parsed, id: prev.id, projectId: prev.projectId }; set({ selectedElementId: undefined }); await persistCadAndRegen(set, get, nextCad, 'CAD_IFC_IMPORTED', `Imported IFC model: ${parsed.walls.length} walls, ${parsed.openings.length} openings, ${parsed.blocks.length} objects.`); return { ok: true, message: `Imported ${parsed.walls.length} walls, ${parsed.openings.length} openings, ${parsed.blocks.length} objects from IFC.` }; },
  logExport: async (kind) => { const entityId = kind === 'IFC_JSON' ? get().bim.id : get().boq.id; const projectId = get().activeProjectId; await db.transactions.put(makeEvent({ actor: 'USER', action: 'EXPORT_GENERATED', entityType: 'EXPORT', entityId, summary: `Generated ${kind} export from current project state.`, metadata: { kind, projectId: projectId ?? '' } })); const core = await refreshCore(); const snapshots = filterSnapshotsByProject(core.snapshots, projectId); const portfolio = await buildPortfolio(snapshots); set({ projects: core.projects, transactions: filterTransactionsByProject(core.transactions, projectId), snapshots, portfolio }); },
  createSnapshot: async () => { const { cad, bim, boq, activeProjectId } = get(); const stamp = Date.now(); const cadSnap = { ...cad, id: `${cad.id}-snap-${stamp}` }; const bimSnap = { ...bim, id: `${bim.id}-snap-${stamp}` }; const boqSnap = { ...boq, id: `${boq.id}-snap-${stamp}` }; await db.cadDocs.put(cadSnap); await db.bimModels.put(bimSnap); await db.boqs.put(boqSnap); const snapshot: ProjectSnapshot = { id: crypto.randomUUID(), projectId: activeProjectId ?? seedProject.id, name: `Snapshot ${new Date().toLocaleString()}`, timestamp: new Date().toISOString(), cadId: cadSnap.id, bimId: bimSnap.id, boqId: boqSnap.id, notes: 'Manual project snapshot from BIM workspace.' }; await db.snapshots.put(snapshot); await db.transactions.put(makeEvent({ actor: 'USER', action: 'SNAPSHOT_CREATED', entityType: 'PROJECT', entityId: snapshot.id, summary: 'Created a manual project snapshot for later restoration.', metadata: { projectId: snapshot.projectId } })); const core = await refreshCore(); const snapshots = filterSnapshotsByProject(core.snapshots, activeProjectId); const portfolio = await buildPortfolio(snapshots); set({ projects: core.projects, transactions: filterTransactionsByProject(core.transactions, activeProjectId), snapshots, portfolio }); },
  restoreSnapshot: async (snapshotId) => { const snapshot = await db.snapshots.get(snapshotId); if (!snapshot) return; const cad = await db.cadDocs.get(snapshot.cadId); const bim = await db.bimModels.get(snapshot.bimId); const boq = await db.boqs.get(snapshot.boqId); if (!cad || !bim || !boq) return; await db.cadDocs.put({ ...cad, id: `cad-${snapshot.projectId}`, projectId: snapshot.projectId }); await db.bimModels.put({ ...bim, id: `bim-${snapshot.projectId}`, projectId: snapshot.projectId }); await db.boqs.put({ ...boq, id: `boq-${snapshot.projectId}`, projectId: snapshot.projectId }); const governance = await getGovernance(snapshot.projectId); await db.transactions.put(makeEvent({ actor: 'USER', action: 'SNAPSHOT_RESTORED', entityType: 'PROJECT', entityId: snapshot.id, summary: `Restored project state from snapshot: ${snapshot.name}.`, metadata: { projectId: snapshot.projectId } })); const core = await refreshCore(); const snapshots = filterSnapshotsByProject(core.snapshots, snapshot.projectId); const portfolio = await buildPortfolio(snapshots); set({ projects: core.projects, governance, activeProjectId: snapshot.projectId, cad: { ...cad, id: `cad-${snapshot.projectId}`, projectId: snapshot.projectId }, bim: { ...bim, id: `bim-${snapshot.projectId}`, projectId: snapshot.projectId }, boq: { ...boq, id: `boq-${snapshot.projectId}`, projectId: snapshot.projectId }, transactions: filterTransactionsByProject(core.transactions, snapshot.projectId), snapshots, portfolio }); },
  selectSnapshotA: async (id) => { const current = get().comparison; const result = await computeComparison(id, current.snapshotBId); set({ comparison: { ...current, snapshotAId: id, diff: result.diff, highlightIds: result.highlightIds, removedIds: result.removedIds, modifiedIds: result.modifiedIds, boqLineItems: result.boqLineItems }, ghostElements: result.ghostElements }); },
  selectSnapshotB: async (id) => { const current = get().comparison; const result = await computeComparison(current.snapshotAId, id); set({ comparison: { ...current, snapshotBId: id, diff: result.diff, highlightIds: result.highlightIds, removedIds: result.removedIds, modifiedIds: result.modifiedIds, boqLineItems: result.boqLineItems }, ghostElements: result.ghostElements }); },
  renameSelectedZone: async (name) => { const selectedId = get().selectedElementId; if (!selectedId) return; const updatedBim = updateZone(get().bim, selectedId, (zone) => ({ ...zone, name })); await db.bimModels.put(updatedBim); const projectId = get().activeProjectId; await db.transactions.put(makeEvent({ actor: 'USER', action: 'ZONE_RENAMED', entityType: 'BIM', entityId: selectedId, summary: `Renamed room zone to ${name}.`, metadata: { projectId: projectId ?? '' } })); const core = await refreshCore(); const snapshots = filterSnapshotsByProject(core.snapshots, projectId); const portfolio = await buildPortfolio(snapshots); set({ projects: core.projects, bim: updatedBim, transactions: filterTransactionsByProject(core.transactions, projectId), snapshots, portfolio }); },
  assignSelectedZoneProgram: async (program) => { const selectedId = get().selectedElementId; if (!selectedId) return; const updatedBim = updateZone(get().bim, selectedId, (zone) => ({ ...zone, properties: { ...zone.properties, program } })); await db.bimModels.put(updatedBim); const projectId = get().activeProjectId; await db.transactions.put(makeEvent({ actor: 'USER', action: 'ZONE_PROGRAM_ASSIGNED', entityType: 'BIM', entityId: selectedId, summary: `Assigned room zone program: ${program}.`, metadata: { projectId: projectId ?? '' } })); const core = await refreshCore(); const snapshots = filterSnapshotsByProject(core.snapshots, projectId); const portfolio = await buildPortfolio(snapshots); set({ projects: core.projects, bim: updatedBim, transactions: filterTransactionsByProject(core.transactions, projectId), snapshots, portfolio }); },
  createProject: async () => { const now = new Date().toISOString(); const project: ProjectRecord = { id: crypto.randomUUID(), name: `Project ${new Date().toLocaleTimeString()}`, status: 'active', createdAt: now, updatedAt: now }; const cad = createSeedCadDocument(project.id); const bim = generateBimModel(cad); const boq = generateBoqFromBim(bim); const governance = { projectId: project.id, approvalState: 'draft', versionLabel: 'v0.1-enterprise', owner: 'Dzenhare Studio', reviewers: ['QS Lead', 'Architect Lead'], comments: [], lastUpdated: now } as GovernanceRecord; await db.projects.put(project); await db.governance.put(governance); await db.cadDocs.put(cad); await db.bimModels.put(bim); await db.boqs.put(boq); await db.transactions.put(makeEvent({ actor: 'USER', action: 'PROJECT_CREATED', entityType: 'PROJECT', entityId: project.id, summary: `Created project: ${project.name}.`, metadata: { projectId: project.id } })); const core = await refreshCore(); set({ projects: core.projects, governance, activeProjectId: project.id, cad, bim, boq, transactions: filterTransactionsByProject(core.transactions, project.id), snapshots: filterSnapshotsByProject(core.snapshots, project.id), portfolio: [] }); },
  openProject: async (id) => { const cad = await db.cadDocs.get(`cad-${id}`); const bim = await db.bimModels.get(`bim-${id}`); const boq = await db.boqs.get(`boq-${id}`); const governance = await getGovernance(id); await db.transactions.put(makeEvent({ actor: 'USER', action: 'PROJECT_OPENED', entityType: 'PROJECT', entityId: id, summary: `Opened project ${id}.`, metadata: { projectId: id } })); const core = await refreshCore(); const snapshots = filterSnapshotsByProject(core.snapshots, id); const portfolio = await buildPortfolio(snapshots); set({ projects: core.projects, governance, activeProjectId: id, cad: cad ?? get().cad, bim: bim ?? get().bim, boq: boq ?? get().boq, transactions: filterTransactionsByProject(core.transactions, id), snapshots, portfolio }); },
  archiveProject: async (id) => { const project = await db.projects.get(id); if (!project) return; await db.projects.put({ ...project, status: 'archived', updatedAt: new Date().toISOString() }); await db.transactions.put(makeEvent({ actor: 'USER', action: 'PROJECT_ARCHIVED', entityType: 'PROJECT', entityId: id, summary: `Archived project: ${project.name}.`, metadata: { projectId: id } })); const core = await refreshCore(); const projectId = get().activeProjectId; const snapshots = filterSnapshotsByProject(core.snapshots, projectId); const portfolio = await buildPortfolio(snapshots); set({ projects: core.projects, transactions: filterTransactionsByProject(core.transactions, projectId), snapshots, portfolio }); },
  sendToReview: async (note) => { const projectId = get().activeProjectId ?? seedProject.id; const user = get().currentUser; if (!canReview(user)) return; const governance = await setGovernanceState(projectId, 'in_review', user, 'Sent to review', note); if (note) await addGovernanceComment(projectId, user, note, 'Review note'); await db.transactions.put(makeEvent({ actor: 'USER', action: 'PROJECT_SENT_TO_REVIEW', entityType: 'PROJECT', entityId: projectId, summary: 'Project moved to review state.', metadata: { projectId } })); const core = await refreshCore(); set({ governance, transactions: filterTransactionsByProject(core.transactions, projectId) }); },
  approveProject: async (note) => { const projectId = get().activeProjectId ?? seedProject.id; const user = get().currentUser; if (!canApprove(user)) return; const governance = await setGovernanceState(projectId, 'approved', user, 'Approved', note); if (note) await addGovernanceComment(projectId, user, note, 'Approval note'); await db.transactions.put(makeEvent({ actor: 'USER', action: 'PROJECT_APPROVED', entityType: 'PROJECT', entityId: projectId, summary: 'Project approved.', metadata: { projectId } })); const core = await refreshCore(); set({ governance, transactions: filterTransactionsByProject(core.transactions, projectId) }); },
  rejectProject: async (reason) => { const projectId = get().activeProjectId ?? seedProject.id; const user = get().currentUser; if (!canReject(user)) return; const governance = await setGovernanceState(projectId, 'rejected', user, 'Rejected', reason); if (reason) await addGovernanceComment(projectId, user, reason, 'Rejection reason', reason); await db.transactions.put(makeEvent({ actor: 'USER', action: 'PROJECT_REJECTED', entityType: 'PROJECT', entityId: projectId, summary: `Project rejected.${reason ? ` Reason: ${reason}` : ''}`, metadata: { projectId } })); const core = await refreshCore(); set({ governance, transactions: filterTransactionsByProject(core.transactions, projectId) }); },
  addGovernanceNote: async (message) => { const projectId = get().activeProjectId ?? seedProject.id; const user = get().currentUser; if (!canComment(user)) return; const governance = await addGovernanceComment(projectId, user, message, 'Comment'); await db.transactions.put(makeEvent({ actor: 'USER', action: 'GOVERNANCE_COMMENT_ADDED', entityType: 'PROJECT', entityId: projectId, summary: 'Added governance comment.', metadata: { projectId } })); const core = await refreshCore(); set({ governance, transactions: filterTransactionsByProject(core.transactions, projectId) }); },
}));
