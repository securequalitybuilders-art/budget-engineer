import { useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePilotFeedbackStore } from '@/stores/pilotFeedbackStore';
import type { PilotObservation, PilotSeverity, PilotStatus, PilotDomain, PilotAttachmentRef } from '@/lib/pilot/pilotFeedbackModel';
import { SEVERITY_LABELS, STATUS_LABELS, DOMAIN_LABELS, SEVERITY_ORDER, generateId } from '@/lib/pilot/pilotFeedbackModel';
import { isBlocking, isResolved, filterBySeverity, filterByDomain, filterByStatus, countBySeverity } from '@/lib/pilot/pilotIssueClassification';
import { Plus, X, Eye, ArrowRight, Download, Paperclip, Tag, AlertTriangle } from 'lucide-react';

type SortKey = 'severity' | 'createdAt' | 'status';

interface ObservationFormData {
  title: string;
  description: string;
  severity: PilotSeverity;
  domain: PilotDomain;
  evidenceRef: string;
  recommendation: string;
  reviewerName: string;
  reviewerRole: string;
  followUpAction: string;
  followUpAssignee: string;
  resolutionNotes: string;
  tags: string[];
  recurringIssueKey: string;
  attachments: PilotAttachmentRef[];
}

const EMPTY_FORM: ObservationFormData = {
  title: '', description: '', severity: 'observation', domain: 'deployment-evaluation-ux',
  evidenceRef: '', recommendation: '', reviewerName: '', reviewerRole: '',
  followUpAction: '', followUpAssignee: '', resolutionNotes: '',
  tags: [], recurringIssueKey: '', attachments: [],
};

const SEVERITY_BADGE: Record<PilotSeverity, 'danger' | 'warning' | 'default' | 'secondary' | 'success'> = {
  blocker: 'danger', major: 'warning', minor: 'default', observation: 'secondary', enhancement: 'success',
};

function SeveritySelect({ value, onChange }: { value: PilotSeverity; onChange: (v: PilotSeverity) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as PilotSeverity)}
      className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 text-[10px] text-[var(--text-primary)] outline-none">
      {SEVERITY_ORDER.map(s => (
        <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
      ))}
    </select>
  );
}

