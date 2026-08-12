import * as React from 'react';
import { PenTool } from 'lucide-react';

/**
 * Red Pen Marker: safety-orange strikethrough over a quoted line item with a
 * forensic math tooltip (original → revised, reason + code citation).
 * Opens on hover and on focus for keyboard users.
 */
export function RedPenMarker({
  children,
  original,
  revised,
  reason,
  rule,
  variance,
}: {
  children: React.ReactNode;
  original: string;
  revised: string;
  reason?: string;
  rule?: string;
  /**
   * Forensic math line, e.g. "+180 bags" / "$1,800 leakage" (spec example:
   * "revised unit rates +180 bags ($1,800 leakage)"). Rendered in safety
   * orange monospace under the reason.
   */
  variance?: string;
}) {
  return (
    <span className="group/marker relative inline-flex items-center gap-1">
      <span className="relative">
        <span className="text-[var(--text-primary)]">{children}</span>
        <span
          aria-hidden="true"
          className="absolute -left-0.5 -right-0.5 top-1/2 h-[2px] -translate-y-1/2 rounded bg-safetyOrange"
          style={{ transform: 'translateY(-50%) rotate(-2deg)' }}
        />
      </span>
      <PenTool className="h-3.5 w-3.5 shrink-0 text-safetyOrange" aria-hidden="true" />
      <span className="sr-only">Revised: {revised}. Reason: {reason ?? ''}</span>
      <span
        role="tooltip"
        data-testid="red-pen-forensic"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-64 -translate-x-1/2 rounded-lg border border-safetyOrange/40 bg-[var(--bg-elevated)] p-3 text-left shadow-modal group-focus-within/marker:block group-hover/marker:block"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-safetyOrange">Red Pen</span>
        <p className="mt-1.5 text-[13px] leading-snug text-[var(--text-secondary)]">
          <span className="font-mono text-xs line-through opacity-60">{original}</span>
          <span className="mx-1.5 text-safetyOrange">→</span>
          <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">{revised}</span>
        </p>
        {reason && <p className="mt-1.5 text-[12px] leading-snug text-[var(--text-secondary)]">{reason}</p>}
        {variance && (
          <p className="mt-1 font-mono text-[12px] font-bold tabular-nums text-safetyOrange">▲ {variance}</p>
        )}
        {rule && (
          <p className="mt-1.5 rounded bg-[var(--bg-tertiary)] px-1.5 py-1 font-mono text-[10px] text-steelBlue">
            {rule}
          </p>
        )}
      </span>
    </span>
  );
}
