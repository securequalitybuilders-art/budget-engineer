import { useState } from 'react';
import type { GovernanceRecord } from '../../domain/governance';

export function GovernanceActionsPanel({
  record,
  canReview,
  canApprove,
  canReject,
  reviewReason,
  approveReason,
  rejectReason: rejectDeniedReason,
  onReview,
  onApprove,
  onReject,
}: {
  record: GovernanceRecord;
  canReview: boolean;
  canApprove: boolean;
  canReject: boolean;
  reviewReason?: string;
  approveReason?: string;
  rejectReason?: string;
  onReview: (note?: string) => void;
  onApprove: (note?: string) => void;
  onReject: (reason?: string) => void;
}) {
  const [reviewNote, setReviewNote] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Governance Actions</h3>
      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10 }}>Current state: <strong style={{ color: '#f8fafc' }}>{record.approvalState}</strong></div>
      <div style={{ display: 'grid', gap: 16 }}>
        <ActionBlock label="Send to Review" enabled={canReview} deniedReason={reviewReason}>
          <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Review note (optional)" style={textareaStyle} disabled={!canReview} />
          <button style={buttonStyle(canReview)} onClick={() => onReview(reviewNote)} disabled={!canReview} title={reviewReason ?? 'Send to Review'}>Send to Review</button>
        </ActionBlock>

        <ActionBlock label="Approve" enabled={canApprove} deniedReason={approveReason}>
          <textarea value={approveNote} onChange={(e) => setApproveNote(e.target.value)} placeholder="Approval note (optional)" style={textareaStyle} disabled={!canApprove} />
          <button style={buttonStyle(canApprove)} onClick={() => onApprove(approveNote)} disabled={!canApprove} title={approveReason ?? 'Approve'}>Approve</button>
        </ActionBlock>

        <ActionBlock label="Reject" enabled={canReject} deniedReason={rejectDeniedReason}>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason" style={textareaStyle} disabled={!canReject} />
          <button style={buttonStyle(canReject)} onClick={() => onReject(rejectReason)} disabled={!canReject} title={rejectDeniedReason ?? 'Reject'}>Reject</button>
        </ActionBlock>
      </div>
    </div>
  );
}

function ActionBlock({ label, enabled, deniedReason, children }: { label: string; enabled: boolean; deniedReason?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 600 }}>{label}</span>
        {!enabled && <span style={lockBadge}>🔒 Restricted</span>}
      </div>
      {children}
      {!enabled && deniedReason && <div style={deniedStyle}>{deniedReason}</div>}
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const textareaStyle: React.CSSProperties = { width: '100%', minHeight: 56, background: '#0b1220', color: '#e2e8f0', border: '1px solid #24324b', borderRadius: 10, padding: 10 };
const buttonStyle = (enabled: boolean): React.CSSProperties => ({ background: enabled ? '#0b1220' : '#111827', color: enabled ? '#e2e8f0' : '#64748b', border: '1px solid #24324b', padding: '8px 10px', borderRadius: 10, fontWeight: 600, cursor: enabled ? 'pointer' : 'not-allowed' });
const lockBadge: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#fecaca', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 999, padding: '2px 8px' };
const deniedStyle: React.CSSProperties = { color: '#f59e0b', fontSize: 11, lineHeight: 1.4, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '6px 8px' };
