import { useCallback } from 'react';
import {
  Building2,
  Triangle,
  Fan,
  Zap,
  Droplets,
  Sofa,
  TreePine,
  Mountain,
  Square,
  type LucideIcon,
} from 'lucide-react';
import { DISCIPLINES, getDiscipline, type DisciplineId } from '@/lib/studio/discipline';
import { useDisciplineStore } from '@/stores/disciplineStore';

const ICON_MAP: Record<string, LucideIcon> = {
  Building2,
  Triangle,
  Fan,
  Zap,
  Droplets,
  Sofa,
  TreePine,
  Mountain,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Square;
}

interface DisciplineButtonProps {
  id: DisciplineId;
  active: boolean;
  visible: boolean;
  onSelect: (id: DisciplineId) => void;
  onToggleVisibility: (id: DisciplineId) => void;
}

function DisciplineButton({ id, active, visible, onSelect, onToggleVisibility }: DisciplineButtonProps) {
  const d = getDiscipline(id);
  const Icon = resolveIcon(d.icon);

  return (
    <button
      type="button"
      data-active={active}
      data-visible={visible}
      onClick={() => onSelect(id)}
      onContextMenu={(e) => {
        e.preventDefault();
        onToggleVisibility(id);
      }}
      className="group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors
        data-[active=true]:bg-[var(--brand-primary)]/10 data-[active=true]:text-[var(--brand-primary)]
        data-[active=false]:text-[var(--text-secondary)] hover:data-[active=false]:bg-[var(--bg-hover)]
        data-[visible=false]:opacity-40"
      title={`${d.label} — ${d.description}${visible ? '' : ' (hidden)'}`}
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded"
        style={{ backgroundColor: `${d.color}1A`, color: d.color }}
      >
        <Icon size={14} />
      </span>
      <span className="flex-1 truncate">{d.shortLabel}</span>
      {!visible && (
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">off</span>
      )}
    </button>
  );
}

interface DisciplineSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function DisciplineSwitcher({ className = '', compact = false }: DisciplineSwitcherProps) {
  const currentDiscipline = useDisciplineStore((s) => s.currentDiscipline);
  const visibleDisciplines = useDisciplineStore((s) => s.visibleDisciplines);
  const setCurrentDiscipline = useDisciplineStore((s) => s.setCurrentDiscipline);
  const toggleDisciplineVisibility = useDisciplineStore((s) => s.toggleDisciplineVisibility);

  const handleSelect = useCallback(
    (id: DisciplineId) => {
      setCurrentDiscipline(id);
    },
    [setCurrentDiscipline]
  );

  if (compact) {
    const d = getDiscipline(currentDiscipline);
    const Icon = resolveIcon(d.icon);
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="flex h-6 w-6 items-center justify-center rounded" style={{ backgroundColor: `${d.color}1A`, color: d.color }}>
          <Icon size={14} />
        </span>
        <select
          value={currentDiscipline}
          onChange={(e) => handleSelect(e.target.value as DisciplineId)}
          className="cursor-pointer bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none"
        >
          {DISCIPLINES.map((disc) => (
            <option key={disc.id} value={disc.id}>
              {disc.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-0.5 ${className}`} role="radiogroup" aria-label="Discipline selector">
      <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
        Discipline
      </div>
      {DISCIPLINES.map((disc) => (
        <DisciplineButton
          key={disc.id}
          id={disc.id}
          active={disc.id === currentDiscipline}
          visible={visibleDisciplines.includes(disc.id)}
          onSelect={handleSelect}
          onToggleVisibility={toggleDisciplineVisibility}
        />
      ))}
    </div>
  );
}
