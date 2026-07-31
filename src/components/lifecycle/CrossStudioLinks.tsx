import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { StudioLink } from '@/lib/lifecycle/studioLinks';

interface CrossStudioLinksProps {
  projectId: string;
  links: StudioLink[];
  title?: string;
}

export function CrossStudioLinks({ projectId: _projectId, links, title }: CrossStudioLinksProps) {
  if (links.length === 0) return null;

  const severityBorder: Record<string, string> = {
    info: 'border-cyan-500/20',
    warning: 'border-amber-500/30',
    critical: 'border-red-500/40',
  };

  return (
    <div className="space-y-1.5">
      {title && (
        <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">{title}</p>
      )}
      <div className="space-y-1">
        {links.map((link, i) => (
          <Link
            key={i}
            to={link.to}
            className={`flex items-center gap-2 rounded-lg border ${severityBorder[link.severity ?? 'info']} bg-[var(--bg-tertiary)] px-2.5 py-1.5 text-[10px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]`}
          >
            <span className="shrink-0 text-[var(--text-muted)]">{link.icon}</span>
            <span className="font-medium">{link.label}</span>
            <span className="text-[var(--text-muted)]">·</span>
            <span className="truncate text-[var(--text-muted)]">{link.description}</span>
            {link.severity === 'critical' && <AlertTriangle size={10} className="shrink-0 text-red-400" />}
            <ArrowRight size={10} className="ml-auto shrink-0 text-[var(--text-tertiary)]" />
          </Link>
        ))}
      </div>
    </div>
  );
}