export function PilotObservationCard({ observation, onEdit, onDelete }: {
  observation: PilotObservation;
  onEdit: (obs: PilotObservation) => void;
  onDelete: (id: string) => void;
}) {
  const blocking = isBlocking(observation);
  const resolved = isResolved(observation.status);

  return (
    <Card className={`transition-all ${blocking ? 'ring-1 ring-red-500/40' : ''} ${resolved ? 'opacity-70' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <Badge variant={SEVERITY_BADGE[observation.severity]} className="text-[8px] px-1.5 py-0">
                {SEVERITY_LABELS[observation.severity]}
              </Badge>
              <Badge variant={
                observation.status === 'new' ? 'danger' :
                observation.status === 'under-review' ? 'warning' :
                observation.status === 'action-planned' ? 'default' :
                observation.status === 'resolved' ? 'success' : 'secondary'
              } className="text-[8px] px-1.5 py-0">
                {STATUS_LABELS[observation.status]}
              </Badge>
              <span className="text-[8px] text-[var(--text-tertiary)]">{DOMAIN_LABELS[observation.domain]}</span>
              {observation.recurringIssueKey && (
                <Badge variant="warning" className="text-[7px] px-1 py-0">
                  <AlertTriangle size={8} className="mr-0.5" />
                  {observation.recurringIssueKey}
                </Badge>
              )}
            </div>
            <h4 className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{observation.title}</h4>
            {observation.description && (
              <p className="text-[9px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">{observation.description}</p>
            )}
            {observation.tags && observation.tags.length > 0 && (
              <div className="mt-1 flex items-center gap-1 flex-wrap">
                <Tag size={8} className="text-[var(--text-tertiary)] shrink-0" />
                {observation.tags.map(t => (
                  <span key={t} className="text-[7px] px-1 py-0 rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">{t}</span>
                ))}
              </div>
            )}
            {observation.recommendation && (
              <div className="mt-1 flex items-start gap-1 text-[8px] text-[var(--text-tertiary)]">
                <ArrowRight size={10} className="mt-0.5 shrink-0" />
                <span>{observation.recommendation}</span>
              </div>
            )}
            {observation.evidenceRef && (
              <div className="mt-1 text-[8px] text-[var(--text-muted)]">
                Evidence: {observation.evidenceRef}
              </div>
            )}
            {observation.attachments && observation.attachments.length > 0 && (
              <div className="mt-1 flex items-center gap-1 flex-wrap">
                <Paperclip size={8} className="text-[var(--text-tertiary)] shrink-0" />
                {observation.attachments.map(a => (
                  <a key={a.id} href={a.storedAt} target="_blank" rel="noopener noreferrer"
                    className="text-[8px] text-[var(--brand-accent)] hover:underline truncate max-w-[120px]">
                    {a.fileName}
                  </a>
                ))}
              </div>
            )}
            <div className="mt-1.5 flex items-center gap-2 text-[8px] text-[var(--text-muted)]">
              <span>{observation.reviewerName}{observation.reviewerRole ? ` (${observation.reviewerRole})` : ''}</span>
              {observation.followUpAction && <span>| Follow-up: {observation.followUpAction}</span>}
              {observation.followUpAssignee && <span>→ {observation.followUpAssignee}</span>}
            </div>
            {observation.resolutionNotes && resolved && (
              <div className="mt-1 text-[8px] text-green-400 italic">Resolution: {observation.resolutionNotes}</div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(observation)}
              className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              title="Edit">
              <Eye size={12} />
            </button>
            <button onClick={() => onDelete(observation.id)}
              className="rounded p-1 text-[var(--text-tertiary)] hover:text-red-400 hover:bg-red-500/10"
              title="Delete">
              <X size={12} />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PilotFeedbackPanel({ onExport }: { onExport?: () => void }) {
  const store = usePilotFeedbackStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ObservationFormData>(EMPTY_FORM);
  const [filterSeverity, setFilterSeverity] = useState<PilotSeverity | 'all'>('all');
  const [filterDomain, setFilterDomain] = useState<PilotDomain | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<PilotStatus | 'all'>('all');
  const [sessionName, setSessionName] = useState('');
  const [sessionDesc, setSessionDesc] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('severity');
  const [tagsInput, setTagsInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSession = store.getActiveSession();
  const allObservations = store.getActiveObservations();

  const filtered = useMemo(() => {
    let result = allObservations;
    result = filterBySeverity(result, filterSeverity);
    result = filterByDomain(result, filterDomain);
    result = filterByStatus(result, filterStatus);
    return result.sort((a, b) => {
      if (sortKey === 'severity') return SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
      if (sortKey === 'createdAt') return b.createdAt.localeCompare(a.createdAt);
      return a.status.localeCompare(b.status);
    });
  }, [allObservations, filterSeverity, filterDomain, filterStatus, sortKey]);

  const severityCounts = useMemo(() => countBySeverity(allObservations), [allObservations]);
  const blockerCount = useMemo(() => allObservations.filter(isBlocking).length, [allObservations]);
  const resolvedCount = useMemo(() => allObservations.filter(o => isResolved(o.status)).length, [allObservations]);

  const handleCreateSession = useCallback(() => {
    if (!sessionName.trim()) return;
    store.createSession({
      projectId: '',
      name: sessionName.trim(),
      description: sessionDesc.trim(),
      startDate: new Date().toISOString(),
      endDate: null,
      status: 'active',
      leadReviewer: '',
      teamMembers: [],
      notes: '',
      readinessContext: null,
    });
    setSessionName('');
    setSessionDesc('');
  }, [sessionName, sessionDesc, store]);

  const handleFileAttach = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const attachment: PilotAttachmentRef = {
          id: generateId(),
          fileName: file.name,
          fileType: file.type,
          fileSizeBytes: file.size,
          description: '',
          storedAt: dataUrl,
        };
        setForm(f => ({ ...f, attachments: [...f.attachments, attachment] }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setForm(f => ({ ...f, attachments: f.attachments.filter(a => a.id !== id) }));
  }, []);

  const handleSubmitObservation = useCallback(() => {
    if (!form.title.trim()) return;
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const resultForm = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      tags,
    };
    if (editingId) {
      store.updateObservation(editingId, resultForm);
    } else if (store.activeSessionId) {
      store.addObservation({ ...resultForm, sessionId: store.activeSessionId, status: 'new', resolutionNotes: '' });
    }
    setForm(EMPTY_FORM);
    setTagsInput('');
    setShowForm(false);
    setEditingId(null);
  }, [form, editingId, store, tagsInput]);

  const handleEditObservation = useCallback((obs: PilotObservation) => {
    setForm({
      title: obs.title, description: obs.description, severity: obs.severity,
      domain: obs.domain, evidenceRef: obs.evidenceRef, recommendation: obs.recommendation,
      reviewerName: obs.reviewerName, reviewerRole: obs.reviewerRole,
      followUpAction: obs.followUpAction, followUpAssignee: obs.followUpAssignee,
      resolutionNotes: obs.resolutionNotes ?? '',
      tags: obs.tags ?? [],
      recurringIssueKey: obs.recurringIssueKey ?? '',
      attachments: obs.attachments ?? [],
    });
    setTagsInput((obs.tags ?? []).join(', '));
    setEditingId(obs.id);
    setShowForm(true);
  }, []);

  const handleDeleteObservation = useCallback((id: string) => {
    store.deleteObservation(id);
  }, [store]);

  const handleStatusTransition = useCallback(() => {
    if (!editingId) return;
    const obs = allObservations.find(o => o.id === editingId);
    if (!obs) return;
    const transitions: Record<PilotStatus, PilotStatus | null> = {
      'new': 'under-review',
      'under-review': 'action-planned',
      'action-planned': 'resolved',
      'resolved': null,
      'accepted-limitation': null,
      'deferred': null,
    };
    const next = transitions[obs.status];
    if (next) {
      store.updateObservation(editingId, { status: next });
    }
  }, [editingId, allObservations, store]);

  if (!activeSession) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Pilot Feedback</CardTitle>
            <CardDescription className="text-[10px]">Create a pilot session to start capturing observations</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <input type="text" value={sessionName} onChange={(e) => setSessionName(e.target.value)}
              placeholder="Session name (e.g. Pilot Round 1)"
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]" />
            <textarea value={sessionDesc} onChange={(e) => setSessionDesc(e.target.value)}
              placeholder="Session description (optional)"
              rows={2}
              className="w-full resize-none rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]" />
            <Button variant="brand" size="sm" onClick={handleCreateSession} disabled={!sessionName.trim()} className="gap-1.5">
              <Plus size={14} /> Create Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session header */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[11px] font-semibold text-[var(--text-primary)]">{activeSession.name}</h3>
              {activeSession.description && (
                <p className="text-[9px] text-[var(--text-secondary)]">{activeSession.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1 text-[8px] text-[var(--text-muted)]">
                <Badge variant={activeSession.status === 'active' ? 'success' : activeSession.status === 'paused' ? 'warning' : 'secondary'} className="text-[7px] px-1 py-0">
                  {activeSession.status}
                </Badge>
                <span>{allObservations.length} observations</span>
                <span className={blockerCount > 0 ? 'text-red-400' : ''}>{blockerCount} blockers</span>
                <span>{resolvedCount} resolved</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onExport && (
                <Button variant="ghost" size="sm" onClick={onExport} className="gap-1 text-[9px]">
                  <Download size={12} /> Export
                </Button>
              )}
              <select value={activeSession.status} onChange={(e) => store.updateSession(activeSession.id, { status: e.target.value as 'active' | 'paused' | 'closed' })}
                className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 text-[9px] text-[var(--text-primary)] outline-none">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary bar */}
      <div className="grid grid-cols-5 gap-2">
        {SEVERITY_ORDER.map(sev => (
          <div key={sev} className={`rounded-lg p-2 text-center border ${
            sev === 'blocker' ? 'bg-red-500/10 border-red-500/30' :
            sev === 'major' ? 'bg-orange-500/10 border-orange-500/30' :
            sev === 'minor' ? 'bg-amber-500/10 border-amber-500/30' :
            sev === 'observation' ? 'bg-blue-500/10 border-blue-500/30' :
            'bg-green-500/10 border-green-500/30'
          }`}>
            <div className={`text-sm font-bold ${
              sev === 'blocker' ? 'text-red-400' :
              sev === 'major' ? 'text-orange-400' :
              sev === 'minor' ? 'text-amber-400' :
              sev === 'observation' ? 'text-blue-400' : 'text-green-400'
            }`}>
              {severityCounts[sev]}
            </div>
            <div className="text-[7px] text-[var(--text-tertiary)]">{SEVERITY_LABELS[sev]}</div>
          </div>
        ))}
      </div>

      {/* Filters and add button */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value as PilotSeverity | 'all')}
          className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 text-[9px] text-[var(--text-primary)] outline-none">
          <option value="all">All Severity</option>
          {SEVERITY_ORDER.map(s => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
        </select>
        <select value={filterDomain} onChange={(e) => setFilterDomain(e.target.value as PilotDomain | 'all')}
          className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 text-[9px] text-[var(--text-primary)] outline-none">
          <option value="all">All Domains</option>
          {(Object.entries(DOMAIN_LABELS) as [PilotDomain, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as PilotStatus | 'all')}
          className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 text-[9px] text-[var(--text-primary)] outline-none">
          <option value="all">All Status</option>
          {(Object.entries(STATUS_LABELS) as [PilotStatus, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 text-[9px] text-[var(--text-primary)] outline-none">
          <option value="severity">Sort: Severity</option>
          <option value="createdAt">Sort: Newest</option>
          <option value="status">Sort: Status</option>
        </select>
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[8px] text-[var(--text-tertiary)]">{filtered.length} shown</span>
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)} className="gap-1 text-[9px]">
            <Plus size={12} /> Add
          </Button>
        </div>
      </div>

      {/* Observation form */}
      {showForm && (
        <Card className="ring-1 ring-[var(--brand-accent)]/30">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-semibold text-[var(--text-primary)]">
                {editingId ? 'Edit Observation' : 'New Observation'}
              </h4>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }} className="text-[9px]">
                  <X size={12} /> Cancel
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Observation title *"
                className="col-span-2 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]" />
              <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description"
                rows={2}
                className="col-span-2 resize-none rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]" />
              <div>
                <label className="block text-[8px] text-[var(--text-tertiary)] mb-0.5">Severity</label>
                <SeveritySelect value={form.severity} onChange={(v) => setForm(f => ({ ...f, severity: v }))} />
              </div>
              <div>
                <label className="block text-[8px] text-[var(--text-tertiary)] mb-0.5">Domain</label>
                <select value={form.domain} onChange={(e) => setForm(f => ({ ...f, domain: e.target.value as PilotDomain }))}
                  className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 text-[10px] text-[var(--text-primary)] outline-none">
                  {(Object.entries(DOMAIN_LABELS) as [PilotDomain, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <input type="text" value={form.reviewerName} onChange={(e) => setForm(f => ({ ...f, reviewerName: e.target.value }))}
                placeholder="Reviewer name"
                className="rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]" />
              <input type="text" value={form.reviewerRole} onChange={(e) => setForm(f => ({ ...f, reviewerRole: e.target.value }))}
                placeholder="Reviewer role"
                className="rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]" />
              <input type="text" value={form.evidenceRef} onChange={(e) => setForm(f => ({ ...f, evidenceRef: e.target.value }))}
                placeholder="Evidence reference (screenshot #, log ref)"
                className="col-span-2 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]" />
              <div className="col-span-2">
                <label className="block text-[8px] text-[var(--text-tertiary)] mb-0.5">Tags (comma-separated)</label>
                <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. ui, regression, performance"
                  className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]" />
              </div>
              <div>
                <label className="block text-[8px] text-[var(--text-tertiary)] mb-0.5">Recurring Issue Key</label>
                <input type="text" value={form.recurringIssueKey} onChange={(e) => setForm(f => ({ ...f, recurringIssueKey: e.target.value }))}
                  placeholder="e.g. GEO-007"
                  className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]" />
              </div>
              <div>
                <label className="block text-[8px] text-[var(--text-tertiary)] mb-0.5">Attachments</label>
                <input ref={fileInputRef} type="file" multiple onChange={handleFileAttach}
                  className="hidden" />
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1 text-[9px]">
                  <Paperclip size={12} /> Attach Files
                </Button>
                {form.attachments.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {form.attachments.map(a => (
                      <div key={a.id} className="flex items-center gap-1 text-[8px] text-[var(--text-secondary)]">
                        <span className="truncate max-w-[120px]">{a.fileName}</span>
                        <button onClick={() => handleRemoveAttachment(a.id)}
                          className="text-red-400 hover:text-red-300">
                          <X size={8} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <textarea value={form.recommendation} onChange={(e) => setForm(f => ({ ...f, recommendation: e.target.value }))}
                placeholder="Recommended action"
                rows={2}
                className="col-span-2 resize-none rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]" />
              <input type="text" value={form.followUpAction} onChange={(e) => setForm(f => ({ ...f, followUpAction: e.target.value }))}
                placeholder="Follow-up action"
                className="rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]" />
              <input type="text" value={form.followUpAssignee} onChange={(e) => setForm(f => ({ ...f, followUpAssignee: e.target.value }))}
                placeholder="Follow-up assignee"
                className="rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]" />
            </div>
            {editingId && (
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleStatusTransition} className="gap-1 text-[9px]">
                  <ArrowRight size={12} /> Advance Status
                </Button>
                {allObservations.find(o => o.id === editingId)?.status === 'action-planned' && (
                  <div className="flex items-center gap-1">
                    <input type="text" value={form.resolutionNotes || ''}
                      onChange={(e) => setForm(f => ({ ...f, resolutionNotes: e.target.value }))}
                      placeholder="Resolution notes"
                      className="w-40 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-[9px] text-[var(--text-primary)] outline-none" />
                  </div>
                )}
              </div>
            )}
            <Button variant="brand" size="sm" onClick={handleSubmitObservation} disabled={!form.title.trim()} className="gap-1 text-[9px]">
              {editingId ? 'Update' : 'Add'} Observation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Observation list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-[var(--text-muted)] text-[10px]">No observations match the current filters.</div>
            </CardContent>
          </Card>
        )}
        {filtered.map(obs => (
          <PilotObservationCard
            key={obs.id}
            observation={obs}
            onEdit={handleEditObservation}
            onDelete={handleDeleteObservation}
          />
        ))}
      </div>
    </div>
  );
}
