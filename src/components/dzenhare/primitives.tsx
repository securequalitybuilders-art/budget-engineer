import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fmtMoney } from './format';
import { usePrefersReducedMotion } from './motion';

/** Page enter: fade 200ms + translateY(8px) → 0, respecting reduced motion. */
export function PageEnter({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = usePrefersReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Card surface: 12px radius, layered card shadow, border, hover lift (-2px)
 * with a slightly stronger shadow. Light/dark aware via CSS vars.
 */
export function DzCard({
  children,
  className,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-card transition-all duration-200',
        hover && 'hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.12)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

const PILL_TONES = {
  locked: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-default)]',
  verified: 'bg-gold/15 text-gold border border-gold/40',
  released: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40',
  disputed: 'bg-safetyOrange/15 text-safetyOrange border border-safetyOrange/40',
  neutral: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
} as const;

export type DzPillTone = keyof typeof PILL_TONES;

export function DzPill({ children, tone = 'neutral', className }: {
  children: React.ReactNode;
  tone?: DzPillTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Monospace money block — ALL financial data uses tabular-nums mono. */
export function Money({ cents, className }: { cents: number; className?: string }) {
  return (
    <span className={cn('font-mono tabular-nums', className)}>
      {fmtMoney(cents)}
    </span>
  );
}

/** Section kicker — 12px uppercase SteelBlue label used across the vault. */
export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-xs font-semibold uppercase tracking-[0.08em] text-steelBlue',
        className,
      )}
    >
      {children}
    </p>
  );
}
