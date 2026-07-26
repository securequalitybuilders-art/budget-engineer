import type { DeliveryProject, IssueState } from '@/domain/delivery';

interface DeliveryWorkflowPanelProps {
  delivery: DeliveryProject | null;
  className?: string;
}

const STATE_LABELS: Record<IssueState, string> = {
  'draft': 'Draft',
  'in-progress': 'In Progress',
  'for-review': 'For Review',
  'for-construction': 'For Construction',
  'as-built': 'As-Built',
  'archived': 'Archived',
};

const STATE_COLORS: Record<IssueState, string> = {
  'draft': '#666',
  'in-progress': '#3b82f6',
  'for-review': '#f59e0b',
  'for-construction': '#22c55e',
  'as-built': '#8b5cf6',
  'archived': '#94a3b8',
};

export function DeliveryWorkflowPanel({ delivery, className = '' }: DeliveryWorkflowPanelProps) {
  if (!delivery) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-sm text-[var(--text-muted)]">
        No delivery project configured. Set up project delivery to begin.
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Delivery Overview</h2>
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: STATE_COLORS[delivery.currentIssueState] + '20', color: STATE_COLORS[delivery.currentIssueState] }}
          >
            {STATE_LABELS[delivery.currentIssueState]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)] mb-3">
          <div>Project: <span className="font-medium text-[var(--text-primary)]">{delivery.projectNumber}</span></div>
          <div>Client: <span className="font-medium text-[var(--text-primary)]">{delivery.clientName}</span></div>
          <div>Address: <span className="font-medium text-[var(--text-primary)]">{delivery.projectAddress}</span></div>
          <div>Sheets: <span className="font-medium text-[var(--text-primary)]">{delivery.sheets.length}</span></div>
        </div>

        <div className="flex gap-2">
          {(['draft', 'in-progress', 'for-review', 'for-construction', 'as-built'] as IssueState[]).map(state => (
            <div
              key={state}
              className={`flex-1 rounded-md p-1.5 text-center text-[9px] ${
                delivery.currentIssueState === state
                  ? 'bg-[var(--brand-accent)]/10 text-[var(--brand-accent)] font-semibold'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
              }`}
            >
              {STATE_LABELS[state]}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <div className="border-b border-[var(--border-default)] px-4 py-2">
          <h3 className="text-xs font-semibold text-[var(--text-primary)]">Sheets ({delivery.sheets.length})</h3>
        </div>
        <div className="divide-y divide-[var(--border-default)]">
          {delivery.sheets.map(sheet => (
            <div key={sheet.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-[var(--text-primary)]">{sheet.sheetNumber}</span>
                  <span className="ml-2 text-[10px] text-[var(--text-muted)]">{sheet.sheetTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">
                    {sheet.currentRevision}
                  </span>
                  <span className="rounded px-1.5 py-0.5 text-[9px]"
                    style={{ backgroundColor: '#22c55e20', color: '#22c55e' }}>
                    {sheet.status}
                  </span>
                </div>
              </div>
              <div className="mt-1 flex gap-3 text-[9px] text-[var(--text-tertiary)]">
                <span>{sheet.discipline}</span>
                <span>{sheet.scale}</span>
                <span>{sheet.size}</span>
                <span>Rev: {sheet.revisions.length}</span>
              </div>
              {sheet.checkedBy && <span className="mr-2 text-[9px] text-[var(--text-muted)]">✓ {sheet.checkedBy}</span>}
              {sheet.approvedBy && <span className="text-[9px] text-[var(--text-muted)]">✓ {sheet.approvedBy}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <div className="border-b border-[var(--border-default)] px-4 py-2">
          <h3 className="text-xs font-semibold text-[var(--text-primary)]">Packages ({delivery.packages.length})</h3>
        </div>
        <div className="divide-y divide-[var(--border-default)]">
          {delivery.packages.map(pkg => (
            <div key={pkg.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-[var(--text-primary)]">{pkg.name}</span>
                  <span className="ml-2 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">
                    {pkg.packageType}
                  </span>
                </div>
                <span className={`rounded px-1.5 py-0.5 text-[9px] ${
                  pkg.status === 'issued' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {pkg.status}
                </span>
              </div>
              <div className="mt-1 flex gap-3 text-[9px] text-[var(--text-tertiary)]">
                <span>Rev {pkg.revision}</span>
                <span>{pkg.issueDate}</span>
                <span>{pkg.contents.length} items</span>
                <span>{pkg.issuedBy}</span>
              </div>
              {pkg.checkedBy && <span className="mr-2 text-[9px] text-[var(--text-muted)]">✓ {pkg.checkedBy}</span>}
              {pkg.approvedBy && <span className="text-[9px] text-[var(--text-muted)]">✓ {pkg.approvedBy}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <h3 className="mb-2 text-xs font-semibold text-[var(--text-primary)]">Drawing Register</h3>
        {delivery.drawingRegister.length === 0 ? (
          <div className="text-[10px] text-[var(--text-muted)]">No drawing register entries.</div>
        ) : (
          <table className="w-full text-[9px]">
            <thead>
              <tr className="text-[var(--text-tertiary)]">
                <th className="p-1 text-left font-medium">No.</th>
                <th className="p-1 text-left font-medium">Title</th>
                <th className="p-1 text-left font-medium">Discipline</th>
                <th className="p-1 text-center font-medium">Rev</th>
                <th className="p-1 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {delivery.drawingRegister.map(entry => (
                <tr key={entry.sheetId} className="text-[var(--text-secondary)]">
                  <td className="p-1">{entry.sheetNumber}</td>
                  <td className="p-1">{entry.sheetTitle}</td>
                  <td className="p-1">{entry.discipline}</td>
                  <td className="p-1 text-center">{entry.revision}</td>
                  <td className="p-1 text-center">{entry.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[9px] text-[var(--text-muted)] italic">
        Professional delivery workflow supports issue sequencing and auditability.
        Final legal signoff must be obtained from registered professionals.
      </p>
    </div>
  );
}
