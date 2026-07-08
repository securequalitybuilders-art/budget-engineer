import { create } from 'zustand';
import { db } from '../lib/db';
import { loadPersistedUserId, persistUserId } from '../lib/session';
import { canReview, canApprove } from '../lib/rbac';
import { getSeedCadDocument } from '../lib/cadSeed';
import { solveWallCorner } from '../lib/cadSolver';
import { detectBimClashes } from '../lib/clashChecker';
import { generateBimModel } from '../engine/bimGenerator';
import { generateBoqFromBim } from '../engine/boqGenerator';
import { parseIfcStep } from '../lib/ifc/ifcImport';
import { CadDocument, Vec2 } from '../domain/cad';
import { BimModel } from '../domain/bim';
import { BOQ } from '../domain/boq';
import { TransactionEvent } from '../domain/transaction';
import { ProjectSnapshot } from '../domain/versioning';
import { ProjectRecord } from '../domain/project';
import { GovernanceRecord, GovernanceComment } from '../domain/governance';
import { User } from '../domain/rbac';

export interface AppStoreState {
  projects: ProjectRecord[];
  activeProjectId: string;
  cadDoc: CadDocument;
  bimModel: BimModel;
  boq: BOQ;
  transactions: TransactionEvent[];
  snapshots: ProjectSnapshot[];
  governance: GovernanceRecord;
  users: User[];
  currentUser: User;
  activeFloorId: string;
  selectedElementId: string | null;
  selectedElementIds: string[];
  compareLeftProjectId: string;
  compareRightProjectId: string;
  show3d: boolean;
  snapToGrid: boolean;
  gridResolution: number;

