// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@/db/db';
import {
  nowIso,
  photoId,
  fileToDataUrl,
  toDataUrl,
  isPhotoFile,
  attachGeo,
  summarizePhotos,
  milestoneLabel,
  captureHint,
  type SitePhoto,
} from '@/engine/offline/sitePhotos';
import { useSitePhotoStore } from '@/stores/sitePhotoStore';

function makePhoto(overrides: Partial<SitePhoto> = {}): SitePhoto {
  return {
    id: 'p1',
    projectId: 'proj-1',
    capturedAt: '2026-08-08T10:00:00.000Z',
    dataUrl: 'data:image/jpeg;base64,AAAA',
    source: 'capture',
    ...overrides,
  };
}

beforeEach(async () => {
  await db.sitePhotos.clear();
  useSitePhotoStore.setState({ photos: [], currentProjectId: null, isLoading: false });
});

describe('sitePhotos engine — pure helpers', () => {
  it('nowIso returns an ISO timestamp', () => {
    expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('photoId prefixes the project id with a millisecond timestamp', () => {
    const id = photoId('proj-9', '2026-08-08T10:00:00.000Z');
    expect(id).toBe(`proj-9-${new Date('2026-08-08T10:00:00.000Z').getTime()}`);
    expect(id.startsWith('proj-9-')).toBe(true);
  });

  it('isPhotoFile accepts image mime types and rejects others', () => {
    expect(isPhotoFile({ type: 'image/jpeg' } as File)).toBe(true);
    expect(isPhotoFile({ type: 'image/png' } as File)).toBe(true);
    expect(isPhotoFile({ type: 'image/webp' } as File)).toBe(true);
    expect(isPhotoFile({ type: 'application/pdf' } as File)).toBe(false);
    expect(isPhotoFile({ type: 'text/plain' } as File)).toBe(false);
  });

  it('attachGeo clamps coordinates to 6 decimals', () => {
    const photo = makePhoto();
    const tagged = attachGeo(photo, -17.82923456, 31.05229876);
    expect(tagged.geo).toEqual({ lat: -17.829235, lng: 31.052299 });
  });

  it('attachGeo returns the photo untouched for non-finite inputs', () => {
    const photo = makePhoto();
    expect(attachGeo(photo, null, null)).toBe(photo);
    expect(attachGeo(photo, NaN, 31)).toBe(photo);
    expect(attachGeo(photo, -17, Infinity)).toBe(photo);
  });

  it('summarizePhotos counts total, geo-tagged, noted, and per-milestone', () => {
    const photos = [
      makePhoto({ id: 'a', milestoneId: 'm1', geo: { lat: 1, lng: 2 }, note: 'slab' }),
      makePhoto({ id: 'b', milestoneId: 'm1', geo: { lat: 1, lng: 2 } }),
      makePhoto({ id: 'c', milestoneId: 'm2', note: '  ' }),
    ];
    const summary = summarizePhotos(photos);
    expect(summary.total).toBe(3);
    expect(summary.geoTagged).toBe(2);
    expect(summary.withNotes).toBe(1);
    expect(summary.byMilestone).toEqual({ m1: 2, m2: 1 });
  });

  it('milestoneLabel falls back for empty ids', () => {
    expect(milestoneLabel('M1')).toBe('M1');
    expect(milestoneLabel(undefined)).toBe('Unassigned');
    expect(milestoneLabel('', 'None')).toBe('None');
  });

  it('captureHint mentions the camera and offline storage', () => {
    const hint = captureHint();
    expect(hint).toContain('camera');
    expect(hint.toLowerCase()).toContain('offline');
  });

  it('fileToDataUrl reads a file through FileReader', async () => {
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });
    const url = await fileToDataUrl(file);
    expect(url).toContain('data:image/jpeg');
  });

  it('toDataUrl is an alias for fileToDataUrl', async () => {
    const file = new File(['x'], 'p.png', { type: 'image/png' });
    expect(await toDataUrl(file)).toContain('data:image/png');
  });
});

describe('sitePhotos — Dexie store', () => {
  it('addPhoto persists and prepends to the store', async () => {
    const photo = await useSitePhotoStore.getState().addPhoto({
      projectId: 'proj-1',
      dataUrl: 'data:image/jpeg;base64,AAAA',
      note: 'foundation',
    });
    expect(photo.id.startsWith('proj-1-')).toBe(true);
    expect(await db.sitePhotos.count()).toBe(1);
    expect(useSitePhotoStore.getState().photos[0].id).toBe(photo.id);
  });

  it('loadForProject loads only that project newest-first', async () => {
    await useSitePhotoStore.getState().addPhoto({ projectId: 'proj-1', dataUrl: 'd:1', capturedAt: '2026-08-01T00:00:00.000Z' });
    await useSitePhotoStore.getState().addPhoto({ projectId: 'proj-1', dataUrl: 'd:2', capturedAt: '2026-08-02T00:00:00.000Z' });
    await useSitePhotoStore.getState().addPhoto({ projectId: 'proj-2', dataUrl: 'd:3' });
    await useSitePhotoStore.getState().loadForProject('proj-1');
    const ids = useSitePhotoStore.getState().photos.map((p) => p.id);
    expect(ids).toHaveLength(2);
    expect(new Date(useSitePhotoStore.getState().photos[0].capturedAt).getTime())
      .toBeGreaterThan(new Date(useSitePhotoStore.getState().photos[1].capturedAt).getTime());
  });

  it('updatePhoto patches note and geo fields', async () => {
    const photo = await useSitePhotoStore.getState().addPhoto({ projectId: 'proj-1', dataUrl: 'd:1' });
    await useSitePhotoStore.getState().updatePhoto(photo.id, { note: 'rebar check', geo: { lat: -17.8, lng: 31.05 } });
    const fromDb = await db.sitePhotos.get(photo.id);
    expect(fromDb?.note).toBe('rebar check');
    expect(fromDb?.geo).toEqual({ lat: -17.8, lng: 31.05 });
    expect(useSitePhotoStore.getState().photos[0].note).toBe('rebar check');
  });

  it('removePhoto deletes from Dexie and state', async () => {
    const photo = await useSitePhotoStore.getState().addPhoto({ projectId: 'proj-1', dataUrl: 'd:1' });
    await useSitePhotoStore.getState().removePhoto(photo.id);
    expect(await db.sitePhotos.count()).toBe(0);
    expect(useSitePhotoStore.getState().photos).toHaveLength(0);
  });

  it('summary scopes to the requested project only', async () => {
    await useSitePhotoStore.getState().addPhoto({ projectId: 'proj-1', dataUrl: 'd:1', geo: { lat: 1, lng: 2 } });
    await useSitePhotoStore.getState().addPhoto({ projectId: 'proj-2', dataUrl: 'd:2' });
    await useSitePhotoStore.getState().addPhoto({ projectId: 'proj-1', dataUrl: 'd:3' });
    const summary = useSitePhotoStore.getState().summary('proj-1');
    expect(summary.total).toBe(2);
    expect(summary.geoTagged).toBe(1);
  });

  it('clearForProject wipes only that project', async () => {
    await useSitePhotoStore.getState().addPhoto({ projectId: 'proj-1', dataUrl: 'd:1' });
    await useSitePhotoStore.getState().addPhoto({ projectId: 'proj-2', dataUrl: 'd:2' });
    await useSitePhotoStore.getState().clearForProject('proj-1');
    expect(await db.sitePhotos.count()).toBe(1);
    expect(useSitePhotoStore.getState().photos).toHaveLength(1);
    expect(useSitePhotoStore.getState().photos[0].projectId).toBe('proj-2');
  });
});
