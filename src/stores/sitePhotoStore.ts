import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { db } from '@/db/db';
import { summarizePhotos, type SitePhoto, type SitePhotoSummary } from '@/engine/offline/sitePhotos';

interface SitePhotoState {
  photos: SitePhoto[];
  currentProjectId: string | null;
  isLoading: boolean;
  loadForProject: (projectId: string) => Promise<void>;
  addPhoto: (photo: Omit<SitePhoto, 'id' | 'capturedAt' | 'source'> & { id?: string; capturedAt?: string; source?: SitePhoto['source'] }) => Promise<SitePhoto>;
  updatePhoto: (id: string, patch: Partial<Pick<SitePhoto, 'note' | 'milestoneId' | 'geo'>>) => Promise<void>;
  removePhoto: (id: string) => Promise<void>;
  summary: (projectId: string) => SitePhotoSummary;
  clearForProject: (projectId: string) => Promise<void>;
}

export const useSitePhotoStore = create<SitePhotoState>()(
  immer((set, get) => ({
    photos: [],
    currentProjectId: null,
    isLoading: false,

    loadForProject: async (projectId) => {
      set((s) => {
        s.isLoading = true;
        s.currentProjectId = projectId;
      });
      const photos = await db.sitePhotos.where('projectId').equals(projectId).toArray();
      photos.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
      set((s) => {
        s.photos = photos;
        s.isLoading = false;
      });
    },

    addPhoto: async (input) => {
      const capturedAt = input.capturedAt ?? new Date().toISOString();
      const photo: SitePhoto = {
        id: input.id ?? `${input.projectId}-${new Date(capturedAt).getTime()}`,
        projectId: input.projectId,
        milestoneId: input.milestoneId,
        capturedAt,
        dataUrl: input.dataUrl,
        note: input.note,
        geo: input.geo,
        source: input.source ?? 'capture',
      };
      await db.sitePhotos.put(photo);
      set((s) => {
        s.photos = [photo, ...s.photos];
      });
      return photo;
    },

    updatePhoto: async (id, patch) => {
      await db.sitePhotos.update(id, patch);
      set((s) => {
        const idx = s.photos.findIndex((p) => p.id === id);
        if (idx >= 0) {
          s.photos[idx] = { ...s.photos[idx], ...patch };
        }
      });
    },

    removePhoto: async (id) => {
      await db.sitePhotos.delete(id);
      set((s) => {
        s.photos = s.photos.filter((p) => p.id !== id);
      });
    },

    summary: (projectId) => {
      return summarizePhotos(get().photos.filter((p) => p.projectId === projectId));
    },

    clearForProject: async (projectId) => {
      await db.sitePhotos.where('projectId').equals(projectId).delete();
      set((s) => {
        s.photos = s.photos.filter((p) => p.projectId !== projectId);
      });
    },
  }))
);