  initialize: () => Promise<void>;
  switchProject: (projectId: string) => Promise<void>;
  createProject: (name: string, desc: string) => Promise<void>;
  archiveProject: (projectId: string) => Promise<void>;
  switchUser: (user: User) => void;
  setActiveFloor: (floorId: string) => void;
  setSelectedElement: (id: string | null) => void;
  setSelectedElements: (ids: string[]) => void;
  setCompareLeftProject: (id: string) => void;
  setCompareRightProject: (id: string) => void;
  setShow3d: (show: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;

  createSnapshot: (name: string) => Promise<void>;
  restoreSnapshot: (snapId: string) => Promise<void>;
  sendToReview: (note?: string) => void;
  approveProject: (note?: string) => void;
  rejectProject: (reason?: string) => void;
  addGovernanceNote: (message: string) => void;

  // CAD Edit actions (Stages 16-26)
  moveCadWall: (wallId: string, dx: number, dy: number) => void;
  moveCadBlock: (blockId: string, x: number, y: number) => void;
  moveCadWallEndpoint: (wallId: string, endpoint: 'start' | 'end', x: number, y: number) => void;
  addCadWall: (floorId: string, start: Vec2, end: Vec2) => void;
  deleteCadElement: (kind: 'wall' | 'block', id: string) => void;
  addCadOpening: (wallId: string, kind: 'door' | 'window', offset: number) => void;
  deleteCadOpening: (openingId: string) => void;
  updateCadWallProps: (wallId: string, props: { thickness?: number; structural?: boolean; name?: string }) => void;
  updateCadOpening: (openingId: string, props: { kind?: 'door' | 'window'; width?: number }) => void;
  importCadFromIfc: (ifcText: string) => { ok: boolean; message: string };
  moveCadOpening: (openingId: string, offset: number) => void;
  moveCadWalls: (wallIds: string[], dx: number, dy: number) => void;
  moveCadBlocks: (blockIds: string[], dx: number, dy: number) => void;
  deleteCadElements: (items: Array<{ kind: 'wall' | 'block' | 'opening'; id: string }>) => void;
  duplicateCadSelection: (bimIds: string[], dx?: number, dy?: number) => void;
  updateCadWallsProps: (wallIds: string[], props: { thickness?: number; structural?: boolean; height?: number; material?: string }) => void;
  trimExtendCadWalls: (wallAId: string, wallBId: string) => void;
  updateCadOpeningFamily: (openingId: string, params: Record<string, any>) => void;
  generateStructuralColumns: (floorId?: string) => void;
  calculateMepTakeoff: () => void;
  autoHealClashes: () => void;
}

export function persistCadAndRegen(
  set: any,
  get: any,
  nextCad: CadDocument,
  action: string,
  summary: string
) {
  const projectId = nextCad.projectId;
  const bimModel = generateBimModel(nextCad);
  const boq = generateBoqFromBim(bimModel, nextCad.name);
  const currentUser = get().currentUser;

  const newTx: TransactionEvent = {
    id: 'tx-' + Math.random().toString(36).substring(2, 9),
    projectId,
    timestamp: Date.now(),
    actor: currentUser,
    action,
    entityType: 'CAD',
    details: summary
  };

  set((state: any) => ({
    cadDoc: nextCad,
    bimModel,
    boq,
    transactions: [newTx, ...state.transactions]
  }));

  try {
    void db.cadDocs.put(nextCad);
    void db.bimModels.put(bimModel);
    void db.boqs.put(boq);
    void db.transactions.put(newTx);
  } catch {}
}

const seedUsers: User[] = [
  { id: 'user-1', name: 'Dzenhare Owner', role: 'owner' },
  { id: 'user-2', name: 'QS Reviewer', role: 'reviewer' },
  { id: 'user-3', name: 'Stakeholder Viewer', role: 'viewer' }
];

export const useAppStore = create<AppStoreState>((set, get) => ({
  projects: [],
  activeProjectId: 'project-demo-1',
  cadDoc: getSeedCadDocument('project-demo-1'),
  bimModel: generateBimModel(getSeedCadDocument('project-demo-1')),
  boq: generateBoqFromBim(generateBimModel(getSeedCadDocument('project-demo-1')), 'Standard Scheme'),
  transactions: [],
  snapshots: [],
  governance: {
    projectId: 'project-demo-1',
    approvalState: 'draft',
    versionLabel: 'v1.0.0',
    owner: 'Dzenhare Owner',
    reviewers: ['QS Reviewer'],
    comments: [],
    lastUpdated: Date.now()
  },
  users: seedUsers,
  currentUser: seedUsers[0],
  activeFloorId: 'floor-1',
  selectedElementId: null,
  selectedElementIds: [],
  compareLeftProjectId: 'project-demo-1',
  compareRightProjectId: 'project-demo-1',
  show3d: false,
  snapToGrid: true,
  gridResolution: 0.5,

  initialize: async () => {
    const persistedUserId = loadPersistedUserId();
    const currUser = seedUsers.find(u => u.id === persistedUserId) || seedUsers[0];
    
    let projs: ProjectRecord[] = [];
    try { projs = await db.projects.toArray(); } catch {}
    if (projs.length === 0) {
      const demoProj: ProjectRecord = {
        id: 'project-demo-1',
        name: 'Demo Budget Engineer Project',
        description: 'Enterprise computational design workflow scheme',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      try { await db.projects.put(demoProj); } catch {}
      projs = [demoProj];

      const cad = getSeedCadDocument('project-demo-1');
      const bim = generateBimModel(cad);
      const boq = generateBoqFromBim(bim, cad.name);
      try {
        await db.cadDocs.put(cad);
        await db.bimModels.put(bim);
        await db.boqs.put(boq);
      } catch {}

      const gov: GovernanceRecord = {
        projectId: 'project-demo-1',
        approvalState: 'draft',
        versionLabel: 'v1.0.0',
        owner: 'Dzenhare Owner',
        reviewers: ['QS Reviewer'],
        comments: [],
        lastUpdated: Date.now()
      };
      try { await db.governance.put(gov); } catch {}

      const initTx: TransactionEvent = {
        id: 'tx-init-1',
        projectId: 'project-demo-1',
        timestamp: Date.now(),
        actor: currUser,
        action: 'PROJECT_INITIALIZED',
        entityType: 'PROJECT',
        details: 'Initialized project memory and computational design OS'
      };
      try { await db.transactions.put(initTx); } catch {}
    }

    const activeId = projs[0].id;
    let cad = getSeedCadDocument(activeId);
    let bim = generateBimModel(cad);
    let boq = generateBoqFromBim(bim, cad.name);
    let txs: any[] = [];
    let snaps: any[] = [];
    let gov: any = {
      projectId: activeId,
      approvalState: 'draft',
      versionLabel: 'v1.0.0',
      owner: 'Dzenhare Owner',
      reviewers: ['QS Reviewer'],
      comments: [],
      lastUpdated: Date.now()
    };
    try {
      cad = await db.cadDocs.get(`cad-${activeId}`) || cad;
      bim = await db.bimModels.get(`bim-${activeId}`) || generateBimModel(cad);
      boq = await db.boqs.get(`boq-${activeId}`) || generateBoqFromBim(bim, cad.name);
      txs = await db.transactions.where('projectId').equals(activeId).reverse().sortBy('timestamp');
      snaps = await db.snapshots.where('projectId').equals(activeId).sortBy('timestamp');
      gov = await db.governance.get(activeId) || gov;
    } catch {}

    set({
      projects: projs,
      activeProjectId: activeId,
      cadDoc: cad,
      bimModel: bim,
      boq,
      transactions: txs,
      snapshots: snaps,
      governance: gov,
      currentUser: currUser,
      compareLeftProjectId: projs[0].id,
      compareRightProjectId: projs.length > 1 ? projs[1].id : projs[0].id
    });
  },

  switchProject: async (projectId: string) => {
    let cad = getSeedCadDocument(projectId);
    let bim = generateBimModel(cad);
    let boq = generateBoqFromBim(bim, cad.name);
    let txs: any[] = [];
    let snaps: any[] = [];
    let gov: any = {
      projectId,
      approvalState: 'draft',
      versionLabel: 'v1.0.0',
      owner: 'Dzenhare Owner',
      reviewers: ['QS Reviewer'],
      comments: [],
      lastUpdated: Date.now()
    };
    try {
      cad = await db.cadDocs.get(`cad-${projectId}`) || cad;
      bim = await db.bimModels.get(`bim-${projectId}`) || generateBimModel(cad);
      boq = await db.boqs.get(`boq-${projectId}`) || generateBoqFromBim(bim, cad.name);
      txs = await db.transactions.where('projectId').equals(projectId).reverse().sortBy('timestamp');
      snaps = await db.snapshots.where('projectId').equals(projectId).sortBy('timestamp');
      gov = await db.governance.get(projectId) || gov;
    } catch {}

    set({
      activeProjectId: projectId,
      cadDoc: cad,
      bimModel: bim,
      boq,
      transactions: txs,
      snapshots: snaps,
      governance: gov,
      selectedElementId: null,
      selectedElementIds: []
    });
  },

  createProject: async (name: string, desc: string) => {
    const id = 'project-' + Math.random().toString(36).substring(2, 8);
    const newProj: ProjectRecord = { id, name, description: desc, createdAt: Date.now(), updatedAt: Date.now() };
    try { await db.projects.put(newProj); } catch {}
    
    const cad = getSeedCadDocument(id);
    cad.name = name;
    const bim = generateBimModel(cad);
    const boq = generateBoqFromBim(bim, name);
    try {
      await db.cadDocs.put(cad);
      await db.bimModels.put(bim);
      await db.boqs.put(boq);
    } catch {}

    const gov: GovernanceRecord = {
      projectId: id,
      approvalState: 'draft',
      versionLabel: 'v1.0.0',
      owner: get().currentUser.name,
      reviewers: ['QS Reviewer'],
      comments: [],
      lastUpdated: Date.now()
    };
    try { await db.governance.put(gov); } catch {}

    const tx: TransactionEvent = {
      id: 'tx-' + Math.random().toString(36).substring(2, 9),
      projectId: id,
      timestamp: Date.now(),
      actor: get().currentUser,
      action: 'PROJECT_CREATED',
      entityType: 'PROJECT',
      details: `Created new project workspace: ${name}`
    };
    try { await db.transactions.put(tx); } catch {}

    let projs = [...get().projects, newProj];
    try { const p = await db.projects.toArray(); if (p.length > 0) projs = p; } catch {}
    set({ projects: projs });
    await get().switchProject(id);
  },

  archiveProject: async (projectId: string) => {
    const projs = get().projects.map(p => p.id === projectId ? { ...p, isArchived: true } : p);
    try { await db.projects.update(projectId, { isArchived: true }); } catch {}
    set({ projects: projs });
  },

  switchUser: (user: User) => {
    persistUserId(user.id);
    set({ currentUser: user });
  },

  setActiveFloor: (floorId: string) => set({ activeFloorId: floorId }),
  setSelectedElement: (id: string | null) => set({ selectedElementId: id, selectedElementIds: id ? [id] : [] }),
  setSelectedElements: (ids: string[]) => set({ selectedElementIds: ids, selectedElementId: ids.length > 0 ? ids[ids.length - 1] : null }),
  setCompareLeftProject: (id: string) => set({ compareLeftProjectId: id }),
  setCompareRightProject: (id: string) => set({ compareRightProjectId: id }),
  setShow3d: (show: boolean) => set({ show3d: show }),
  setSnapToGrid: (snap: boolean) => set({ snapToGrid: snap }),

  createSnapshot: async (name: string) => {
    const state = get();
    const id = 'snap-' + Math.random().toString(36).substring(2, 8);
    const snap: ProjectSnapshot = {
      id,
      projectId: state.activeProjectId,
      name,
      timestamp: Date.now(),
      cadDoc: JSON.parse(JSON.stringify(state.cadDoc)),
      bimModel: JSON.parse(JSON.stringify(state.bimModel)),
      boq: JSON.parse(JSON.stringify(state.boq))
    };
    try { await db.snapshots.put(snap); } catch {}
    
    const tx: TransactionEvent = {
      id: 'tx-' + Math.random().toString(36).substring(2, 9),
      projectId: state.activeProjectId,
      timestamp: Date.now(),
      actor: state.currentUser,
      action: 'SNAPSHOT_CREATED',
      entityType: 'EXPORT',
      details: `Created project snapshot version: ${name}`
    };
    try { await db.transactions.put(tx); } catch {}
    set({ snapshots: [...state.snapshots, snap], transactions: [tx, ...state.transactions] });
  },

  restoreSnapshot: async (snapId: string) => {
    const state = get();
    const snap = state.snapshots.find(s => s.id === snapId);
    if (!snap) return;

    const cad = JSON.parse(JSON.stringify(snap.cadDoc));
    const bim = JSON.parse(JSON.stringify(snap.bimModel));
    const boq = JSON.parse(JSON.stringify(snap.boq));

    try {
      await db.cadDocs.put(cad);
      await db.bimModels.put(bim);
      await db.boqs.put(boq);
    } catch {}

    const tx: TransactionEvent = {
      id: 'tx-' + Math.random().toString(36).substring(2, 9),
      projectId: state.activeProjectId,
      timestamp: Date.now(),
      actor: state.currentUser,
      action: 'SNAPSHOT_RESTORED',
      entityType: 'EXPORT',
      details: `Restored computational design OS to snapshot: ${snap.name}`
    };
    try { await db.transactions.put(tx); } catch {}
    set({ cadDoc: cad, bimModel: bim, boq, transactions: [tx, ...state.transactions] });
  },

  sendToReview: (note?: string) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const comment: GovernanceComment = {
      id: 'comm-' + Math.random().toString(36).substring(2, 8),
      author: state.currentUser.name,
      role: state.currentUser.role,
      message: note || 'Submitted scheme for QS review',
      timestamp: Date.now(),
      action: 'send_to_review'
    };
    const nextGov: GovernanceRecord = {
      ...state.governance,
      approvalState: 'in_review',
      comments: [...state.governance.comments, comment],
      lastUpdated: Date.now(),
      reviewedBy: state.currentUser.name,
      reviewedAt: Date.now()
    };
    try { void db.governance.put(nextGov); } catch {}
    set({ governance: nextGov });
  },

  approveProject: (note?: string) => {
    const state = get();
    if (!canApprove(state.currentUser)) return;
    const comment: GovernanceComment = {
      id: 'comm-' + Math.random().toString(36).substring(2, 8),
      author: state.currentUser.name,
      role: state.currentUser.role,
      message: note || 'Approved computational design BOQ for production delivery',
      timestamp: Date.now(),
      action: 'approve'
    };
    const nextGov: GovernanceRecord = {
      ...state.governance,
      approvalState: 'approved',
      comments: [...state.governance.comments, comment],
      lastUpdated: Date.now(),
      approvedBy: state.currentUser.name,
      approvedAt: Date.now()
    };
    try { void db.governance.put(nextGov); } catch {}
    set({ governance: nextGov });
  },

  rejectProject: (reason?: string) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const comment: GovernanceComment = {
      id: 'comm-' + Math.random().toString(36).substring(2, 8),
      author: state.currentUser.name,
      role: state.currentUser.role,
      message: reason || 'Scheme rejected due to budget constraints',
      timestamp: Date.now(),
      action: 'reject',
      reason
    };
    const nextGov: GovernanceRecord = {
      ...state.governance,
      approvalState: 'rejected',
      comments: [...state.governance.comments, comment],
      lastUpdated: Date.now(),
      rejectedBy: state.currentUser.name,
      rejectedAt: Date.now(),
      rejectionReason: reason
    };
    try { void db.governance.put(nextGov); } catch {}
    set({ governance: nextGov });
  },

  addGovernanceNote: (message: string) => {
    const state = get();
    const comment: GovernanceComment = {
      id: 'comm-' + Math.random().toString(36).substring(2, 8),
      author: state.currentUser.name,
      role: state.currentUser.role,
      message,
      timestamp: Date.now()
    };
    const nextGov: GovernanceRecord = {
      ...state.governance,
      comments: [...state.governance.comments, comment],
      lastUpdated: Date.now()
    };
    try { void db.governance.put(nextGov); } catch {}
    set({ governance: nextGov });
  },

  // CAD Edit actions
  moveCadWall: (wallId: string, dx: number, dy: number) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const nextWalls = state.cadDoc.walls.map(w => {
      if (w.id !== wallId) return w;
      return { ...w, start: { x: w.start.x + dx, y: w.start.y + dy }, end: { x: w.end.x + dx, y: w.end.y + dy } };
    });
    persistCadAndRegen(set, get, { ...state.cadDoc, walls: nextWalls }, 'CAD_WALL_MOVED', `Moved wall ${wallId}`);
  },

  moveCadBlock: (blockId: string, x: number, y: number) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const nextBlocks = state.cadDoc.blocks.map(b => b.id === blockId ? { ...b, position: { x, y } } : b);
    persistCadAndRegen(set, get, { ...state.cadDoc, blocks: nextBlocks }, 'CAD_BLOCK_MOVED', `Moved object ${blockId}`);
  },

