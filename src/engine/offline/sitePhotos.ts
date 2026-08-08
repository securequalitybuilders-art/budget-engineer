export interface SitePhoto {
  id: string;
  projectId: string;
  milestoneId?: string;
  capturedAt: string;
  dataUrl: string;
  note?: string;
  geo?: { lat: number; lng: number };
  source: 'capture' | 'import';
}

export interface SitePhotoSummary {
  total: number;
  geoTagged: number;
  withNotes: number;
  byMilestone: Record<string, number>;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function photoId(projectId: string, capturedAt: string): string {
  return `${projectId}-${new Date(capturedAt).getTime()}`;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export function toDataUrl(file: File): Promise<string> {
  return fileToDataUrl(file);
}

export function isPhotoFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function attachGeo(photo: SitePhoto, lat: number | null, lng: number | null): SitePhoto {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return photo;
  return { ...photo, geo: { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 } };
}

export function summarizePhotos(photos: SitePhoto[]): SitePhotoSummary {
  const byMilestone: Record<string, number> = {};
  for (const p of photos) {
    if (p.milestoneId) byMilestone[p.milestoneId] = (byMilestone[p.milestoneId] ?? 0) + 1;
  }
  return {
    total: photos.length,
    geoTagged: photos.filter((p) => p.geo).length,
    withNotes: photos.filter((p) => p.note && p.note.trim().length > 0).length,
    byMilestone,
  };
}

export function milestoneLabel(milestoneId?: string, fallback = 'Unassigned'): string {
  return milestoneId && milestoneId.length > 0 ? milestoneId : fallback;
}

export function captureHint(): string {
  return 'Uses the device camera when available (input accept="image/*" capture="environment"). Photos are stored offline in IndexedDB.';
}
