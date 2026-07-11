import { Link } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { Plus, Home, Settings, Folder, Sofa, Monitor, Globe, BookOpen } from 'lucide-react';
import { DisciplineSwitcher } from '@/components/studio/DisciplineSwitcher';

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

      {currentProjectId && (
        <>
          <div className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
            Studio
          </div>
          <div className="space-y-0.5">
            <Link
              to={`/project/${currentProjectId}/studio/interior`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <Sofa size={16} />
              Interior Design
            </Link>
            <Link
              to={`/project/${currentProjectId}/studio/presentation`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <Monitor size={16} />
              Presentation Boards
            </Link>
            <Link
              to={`/project/${currentProjectId}/studio/site-analysis`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <Globe size={16} />
              Site Analysis
            </Link>
          </div>
          <hr className="my-3 border-t border-[var(--border-default)]" />
          <DisciplineSwitcher className="mb-3" />
          <hr className="my-3 border-t border-[var(--border-default)]" />
        </>
      )}

      <Link
        to="/academy"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
      >
        <BookOpen size={16} />
        Academy
      </Link>

      {currentProjectId && (
        <>
          <div className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
            Project Tools
          </div>
          <div className="space-y-0.5">
            <button
              onClick={async () => {
                const { exportProjectPackage, downloadBlob } = await import('@/services/projectExportImportService')
                const blob = await exportProjectPackage(currentProjectId)
                if (blob) {
                  const project = (await import('@/stores/projectStore')).useProjectStore.getState().currentProject
                  downloadBlob(blob, `${project?.name ?? 'project'}.beproj`)
                }
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <Folder size={16} />
              Export Project
            </button>
            <button
              onClick={async () => {
                const { openProjectFilePicker, importProjectPackage } = await import('@/services/projectExportImportService')
                const { useProjectStore } = await import('@/stores/projectStore')
                const file = await openProjectFilePicker()
                if (!file) return
                const projectId = await importProjectPackage(file)
                if (projectId) {
                  await useProjectStore.getState().loadProjects()
                  window.location.href = `/project/${projectId}`
                }
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <Settings size={16} />
              Import Project
            </button>
          </div>
          <hr className="my-3 border-t border-[var(--border-default)]" />
        </>
      )}

      <div className="p-3">
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
