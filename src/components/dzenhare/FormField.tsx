import * as React from 'react';
import { Sparkles, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Design Brief form field: 12px uppercase SteelBlue label, concrete-grey
 * border input that focuses to a Deep Forest ring, Safety Orange error state,
 * and an italic gold AI suggestion line.
 */
export function FormField({
  id,
  label,
  error,
  hint,
  suggestion,
  suffix,
  className,
  inputClassName,
  ...inputProps
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  /** Gold italic AI suggestion shown under the field. */
  suggestion?: string;
  /** Right-aligned suffix (e.g. `m²`, `USD`) inside the field. */
  suffix?: string;
  className?: string;
  inputClassName?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>) {
  const hasError = Boolean(error);
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-[0.08em] text-steelBlue">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          aria-invalid={hasError}
          className={cn(
            'h-10 w-full rounded-lg border bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)] outline-none transition-all',
            'border-[var(--border-default)] focus:border-forest focus:ring-2 focus:ring-forest/30 dark:focus:border-gold dark:focus:ring-gold/25',
            hasError && 'border-safetyOrange focus:border-safetyOrange focus:ring-safetyOrange/25',
            suffix && 'pr-14',
            inputClassName,
          )}
          {...inputProps}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-[var(--text-muted)]">
            {suffix}
          </span>
        )}
      </div>
      {hasError && (
        <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-safetyOrange" data-error>
          <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
          {error}
        </p>
      )}
      {!hasError && hint && <p className="mt-1 text-[11px] text-[var(--text-muted)]">{hint}</p>}
      {suggestion && (
        <p className="mt-1 flex items-center gap-1 text-[12px] italic text-gold">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {suggestion}
        </p>
      )}
    </div>
  );
}