  moveCadWallEndpoint: (wallId: string, endpoint: 'start' | 'end', x: number, y: number) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const nextWalls = state.cadDoc.walls.map(w => w.id === wallId ? { ...w, [endpoint]: { x, y } } : w);
    persistCadAndRegen(set, get, { ...state.cadDoc, walls: nextWalls }, 'CAD_WALL_RESHAPED', `Reshaped wall ${wallId}`);
  },

  addCadWall: (floorId: string, start: Vec2, end: Vec2) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const id = 'w-' + Math.random().toString(36).substring(2, 8);
    const newWall = {
      id,
      floorId,
      start,
      end,
      thickness: 0.2,
      height: 3.0,
      name: 'Custom Structural Wall',
      structural: true,
      metadata: { ifcClass: 'IfcWallStandardCase', category: 'Concrete', properties: { material: 'Concrete (IfcWallStandardCase)' } }
    };
    persistCadAndRegen(set, get, { ...state.cadDoc, walls: [...state.cadDoc.walls, newWall] }, 'CAD_WALL_ADDED', `Added new wall ${id}`);
  },

  deleteCadElement: (kind: 'wall' | 'block', id: string) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    if (kind === 'wall') {
      const nextWalls = state.cadDoc.walls.filter(w => w.id !== id);
      const nextOpenings = state.cadDoc.openings.filter(o => o.wallId !== id);
      persistCadAndRegen(set, get, { ...state.cadDoc, walls: nextWalls, openings: nextOpenings }, 'CAD_ELEMENT_DELETED', `Deleted wall ${id}`);
    } else {
      const nextBlocks = state.cadDoc.blocks.filter(b => b.id !== id);
      persistCadAndRegen(set, get, { ...state.cadDoc, blocks: nextBlocks }, 'CAD_ELEMENT_DELETED', `Deleted object ${id}`);
    }
  },

  addCadOpening: (wallId: string, kind: 'door' | 'window', offset: number) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const wall = state.cadDoc.walls.find(w => w.id === wallId);
    if (!wall) return;
    const id = 'o-' + Math.random().toString(36).substring(2, 8);
    const newOp = {
      id,
      wallId,
      floorId: wall.floorId,
      kind,
      offset,
      width: kind === 'door' ? 0.9 : 1.2,
      sillHeight: kind === 'window' ? 0.9 : undefined,
      headHeight: 2.1,
      name: kind === 'door' ? 'Architectural Door' : 'Glazed Window',
      metadata: { ifcClass: kind === 'door' ? 'IfcDoor' : 'IfcWindow', category: kind === 'door' ? 'Timber' : 'Aluminium', properties: {} }
    };
    persistCadAndRegen(set, get, { ...state.cadDoc, openings: [...state.cadDoc.openings, newOp] }, 'CAD_OPENING_ADDED', `Placed ${kind} on wall ${wallId}`);
  },

  deleteCadOpening: (openingId: string) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const nextOps = state.cadDoc.openings.filter(o => o.id !== openingId);
    persistCadAndRegen(set, get, { ...state.cadDoc, openings: nextOps }, 'CAD_OPENING_DELETED', `Removed opening ${openingId}`);
  },

  updateCadWallProps: (wallId: string, props: { thickness?: number; structural?: boolean; name?: string }) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const nextWalls = state.cadDoc.walls.map(w => w.id === wallId ? { ...w, ...props } : w);
    persistCadAndRegen(set, get, { ...state.cadDoc, walls: nextWalls }, 'CAD_WALL_PROPS_UPDATED', `Updated wall properties for ${wallId}`);
  },

  updateCadOpening: (openingId: string, props: { kind?: 'door' | 'window'; width?: number }) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const nextOps = state.cadDoc.openings.map(o => {
      if (o.id !== openingId) return o;
      const upd = { ...o, ...props };
      if (props.kind) upd.metadata.ifcClass = props.kind === 'door' ? 'IfcDoor' : 'IfcWindow';
      return upd;
    });
    persistCadAndRegen(set, get, { ...state.cadDoc, openings: nextOps }, 'CAD_OPENING_UPDATED', `Updated opening ${openingId}`);
  },

  importCadFromIfc: (ifcText: string) => {
    const state = get();
    if (!canReview(state.currentUser)) return { ok: false, message: 'Unauthorized' };
    try {
      const nextCad = parseIfcStep(ifcText, state.activeProjectId);
      persistCadAndRegen(set, get, nextCad, 'CAD_IFC_IMPORTED', 'Imported multi-storey IFC model');
      return { ok: true, message: 'Successfully imported IFC model' };
    } catch (err: any) {
      return { ok: false, message: err.message || 'Failed to parse IFC text' };
    }
  },

  moveCadOpening: (openingId: string, offset: number) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const nextOps = state.cadDoc.openings.map(o => o.id === openingId ? { ...o, offset } : o);
    persistCadAndRegen(set, get, { ...state.cadDoc, openings: nextOps }, 'CAD_OPENING_MOVED', `Dragged opening ${openingId}`);
  },

  moveCadWalls: (wallIds: string[], dx: number, dy: number) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const nextWalls = state.cadDoc.walls.map(w => {
      if (!wallIds.includes(w.id)) return w;
      return { ...w, start: { x: w.start.x + dx, y: w.start.y + dy }, end: { x: w.end.x + dx, y: w.end.y + dy } };
    });
    persistCadAndRegen(set, get, { ...state.cadDoc, walls: nextWalls }, 'CAD_WALLS_MOVED', `Group moved ${wallIds.length} walls`);
  },

  moveCadBlocks: (blockIds: string[], dx: number, dy: number) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const nextBlocks = state.cadDoc.blocks.map(b => blockIds.includes(b.id) ? { ...b, position: { x: b.position.x + dx, y: b.position.y + dy } } : b);
    persistCadAndRegen(set, get, { ...state.cadDoc, blocks: nextBlocks }, 'CAD_BLOCKS_MOVED', `Group moved ${blockIds.length} objects`);
  },

  deleteCadElements: (items: Array<{ kind: 'wall' | 'block' | 'opening'; id: string }>) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const wIds = items.filter(i => i.kind === 'wall').map(i => i.id);
    const bIds = items.filter(i => i.kind === 'block').map(i => i.id);
    const oIds = items.filter(i => i.kind === 'opening').map(i => i.id);
    const nextWalls = state.cadDoc.walls.filter(w => !wIds.includes(w.id));
    const nextBlocks = state.cadDoc.blocks.filter(b => !bIds.includes(b.id));
    const nextOps = state.cadDoc.openings.filter(o => !oIds.includes(o.id) && !wIds.includes(o.wallId));
    persistCadAndRegen(set, get, { ...state.cadDoc, walls: nextWalls, blocks: nextBlocks, openings: nextOps }, 'CAD_ELEMENTS_BATCH_DELETED', `Group deleted ${items.length} items`);
  },

  duplicateCadSelection: (bimIds: string[], dx = 1.0, dy = 1.0) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const cadIds = bimIds.map(id => id.replace(/^bim-/, ''));
    const newWalls: any[] = [];
    const newBlocks: any[] = [];
    const newOps: any[] = [];
    const wallIdMap: Record<string, string> = {};

    for (const w of state.cadDoc.walls) {
      if (!cadIds.includes(w.id)) continue;
      const nid = 'w-' + Math.random().toString(36).substring(2, 8);
      wallIdMap[w.id] = nid;
      newWalls.push({ ...w, id: nid, start: { x: w.start.x + dx, y: w.start.y + dy }, end: { x: w.end.x + dx, y: w.end.y + dy } });
    }

    for (const b of state.cadDoc.blocks) {
      if (!cadIds.includes(b.id)) continue;
      const nid = 'b-' + Math.random().toString(36).substring(2, 8);
      newBlocks.push({ ...b, id: nid, position: { x: b.position.x + dx, y: b.position.y + dy } });
    }

    for (const o of state.cadDoc.openings) {
      if (wallIdMap[o.wallId]) {
        newOps.push({ ...o, id: 'o-' + Math.random().toString(36).substring(2, 8), wallId: wallIdMap[o.wallId] });
      }
    }

    const nextCad = {
      ...state.cadDoc,
      walls: [...state.cadDoc.walls, ...newWalls],
      blocks: [...state.cadDoc.blocks, ...newBlocks],
      openings: [...state.cadDoc.openings, ...newOps]
    };
    const nextBimIds = [...newWalls.map(w => 'bim-'+w.id), ...newBlocks.map(b => 'bim-'+b.id)];
    set({ selectedElementIds: nextBimIds });
    persistCadAndRegen(set, get, nextCad, 'CAD_SELECTION_DUPLICATED', `Duplicated ${bimIds.length} items`);
  },

  updateCadWallsProps: (wallIds: string[], props: { thickness?: number; structural?: boolean; height?: number; material?: string }) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const cadIds = wallIds.map(id => id.replace(/^bim-/, ''));
    const nextWalls = state.cadDoc.walls.map(w => {
      if (!cadIds.includes(w.id)) return w;
      const upd = { ...w };
      if (props.thickness !== undefined) upd.thickness = props.thickness;
      if (props.structural !== undefined) upd.structural = props.structural;
      if (props.height !== undefined) upd.height = props.height;
      if (props.material !== undefined) {
        upd.metadata = {
          ...upd.metadata,
          category: props.material.split(' ')[0],
          properties: { ...upd.metadata.properties, material: props.material }
        };
      }
      return upd;
    });
    persistCadAndRegen(set, get, { ...state.cadDoc, walls: nextWalls }, 'CAD_WALLS_BATCH_UPDATED', `Stage 26: Group updated properties for ${cadIds.length} walls`);
  },

  trimExtendCadWalls: (wallAId: string, wallBId: string) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const cadAId = wallAId.replace(/^bim-/, '');
    const cadBId = wallBId.replace(/^bim-/, '');
    const wallA = state.cadDoc.walls.find(w => w.id === cadAId);
    const wallB = state.cadDoc.walls.find(w => w.id === cadBId);
    if (!wallA || !wallB) return;

    const res = solveWallCorner(wallA, wallB);
    if (!res) return;

    const nextWalls = state.cadDoc.walls.map(w => {
      if (w.id === cadAId) return res.nextA;
      if (w.id === cadBId) return res.nextB;
      return w;
    });

    set({ selectedElementIds: [], selectedElementId: null });
    persistCadAndRegen(
      set,
      get,
      { ...state.cadDoc, walls: nextWalls },
      'CAD_WALLS_TRIMMED_JOINED',
      `Stage 27: Trim/extend joined walls ${cadAId} and ${cadBId} at corner (${res.point.x}, ${res.point.y})`
    );
  },

  updateCadOpeningFamily: (openingId: string, params: Record<string, any>) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const cadId = openingId.replace(/^bim-/, '');
    const nextOps = state.cadDoc.openings.map(o => {
      if (o.id !== cadId) return o;
      return {
        ...o,
        metadata: {
          ...o.metadata,
          properties: { ...o.metadata.properties, ...params }
        }
      };
    });
    persistCadAndRegen(
      set,
      get,
      { ...state.cadDoc, openings: nextOps },
      'CAD_OPENING_FAMILY_UPDATED',
      `Stage 28: Customized parametric BIM family parameters for opening ${cadId}`
    );
  },

  generateStructuralColumns: (floorId?: string) => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const targetFloorId = floorId || state.activeFloorId;
    const sWalls = state.cadDoc.walls.filter(w => (floorId ? w.floorId === floorId : true) && w.structural);
    if (sWalls.length === 0) return;

    const pts = sWalls.flatMap(w => [w.start, w.end]);
    const uniquePts: Array<{ x: number; y: number }> = [];

    for (const pt of pts) {
      if (!uniquePts.some(u => Math.hypot(u.x - pt.x, u.y - pt.y) < 0.1)) {
        uniquePts.push(pt);
      }
    }

    const existingCols = state.cadDoc.blocks.filter(b => b.metadata?.ifcClass === 'IfcColumnStandardCase');
    const newCols: any[] = [];

    for (const pt of uniquePts) {
      if (existingCols.some(c => Math.hypot(c.position.x + c.width/2 - pt.x, c.position.y + c.depth/2 - pt.y) < 0.2)) {
        continue;
      }
      const id = 'col-' + Math.random().toString(36).substring(2, 8);
      newCols.push({
        id,
        floorId: targetFloorId,
        kind: 'column',
        position: { x: pt.x - 0.15, y: pt.y - 0.15 },
        width: 0.3,
        depth: 0.3,
        name: `Column C-${newCols.length + 1}`,
        metadata: {
          ifcClass: 'IfcColumnStandardCase',
          category: 'Structural',
          properties: { material: 'Reinforced Concrete 30MPa', loadCapacity: '1200kN' }
        }
      });
    }

    if (newCols.length === 0) return;

    const nextCad = {
      ...state.cadDoc,
      blocks: [...state.cadDoc.blocks, ...newCols]
    };
    persistCadAndRegen(
      set,
      get,
      nextCad,
      'CAD_STRUCTURAL_COLUMNS_GENERATED',
      `Stage 30: Auto-placed ${newCols.length} reinforced concrete structural columns at wall corner intersections`
    );
  },

  calculateMepTakeoff: () => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const nextCad = { ...state.cadDoc, mepEnabled: true };
    persistCadAndRegen(
      set,
      get,
      nextCad,
      'CAD_MEP_TAKEOFF_CALCULATED',
      'Stage 33: Auto-calculated MEP plumbing & electrical services points from spatial room schedules'
    );
  },

  autoHealClashes: () => {
    const state = get();
    if (!canReview(state.currentUser)) return;
    const report = detectBimClashes(state.cadDoc);
    if (report.clashes.length === 0) return;

    let nextOps = state.cadDoc.openings.map(o => ({ ...o }));
    let nextBlocks = state.cadDoc.blocks.map(b => ({ ...b }));

    for (const c of report.clashes) {
      if (c.actionCode === 'SHIFT_OPENING_SPAN') {
        const opId = c.id.replace('clash-strc-', '');
        nextOps = nextOps.map(o => o.id === opId ? { ...o, offset: Math.max(0.5, o.offset + 0.3) } : o);
      } else if (c.actionCode === 'RELOCATE_OBJECT') {
        const parts = c.id.split('-');
        const bId = parts[2];
        nextBlocks = nextBlocks.map(b => b.id === bId ? { ...b, position: { x: b.position.x + 1.0, y: b.position.y + 1.0 } } : b);
      }
    }

    const nextCad = { ...state.cadDoc, openings: nextOps, blocks: nextBlocks };
    persistCadAndRegen(
      set,
      get,
      nextCad,
      'BIM_CLASHES_RESOLVED',
      `Stage 34: Auto-healed ${report.clashes.length} geometric interferences and spatial BIM clashes`
    );
  }
}));
