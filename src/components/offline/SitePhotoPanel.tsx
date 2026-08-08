import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSitePhotoStore } from '@/stores/sitePhotoStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Camera, MapPin, Trash2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { captureHint, isPhotoFile, summarizePhotos, toDataUrl } from '@/engine/offline/sitePhotos';

export function SitePhotoPanel({ projectId }: { projectId: string }) {
  const { photos, isLoading, loadForProject, addPhoto, updatePhoto, removePhoto } = useSitePhotoStore(
    useShallow((s) => ({
      photos: s.photos,
      isLoading: s.isLoading,
      loadForProject: s.loadForProject,
      addPhoto: s.addPhoto,
      updatePhoto: s.updatePhoto,
      removePhoto: s.removePhoto,
    }))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');
  const [useGeo, setUseGeo] = useState(true);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectPhotos = useMemo(() => photos.filter((p) => p.projectId === projectId), [photos, projectId]);
  const stats = useMemo(() => summarizePhotos(projectPhotos), [projectPhotos]);

  useEffect(() => {
    loadForProject(projectId).catch(() => {});
  }, [projectId, loadForProject]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setProcessing(true);
    try {
      for (const file of Array.from(files)) {
        if (!isPhotoFile(file)) {
          setError('Only image files can be stored. Pick a JPG/PNG/WebP file.');
          continue;
        }
        const dataUrl = await toDataUrl(file);
        let geo: { lat: number; lng: number } | undefined;
        if (useGeo) {
          const parsedLat = parseFloat(lat);
          const parsedLng = parseFloat(lng);
          if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
            geo = { lat: parsedLat, lng: parsedLng };
          }
        }
        await addPhoto({ projectId, dataUrl, note: note.trim() || undefined, geo, source: 'capture' });
      }
      setNote('');
    } catch {
      setError('Could not save the photo offline. Storage may be full.');
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Capture and store site photos offline in IndexedDB.</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{captureHint()}</p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-[var(--text-secondary)]">{stats.total} photos</span>
          <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-[var(--text-secondary)]">{stats.geoTagged} geo-tagged</span>
          <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-[var(--text-secondary)]">{stats.withNotes} with notes</span>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="photo-note">Note</Label>
            <Input id="photo-note" placeholder="e.g. Foundation rebar — M1 progress" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="photo-lat">Latitude</Label>
              <Input id="photo-lat" placeholder="-17.8292" value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photo-lng">Longitude</Label>
              <Input id="photo-lng" placeholder="31.0522" value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setUseGeo((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              useGeo ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]' : 'border-[var(--border-default)] text-[var(--text-secondary)]'
            )}
          >
            <MapPin size={12} />
            Geo-tag this capture
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            data-testid="photo-input"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={processing}>
            {processing ? 'Saving...' : (
              <>
                <Camera size={16} className="mr-1" />
                Capture / upload photos
              </>
            )}
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading photos…</p>
      ) : projectPhotos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--border-default)] p-8 text-center">
          <ImageIcon size={28} className="text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-secondary)]">No site photos yet.</p>
          <p className="text-xs text-[var(--text-muted)]">Photos are stored locally and work fully offline.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projectPhotos.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)]">
              <div className="flex h-40 items-center justify-center overflow-hidden bg-[var(--bg-secondary)]">
                {p.dataUrl ? (
                  <img src={p.dataUrl} alt={p.note ?? 'Site photo'} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon size={24} className="text-[var(--text-muted)]" />
                )}
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">{p.note ?? 'No note'}</p>
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    className="shrink-0 rounded p-1 text-[var(--text-muted)] hover:text-red-400"
                    aria-label={`Delete ${p.note ?? 'photo'}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-muted)]">
                  <span>{new Date(p.capturedAt).toLocaleString()}</span>
                  {p.geo && (
                    <span className="flex items-center gap-0.5">
                      <MapPin size={10} />
                      {p.geo.lat.toFixed(4)}, {p.geo.lng.toFixed(4)}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <CheckCircle2 size={10} className="text-green-400" /> stored offline
                  </span>
                </div>
                {p.note && (
                  <Input
                    className="h-8 text-xs"
                    defaultValue={p.note}
                    placeholder="Edit note"
                    onBlur={(e) => {
                      if (e.target.value !== p.note) updatePhoto(p.id, { note: e.target.value.trim() || undefined });
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
