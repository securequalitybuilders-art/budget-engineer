import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from './motion';

/**
 * Elastic-bounce toggle switch. A gold dot travels the charcoal track with a
 * springy overshoot; the checked track turns forest. Reduced-motion users get
 * a plain positional transition. Accessible: real <button> with role=switch
 * and aria-checked — never colour alone (checked label is announced).
 */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  id,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible label (announced via aria-label / visible label). */
  label: string;
  id?: string;
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        checked ? 'border-gold/60 bg-forest' : 'border-[var(--border-default)] bg-[var(--bg-tertiary)]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-[18px] w-[18px] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.35)]',
          checked ? 'bg-gold' : 'bg-[var(--text-muted)]',
          'mx-0.5',
        )}
        style={{
          ...(reduce
            ? { transition: 'transform 150ms ease-in-out' }
            : { transition: 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)' }),
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}
