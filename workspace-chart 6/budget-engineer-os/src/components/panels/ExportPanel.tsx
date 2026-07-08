import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { buildBoqCsv, buildBoqDossierHtml, downloadText, openDossierForPrint } from '../../lib/boqExport';
import { buildPlanSvg } from '../../lib/planSvg';
import { designFingerprint } from '../../lib/fingerprint';
import { designMetrics, summarizeChanges } from '../../lib/designMetrics';

export function ExportPanel() {
  const boq = useAppStore((s) => s.boq);
  const cad = useAppStore((s) => s.cad);
  const bim = useAppStore((s) => s.bim);
  const project = useAppStore((s) => s.project);
  const currentRevision = useAppStore((s) => s.currentRevision);
  const sectionConfig = useAppStore((s) => s.sectionConfig);
  const revisionLog = useAppStore((s) => s.revisionLog);
  const bumpRevision = useAppStore((s) => s.bumpRevision);
  const [status, setStatus] = useState<string | null>(null);
  const [revNote, setRevNote] = useState('');

  if (!boq || !cad || !bim) return null;

  const safe = (project?.name ?? cad.name).replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  // Stage 61: has the design changed since the last issued revision?
  const currentFp = designFingerprint(cad, boq);
  const lastIssued = revisionLog.length ? revisionLog[revisionLog.length - 1] : null;
  const designDirty = !!lastIssued?.fingerprint && lastIssued.fingerprint !== currentFp;

  // Stage 62: what changed since the last issue?
  const changes = designDirty && lastIssued?.metrics
    ? summarizeChanges(lastIssued.metrics, designMetrics(cad, bim, boq))
    : [];

  const exportCsv = () => {
    downloadText(`boq-${safe}.csv`, buildBoqCsv(boq), 'text/csv');
    setStatus(`Exported boq-${safe}.csv (${boq.currency})`);
  };
  const exportHtml = () => {
    downloadText(`boq-${safe}-rev${currentRevision}.html`, buildBoqDossierHtml(boq, cad, project, currentRevision, sectionConfig ?? undefined), 'text/html');
    setStatus(`Exported boq-${safe}-rev${currentRevision}.html`);
  };
  const printPdf = () => {
    openDossierForPrint(buildBoqDossierHtml(boq, cad, project, currentRevision, sectionConfig ?? undefined));
    setStatus('Opened printable dossier — use “Save as PDF”.');
  };
  const exportSvg = () => {
    downloadText(`plan-${safe}.svg`, buildPlanSvg(cad, cad.floors[0]?.id, {
      project: project?.name ?? cad.name,
      drawing: `Floor Plan — ${cad.floors[0]?.name ?? 'Ground Floor'}`,
      date: new Date().toISOString().slice(0, 10), revision: currentRevision,
    }), 'image/svg+xml');
    setStatus(`Exported plan-${safe}.svg`);
  };
  const bump = () => {
    void bumpRevision(revNote.trim());
    setStatus(`Issued new revision: ${revNote.trim() || (changes.length ? changes.map((c) => c.text).join(', ') : 'Design revision')}`);
    setRevNote('');
  };

  return (
    <div className="panel">
      <h3>Stage 47 · Export BOQ</h3>
      <p className="sub">Currency-aware deliverables · {boq.currency}</p>
      <div className="btn-row">
        <button className="primary" onClick={printPdf}>🖨 Print / Save PDF</button>
        <button onClick={exportCsv}>📥 CSV</button>
        <button onClick={exportHtml}>📄 HTML Dossier</button>
        <button onClick={exportSvg}>🗺 Plan SVG</button>
      </div>
      {status && <p className="note" style={{ marginTop: 10, color: '#22c55e' }}>{status}</p>}

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #24324b' }}>
        {designDirty ? (
          <div style={{ background: 'rgba(245,158,11,.12)', border: '1px solid #f59e0b', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>⚠ Design changed since Rev {currentRevision}.</span>
            <span className="note" style={{ marginLeft: 6 }}>Issue a new revision to keep the drawing set current.</span>
            {changes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {changes.map((c) => (
                  <span key={c.label} className="tag" style={{ color: c.direction === 'up' ? '#22c55e' : '#fca5a5', borderColor: c.direction === 'up' ? '#22c55e' : '#ef4444' }}>
                    {c.text}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="note" style={{ marginBottom: 10, color: '#22c55e' }}>✓ Drawings are up to date with the issued Rev {currentRevision}.</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="note">Current issue:</span>
          <span className="tag" style={{ color: '#d4a574', borderColor: '#d4a574' }}>Rev {currentRevision}</span>
          <span className="note">· {revisionLog.length} revision{revisionLog.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="btn-row">
          <input
            value={revNote}
            onChange={(e) => setRevNote(e.target.value)}
            placeholder="Reason (leave blank to auto-fill from changes)"
            style={{ flex: 1, minWidth: 160 }}
          />
          <button className={designDirty ? 'primary' : ''} onClick={bump}>↑ Issue Rev</button>
        </div>
        {revisionLog.length > 0 && (
          <table style={{ marginTop: 10 }}>
            <thead><tr><th className="num">Rev</th><th>Date</th><th>Description</th></tr></thead>
            <tbody>
              {[...revisionLog].reverse().slice(0, 5).map((r) => (
                <tr key={r.rev}><td className="num">{r.rev}</td><td>{r.date}</td><td>{r.note}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="note" style={{ marginTop: 8 }}>
        Exports embed the floor plans + section + BOQ and are stamped with the current
        revision. Issuing a revision records a real change in the audit log and bumps every
        sheet to the next rev letter. Active region: {boq.currency}.
      </p>
    </div>
  );
}
