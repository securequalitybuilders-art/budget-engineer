import type { PackageAssemblyResult } from '@/lib/drawings/package-assembly';
import { PACKAGE_ISSUE_LABELS, PACKAGE_SUBMISSION_LABELS } from '@/lib/drawings/package-sheet-meta';
import { AlertTriangle, FileText, Layers, List } from 'lucide-react';

interface PackageSummaryPanelProps {
  assembly: PackageAssemblyResult;
}

export function PackageSummaryPanel({ assembly }: PackageSummaryPanelProps) {
  const identity = assembly.identity;

  const groupColors: Record<string, string> = {
    site: 'text-blue-400',
    plan: 'text-green-400',
    'elevation-section': 'text-purple-400',
    section: 'text-orange-400',
    schedule: 'text-cyan-400',
    detail: 'text-pink-400',
    presentation: 'text-yellow-400',
  };

  return (
    <div className="space-y-4">
      {/* Package identity header */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Package Summary</h3>
          </div>
          <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[9px] text-cyan-300 font-mono">
            {identity.packageId}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[10px]">
          <Detail label="Title" value={identity.packageTitle} />
          <Detail label="Issue Type" value={PACKAGE_ISSUE_LABELS[identity.issueType] ?? identity.issueType} />
          <Detail label="Category" value={PACKAGE_SUBMISSION_LABELS[identity.submissionCategory] ?? identity.submissionCategory} />
          <Detail label="Discipline" value={identity.packageDiscipline} />
          <Detail label="Issue Number" value={identity.issueNumber} />
          <Detail label="Revision" value={identity.revision} />
          <Detail label="Date" value={assembly.issueDate} />
          <Detail label="Project" value={`${assembly.projectName} (${assembly.projectNumber})`} />
          {assembly.client && <Detail label="Client" value={assembly.client} />}
          {assembly.architect && <Detail label="Architect" value={assembly.architect} />}
        </div>
      </div>

      {/* Sheet and schedule counts */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          icon={<FileText size={14} />}
          label="Sheets"
          value={String(assembly.sheetCount)}
          color="text-cyan-400"
        />
        <SummaryCard
          icon={<List size={14} />}
          label="Schedules"
          value={String(assembly.scheduleCount)}
          color="text-green-400"
        />
        <SummaryCard
          icon={<Layers size={14} />}
          label="Disciplines"
          value={String(assembly.disciplineSummary.length)}
          color="text-purple-400"
        />
      </div>

      {/* Group breakdown */}
      {assembly.groupSummary.length > 0 && (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
          <h4 className="text-[10px] font-semibold text-[var(--text-primary)] mb-2">Sheet Group Breakdown</h4>
          <div className="flex flex-wrap gap-2">
            {assembly.groupSummary.map(g => (
              <span key={g.group} className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-[9px] text-[var(--text-secondary)]">
                <span className={groupColors[g.group] ?? ''}>{g.group}</span>
                <span className="ml-1.5 font-mono text-[var(--text-muted)]">{g.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Schedule filter breakdown */}
      {assembly.scheduleFilter.scheduleTypeBreakdown.length > 0 && (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
          <h4 className="text-[10px] font-semibold text-[var(--text-primary)] mb-2">Included Schedule Types</h4>
          <div className="flex flex-wrap gap-2">
            {assembly.scheduleFilter.scheduleTypeBreakdown.map(t => (
              <span key={t.type} className="rounded bg-green-500/10 px-2 py-1 text-[9px] text-green-300">
                {t.type} ({t.count})
              </span>
            ))}
          </div>
          <p className="text-[8px] text-[var(--text-muted)] mt-1.5">{assembly.scheduleFilter.reason}</p>
        </div>
      )}

      {/* Warnings */}
      {assembly.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle size={12} className="text-amber-400" />
            <h4 className="text-[10px] font-semibold text-amber-300">Warnings</h4>
          </div>
          <ul className="space-y-1">
            {assembly.warnings.map((w, i) => (
              <li key={i} className="text-[9px] text-amber-200/80 ml-4 list-disc">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sheet list preview */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)]">
          <h4 className="text-[10px] font-semibold text-[var(--text-primary)]">Sheet Listing</h4>
          <span className="text-[8px] text-[var(--text-muted)]">{assembly.sheetCount} sheet(s)</span>
        </div>
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-[9px]">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border-[var(--border-default)]">
                <th className="text-left px-3 py-1.5 font-medium">Sheet</th>
                <th className="text-left px-3 py-1.5 font-medium">Title</th>
                <th className="text-left px-3 py-1.5 font-medium">Disc</th>
                <th className="text-left px-3 py-1.5 font-medium">Group</th>
              </tr>
            </thead>
            <tbody>
              {assembly.sheets.map((s) => (
                <tr key={s.sheetNumber} className="border-b border-[var(--border-default)]/50 hover:bg-[var(--bg-hover)]">
                  <td className="px-3 py-1 font-mono text-[var(--text-primary)]">{s.sheetNumber}</td>
                  <td className="px-3 py-1 text-[var(--text-secondary)] truncate max-w-[200px]">{s.title}</td>
                  <td className="px-3 py-1 text-[var(--text-muted)]">{s.discipline}</td>
                  <td className={`px-3 py-1 ${groupColors[s.group] ?? ''}`}>{s.group}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[var(--text-muted)] shrink-0">{label}:</span>
      <span className="text-[var(--text-primary)] truncate">{value}</span>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-center">
      <div className="flex justify-center mb-1 text-[var(--text-muted)]">{icon}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[8px] text-[var(--text-muted)]">{label}</div>
    </div>
  );
}
