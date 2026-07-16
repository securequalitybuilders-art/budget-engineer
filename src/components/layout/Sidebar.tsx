import { Link } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { Plus, Home, Settings, Folder, Sofa, Monitor, Globe, BookOpen, Bug, ShieldCheck, FileSpreadsheet, FolderOpen, ShoppingCart, BarChart3, Eye } from 'lucide-react';
import { DisciplineSwitcher } from '@/components/studio/DisciplineSwitcher';
import { RoleSwitcher } from '@/components/auth/RoleSwitcher';
import { LocaleSwitcher } from '@/components/common/LocaleSwitcher';

export function Sidebar() {
  const { sidebarOpen } = useUIStore();
  const { projects, currentProjectId } = useProjectStore();
  const userRole = useAuthStore((s) => s.user.role);

  if (!sidebarOpen) return null;

  const roleIndicator = userRole !== 'owner' ? (
    <span className="flex items-center gap-1 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[8px] text-[var(--text-tertiary)]">
      <Eye size={8} />
      {userRole === 'reviewer' ? 'Reviewer' : 'Viewer'}
    </span>
  ) : null;

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
            <span className="flex items-center gap-2">
              Project Lifecycle
              {roleIndicator}
            </span>
          </div>
          <div className="space-y-0.5">
            <Link
              to={`/project/${currentProjectId}/studio/interior`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <Sofa size={16} />
              <div className="flex flex-col">
                <span>Interior Design</span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Design & layouts</span>
              </div>
            </Link>
            <Link
              to={`/project/${currentProjectId}/studio/presentation`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <Monitor size={16} />
              <div className="flex flex-col">
                <span>Presentation Boards</span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Visual assets & boards</span>
              </div>
            </Link>
            <Link
              to={`/project/${currentProjectId}/studio/site-analysis`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <Globe size={16} />
              <div className="flex flex-col">
                <span>Site Analysis</span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Environmental assessment</span>
              </div>
            </Link>
          </div>

          <div className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
            Delivery & Oversight
          </div>
          <div className="space-y-0.5">
            <Link
              to={`/project/${currentProjectId}/studio/assurance`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <ShieldCheck size={16} />
              <div className="flex flex-col">
                <span>Assurance</span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Gates & readiness</span>
              </div>
            </Link>
            <Link
              to={`/project/${currentProjectId}/studio/delivery`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <FileSpreadsheet size={16} />
              <div className="flex flex-col">
                <span>Delivery</span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Milestones & workflow</span>
              </div>
            </Link>
            <Link
              to={`/project/${currentProjectId}/studio/procurement`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <ShoppingCart size={16} />
              <div className="flex flex-col">
                <span>Procurement</span>
                <span className="text-[9px] text-[var(--text-tertiary)]">BOQ-linked requests</span>
              </div>
            </Link>
            <Link
              to={`/project/${currentProjectId}/studio/handover`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <FolderOpen size={16} />
              <div className="flex flex-col">
                <span>Handover</span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Snags & packages</span>
              </div>
            </Link>
          </div>

          <div className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
            Controls & Analytics
          </div>
          <div className="space-y-0.5">
            <Link
              to={`/project/${currentProjectId}/studio/project-controls`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <BarChart3 size={16} />
              <div className="flex flex-col">
                <span>Project Controls</span>
                <span className="text-[9px] text-[var(--text-tertiary)]">EVM & dashboards</span>
              </div>
            </Link>
          </div>

          <hr className="my-3 border-t border-[var(--border-default)]" />
          <DisciplineSwitcher className="mb-3" />
          <hr className="my-3 border-t border-[var(--border-default)]" />
        </>
      )}

      <RoleSwitcher />
      <LocaleSwitcher />

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
                const { openProjectFilePicker, importProjectAsCopy } = await import('@/services/projectExportImportService')
                const { useProjectStore } = await import('@/stores/projectStore')
                const file = await openProjectFilePicker()
                if (!file) return
                const projectId = await importProjectAsCopy(file)
                if (projectId) {
                  await useProjectStore.getState().loadProjects()
                  window.location.href = `/project/${projectId}`
                }
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <Settings size={16} />
              Import (copy)
            </button>
          </div>
          <hr className="my-3 border-t border-[var(--border-default)]" />
        </>
      )}

      <div className="space-y-0.5 p-3">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          <Settings size={16} />
          Settings
        </Link>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-diagnostics'))}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          <Bug size={16} />
          Diagnostics <span className="text-[10px] text-[var(--text-tertiary)]">Ctrl+Shift+D</span>
        </button>
      </div>
    </aside>
  );
}
