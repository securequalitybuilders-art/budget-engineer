import * as React from 'react';
import { MoreHorizontal, Pencil, Eye, History, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  /** Custom cell renderer (defaults to row[key]). */
  render?: (row: T) => React.ReactNode;
  /**
   * Variance in percent. Returns negative when under budget (good → green),
   * 0–5 → amber, >5 → red. Renders as a coloured badge — never colour alone:
   * pairs a +/- arrow with the number.
   */
  variance?: (row: T) => number;
}

/** Row action menu entry (spec: edit / view / history / dispute). */
export interface RowAction {
  key: 'edit' | 'view' | 'history' | 'dispute';
  label?: string;
  /** Danger-tone dispute action (safety orange). */
  danger?: boolean;
  onClick: (rowKey: string) => void;
}

const ROW_ACTION_META: Record<RowAction['key'], { label: string; Icon: typeof Eye }> = {
  edit: { label: 'Edit', Icon: Pencil },
  view: { label: 'View', Icon: Eye },
  history: { label: 'History', Icon: History },
  dispute: { label: 'Dispute', Icon: AlertTriangle },
};

/**
 * Vault data table: sticky SteelBlue header, zebra rows, hover highlight,
 * right-aligned money columns. Variance columns get arrow+colour+label.
 * When `actions` is provided a per-row ellipsis opens the edit/view/history/
 * dispute menu (spec). The menu closes on click-outside or Escape.
 */
export function DataTable<T extends object>({
  columns,
  rows,
  rowKey,
  actions,
  className,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Optional per-row action menu entries. */
  actions?: RowAction[];
  className?: string;
}) {
  const sticky = rows.length > 10;
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!openKey) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenKey(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenKey(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openKey]);

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-[var(--border-default)] shadow-card', className)}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className={cn('bg-steelBlue text-white', sticky && 'sticky top-0 z-10')}>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]',
                  c.align === 'right' && 'text-right',
                )}
              >
                {c.header}
              </th>
            ))}
            {actions && actions.length > 0 && (
              <th className="w-10 px-2 py-2.5" aria-label="Row actions" />
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const k = rowKey(row);
            const menuOpen = openKey === k;
            return (
              <tr
                key={k}
                className={cn(
                  'border-b border-[var(--border-subtle)] transition-colors hover:bg-gold/5',
                  i % 2 === 1 && 'bg-[var(--bg-tertiary)]/40',
                )}
              >
                {columns.map((c) => {
                  const raw = c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '');
                  const variance = c.variance?.(row);
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        'px-4 py-2.5 text-[13px] text-[var(--text-secondary)]',
                        c.align === 'right' && 'text-right',
                        c.variance && 'font-mono tabular-nums',
                      )}
                    >
                      {c.variance && variance !== undefined ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            variance < 0 && 'bg-emerald-500/15 text-emerald-400',
                            variance >= 0 && variance <= 5 && 'bg-amber-500/15 text-amber-400',
                            variance > 5 && 'bg-safetyOrange/15 text-safetyOrange',
                          )}
                        >
                          {variance < 0 ? '▼' : variance > 0 ? '▲' : '◆'} {Math.abs(variance).toFixed(1)}%
                        </span>
                      ) : (
                        raw
                      )}
                    </td>
                  );
                })}
                {actions && actions.length > 0 && (
                  <td className="relative px-2 text-center">
                    <div ref={menuRef} className="relative inline-block">
                      <button
                        type="button"
                        aria-label={`Row actions for ${k}`}
                        aria-expanded={menuOpen}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenKey(menuOpen ? null : k);
                        }}
                        className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </button>
                      {menuOpen && (
                        <div
                          role="menu"
                          className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] py-1 shadow-modal"
                        >
                          {actions.map((a) => {
                            const meta = ROW_ACTION_META[a.key];
                            const Icon = meta.Icon;
                            return (
                              <button
                                key={a.key}
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenKey(null);
                                  a.onClick(k);
                                }}
                                className={cn(
                                  'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors',
                                  a.danger
                                    ? 'text-safetyOrange hover:bg-safetyOrange/10'
                                    : 'text-[var(--text-secondary)] hover:bg-gold/10 hover:text-[var(--text-primary)]',
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                {a.label ?? meta.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
