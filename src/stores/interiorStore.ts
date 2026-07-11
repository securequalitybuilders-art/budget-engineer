import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  InteriorProject,
  InteriorRoom,
  FixtureInstance,
  Point,
} from '@/domain/interior';
import { generateMaterialAssignments, DEFAULT_MATERIALS } from '@/lib/interior/finishSchedule';
import type { MaterialDef } from '@/domain/interior';

interface InteriorState {
  project: InteriorProject | null;
  materials: MaterialDef[];
  selectedRoomId: string | null;
  selectedFixtureId: string | null;
  isLoading: boolean;

  loadProject: (projectId: string) => void;
  unloadProject: () => void;

  addRoom: (room: InteriorRoom) => void;
  updateRoom: (roomId: string, partial: Partial<InteriorRoom>) => void;
  removeRoom: (roomId: string) => void;
  moveRoom: (roomId: string, position: Point) => void;

  addFixture: (fixture: FixtureInstance) => void;
  updateFixture: (instanceId: string, partial: Partial<FixtureInstance>) => void;
  removeFixture: (instanceId: string) => void;
  moveFixture: (instanceId: string, position: Point) => void;

  assignMaterial: (roomId: string, surface: 'wall' | 'floor' | 'ceiling', materialId: string) => void;
  regenerateAssignments: () => void;

  selectRoom: (roomId: string | null) => void;
  selectFixture: (instanceId: string | null) => void;
}

function createEmptyProject(projectId: string): InteriorProject {
  return {
    id: crypto.randomUUID(),
    projectId,
    rooms: [],
    fixtures: [],
    materialAssignments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const useInteriorStore = create<InteriorState>()(
  immer(
    persist(
      (set, get) => ({
        project: null,
        materials: DEFAULT_MATERIALS,
        selectedRoomId: null,
        selectedFixtureId: null,
        isLoading: false,

        loadProject: (projectId) =>
          set((s) => {
            s.isLoading = true;
            s.project = createEmptyProject(projectId);
            s.isLoading = false;
          }),

        unloadProject: () =>
          set((s) => {
            s.project = null;
            s.selectedRoomId = null;
            s.selectedFixtureId = null;
          }),

        addRoom: (room) =>
          set((s) => {
            if (!s.project) return;
            s.project.rooms.push(room);
            s.project.updatedAt = new Date().toISOString();
          }),

        updateRoom: (roomId, partial) =>
          set((s) => {
            if (!s.project) return;
            const idx = s.project.rooms.findIndex((r) => r.roomId === roomId);
            if (idx === -1) return;
            Object.assign(s.project.rooms[idx], partial);
            s.project.updatedAt = new Date().toISOString();
          }),

        removeRoom: (roomId) =>
          set((s) => {
            if (!s.project) return;
            s.project.rooms = s.project.rooms.filter((r) => r.roomId !== roomId);
            s.project.fixtures = s.project.fixtures.filter((f) => f.roomId !== roomId);
            s.project.materialAssignments = s.project.materialAssignments.filter(
              (a) => a.roomId !== roomId
            );
            if (s.selectedRoomId === roomId) s.selectedRoomId = null;
            s.project.updatedAt = new Date().toISOString();
          }),

        moveRoom: (roomId, position) =>
          set((s) => {
            if (!s.project) return;
            const room = s.project.rooms.find((r) => r.roomId === roomId);
            if (!room) return;
            room.position = position;
            s.project.updatedAt = new Date().toISOString();
          }),

        addFixture: (fixture) =>
          set((s) => {
            if (!s.project) return;
            s.project.fixtures.push(fixture);
            s.project.updatedAt = new Date().toISOString();
          }),

        updateFixture: (instanceId, partial) =>
          set((s) => {
            if (!s.project) return;
            const idx = s.project.fixtures.findIndex((f) => f.instanceId === instanceId);
            if (idx === -1) return;
            Object.assign(s.project.fixtures[idx], partial);
            s.project.updatedAt = new Date().toISOString();
          }),

        removeFixture: (instanceId) =>
          set((s) => {
            if (!s.project) return;
            s.project.fixtures = s.project.fixtures.filter((f) => f.instanceId !== instanceId);
            if (s.selectedFixtureId === instanceId) s.selectedFixtureId = null;
            s.project.updatedAt = new Date().toISOString();
          }),

        moveFixture: (instanceId, position) =>
          set((s) => {
            if (!s.project) return;
            const fixture = s.project.fixtures.find((f) => f.instanceId === instanceId);
            if (!fixture) return;
            fixture.position = position;
            s.project.updatedAt = new Date().toISOString();
          }),

        assignMaterial: (roomId, surface, materialId) =>
          set((s) => {
            if (!s.project) return;
            const room = s.project.rooms.find((r) => r.roomId === roomId);
            if (!room) return;
            if (surface === 'wall') room.finishSpec.wallMaterialId = materialId;
            if (surface === 'floor') room.finishSpec.floorMaterialId = materialId;
            if (surface === 'ceiling') room.finishSpec.ceilingMaterialId = materialId;
            s.project.updatedAt = new Date().toISOString();
          }),

        regenerateAssignments: () =>
          set((s) => {
            if (!s.project) return;
            s.project.materialAssignments = generateMaterialAssignments(
              s.project.rooms,
              get().materials
            );
            s.project.updatedAt = new Date().toISOString();
          }),

        selectRoom: (roomId) =>
          set((s) => {
            s.selectedRoomId = roomId;
            s.selectedFixtureId = null;
          }),

        selectFixture: (instanceId) =>
          set((s) => {
            s.selectedFixtureId = instanceId;
            s.selectedRoomId = null;
          }),
      }),
      {
        name: 'budget-engineer-interior',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          project: state.project,
          materials: state.materials,
        }),
      }
    )
  )
);
