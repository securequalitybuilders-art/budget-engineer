/* eslint-disable react-refresh/only-export-components */
import { Link } from 'react-router-dom';
import { ShieldCheck, FileSpreadsheet, FolderOpen, ShoppingCart, BarChart3, Flag, ArrowRight, AlertTriangle } from 'lucide-react';

interface StudioLink {
  to: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  severity?: 'info' | 'warning' | 'critical';
}

interface CrossStudioLinksProps {
  projectId: string;
  links: StudioLink[];
  title?: string;
}

function iconForStudio(studio: string): React.ReactNode {
  switch (studio) {
    case 'assurance': return <ShieldCheck size={12} />;
    case 'delivery': return <FileSpreadsheet size={12} />;
    case 'handover': return <FolderOpen size={12} />;
    case 'procurement': return <ShoppingCart size={12} />;
    case 'project-controls': return <BarChart3 size={12} />;
    case 'milestones': return <Flag size={12} />;
    default: return <ArrowRight size={12} />;
  }
}

export function buildStudioLink(
  projectId: string,
  studio: string,
  label: string,
  description: string,
  severity?: 'info' | 'warning' | 'critical',
): StudioLink {
  return {
    to: `/project/${projectId}/studio/${studio}`,
    label,
    icon: iconForStudio(studio),
    description,
    severity,
  };
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
