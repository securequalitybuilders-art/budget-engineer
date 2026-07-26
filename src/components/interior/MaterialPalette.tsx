import { useState } from 'react';
import { useInteriorStore } from '@/stores/interiorStore';

interface MaterialPaletteProps {
  className?: string;
}

export function MaterialPalette({ className = '' }: MaterialPaletteProps) {
  const materials = useInteriorStore((s) => s.materials);
  const selectedRoomId = useInteriorStore((s) => s.selectedRoomId);
  const assignMaterial = useInteriorStore((s) => s.assignMaterial);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [surfaceTarget, setSurfaceTarget] = useState<'wall' | 'floor' | 'ceiling'>('wall');

  const filtered = categoryFilter === 'all'
    ? materials
    : materials.filter((m) => m.category === categoryFilter);

  const categories = Array.from(new Set(materials.map((m) => m.category)));

  const handleAssign = (materialId: string) => {
    if (!selectedRoomId) return;
    assignMaterial(selectedRoomId, surfaceTarget as 'wall' | 'floor' | 'ceiling', materialId);
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
        Materials
      </div>

      <div className="flex gap-1">
        {(['wall', 'floor', 'ceiling'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSurfaceTarget(s)}
            data-active={surfaceTarget === s}
            className="flex-1 rounded px-2 py-1 text-[11px] font-medium capitalize transition-colors
              data-[active=true]:bg-[var(--brand-primary)] data-[active=true]:text-white
              data-[active=false]:bg-[var(--bg-tertiary)] data-[active=false]:text-[var(--text-secondary)]"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          data-active={categoryFilter === 'all'}
          className="rounded px-2 py-0.5 text-[10px] transition-colors
            data-[active=true]:bg-[var(--brand-primary)] data-[active=true]:text-white
            data-[active=false]:bg-[var(--bg-tertiary)] data-[active=false]:text-[var(--text-secondary)]"
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            data-active={categoryFilter === cat}
            className="rounded px-2 py-0.5 text-[10px] transition-colors
              data-[active=true]:bg-[var(--brand-primary)] data-[active=true]:text-white
              data-[active=false]:bg-[var(--bg-tertiary)] data-[active=false]:text-[var(--text-secondary)]"
          >
            {cat}
          </button>
        ))}
      </div>

      {!selectedRoomId && (
        <div className="py-4 text-center text-xs text-[var(--text-tertiary)]">
          Select a room to assign materials
        </div>
      )}

      <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: 400 }}>
        {filtered.map((mat) => (
          <button
            key={mat.id}
            type="button"
            disabled={!selectedRoomId}
            onClick={() => handleAssign(mat.id)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors
              hover:bg-[var(--bg-hover)] disabled:opacity-40"
          >
            <span
              className="h-4 w-4 flex-shrink-0 rounded"
              style={{ backgroundColor: mat.color }}
            />
            <span className="flex-1 truncate text-[var(--text-primary)]">{mat.name}</span>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              ${(mat.rateCents / 100).toFixed(2)}/m²
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
