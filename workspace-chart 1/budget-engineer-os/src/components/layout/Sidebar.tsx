import { Link } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { Plus, Home, Settings, Folder } from 'lucide-react';

export function Sidebar() {
  const { sidebarOpen } = useUIStore();
  const { projects, currentProjectId } = useProjectStore();

  if (!sidebarOpen) return null;

  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-[var(--border-default)] bg-[var(--bg-secondary)] md:flex">
      <div className="flex items-center justify-between p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Projects
        </span>
        <Link to="/new">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="New project">
            <Plus size={16} />
          </Button>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          <Home size={16} />
          Home
        </Link>

        {projects.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-[var(--text-muted)]">
            No projects yet. Create one to start.
          </div>
        ) : (
          projects.map((project) => {
            const isActive = project.id === currentProjectId;
            return (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className={
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ' +
                  (isActive
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]')
                }
              >
                <Folder size={16} />
                <span className="truncate">{project.name}</span>
              </Link>
            );
          })
        )}
      </nav>

      <div className="border-t border-[var(--border-default)] p-3">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          <Settings size={16} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
