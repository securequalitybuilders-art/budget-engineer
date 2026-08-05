import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function EcoCard({ title, subtitle, icon, actions, children, className = '' }: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {icon ? <div className="mt-0.5 text-brand-accent" aria-hidden>{icon}</div> : null}
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = 'default' }: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'accent';
}) {
  const toneClass =
    tone === 'good' ? 'text-emerald-600'
    : tone === 'warn' ? 'text-amber-600'
    : tone === 'bad' ? 'text-rose-600'
    : tone === 'accent' ? 'text-brand-accent'
    : 'text-slate-800';
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-lg font-bold ${toneClass}`}>{value}</div>
      {hint ? <div className="text-[11px] text-slate-400">{hint}</div> : null}
    </div>
  );
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'accent' }) {
  const toneClass =
    tone === 'good' ? 'bg-emerald-100 text-emerald-700'
    : tone === 'warn' ? 'bg-amber-100 text-amber-700'
    : tone === 'bad' ? 'bg-rose-100 text-rose-700'
    : tone === 'accent' ? 'bg-brand/10 text-brand-accent'
    : 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${toneClass}`}>
      {children}
    </span>
  );
}

export function EmptyState({ message, cta }: { message: string; cta?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-6 text-center">
      <p className="text-sm text-slate-400">{message}</p>
      {cta ? <div className="mt-2">{cta}</div> : null}
    </div>
  );
}

export function Bar({ value, max, tone = 'good' }: { value: number; max: number; tone?: 'good' | 'warn' | 'bad' | 'accent' }) {
  const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) * 100 : 0;
  const toneClass =
    tone === 'good' ? 'bg-emerald-500'
    : tone === 'warn' ? 'bg-amber-500'
    : tone === 'bad' ? 'bg-rose-500'
    : 'bg-brand-accent';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${pct.toFixed(0)}%`}>
      <div className={`h-full ${toneClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function LinkButton({ to, children, variant = 'outline' }: { to: string; children: ReactNode; variant?: 'outline' | 'solid' }) {
  const base = 'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors';
  const style =
    variant === 'solid'
      ? 'bg-brand-accent text-white hover:opacity-90'
      : 'border border-slate-200 text-slate-600 hover:bg-slate-50';
  return (
    <Link to={to} className={`${base} ${style}`}>{children}</Link>
  );
}
