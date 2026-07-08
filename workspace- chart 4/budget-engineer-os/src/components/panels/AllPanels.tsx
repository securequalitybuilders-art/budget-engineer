import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { unauthorizedReason, canReview, canApprove } from '../../lib/rbac';
import { exportBoqCsv, exportIfcLikeJson } from '../../lib/exporters';
import { downloadArchive } from '../../lib/archiveExport';
import { downloadZip } from '../../lib/zipPackage';
import { printScheduleHtml } from '../../lib/printExport';
import { exportScheduleCsv } from '../../lib/scheduleExport';
import { generatePdfDossierHtml } from '../../lib/pdfDossier';

export function UserSwitcherPanel() {
  const state = useAppStore();
  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase text-[#d4a574] tracking-wider">Simulated Enterprise Role</span>
        <span className="text-xs px-2 py-0.5 rounded bg-[#1a365d] text-[#7dd3fc] font-semibold">{state.currentUser.role}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {state.users.map(u => (
          <button
            key={u.id}
            onClick={() => state.switchUser(u)}
            className={`py-1.5 px-2 rounded text-xs transition truncate ${state.currentUser.id === u.id ? 'bg-[#06B6D4] text-[#0b1220] font-bold shadow' : 'bg-[#0b1220] text-[#94a3b8] hover:bg-[#24324b] border border-[#24324b]'}`}
          >
            {u.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RbacPanel() {
  const state = useAppStore();
  const actions = ['review', 'approve', 'reject', 'comment'] as const;
  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mb-4">
      <h3 className="font-bold text-[#f8fafc] pb-2 border-b border-[#24324b] mb-3">RBAC Permission Matrix</h3>
      <div className="space-y-2">
        {actions.map(act => {
          const reason = unauthorizedReason(state.currentUser, act);
          return (
            <div key={act} className="bg-[#0b1220] p-2.5 rounded border border-[#24324b] text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold uppercase text-[#e2e8f0]">{act}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${!reason ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/20 text-[#fca5a5]'}`}>
                  {!reason ? 'Allowed' : 'Blocked'}
                </span>
              </div>
              {reason && <p className="text-[#f59e0b] mt-1 text-[11px]">{reason}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GovernanceSummaryPanel() {
  const gov = useAppStore(state => state.governance);
  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mb-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#24324b] mb-3">
        <h3 className="font-bold text-[#f8fafc]">Governance Signoff Status</h3>
        <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${gov.approvalState === 'approved' ? 'bg-[#22c55e] text-[#0b1220]' : gov.approvalState === 'rejected' ? 'bg-[#ef4444] text-[#f8fafc]' : 'bg-[#f59e0b] text-[#0b1220]'}`}>
          {gov.approvalState}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#0b1220] p-2 rounded border border-[#24324b]"><span className="text-[#94a3b8] block">Version</span><span className="font-mono text-[#7dd3fc]">{gov.versionLabel}</span></div>
        <div className="bg-[#0b1220] p-2 rounded border border-[#24324b]"><span className="text-[#94a3b8] block">Owner</span><span className="text-[#f8fafc]">{gov.owner}</span></div>
        {gov.reviewedBy && <div className="bg-[#0b1220] p-2 rounded border border-[#24324b] col-span-2"><span className="text-[#94a3b8] block">Reviewed By</span><span className="text-[#22c55e]">{gov.reviewedBy}</span></div>}
        {gov.approvedBy && <div className="bg-[#0b1220] p-2 rounded border border-[#24324b] col-span-2"><span className="text-[#94a3b8] block">Approved By</span><span className="text-[#22c55e] font-bold">{gov.approvedBy}</span></div>}
        {gov.rejectionReason && <div className="bg-[#ef4444]/10 p-2 rounded border border-[#ef4444]/30 col-span-2"><span className="text-[#fca5a5] font-bold block">Rejection Reason</span><span className="text-[#e2e8f0]">{gov.rejectionReason}</span></div>}
      </div>
    </div>
  );
}

export function GovernanceActionsPanel() {
  const state = useAppStore();
  const [revNote, setRevNote] = useState('');
  const [appNote, setAppNote] = useState('');
  const [rejReason, setRejReason] = useState('');

  const revBlock = unauthorizedReason(state.currentUser, 'review');
  const appBlock = unauthorizedReason(state.currentUser, 'approve');
  const rejBlock = unauthorizedReason(state.currentUser, 'reject');

  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mb-4 space-y-4">
      <h3 className="font-bold text-[#f8fafc] pb-2 border-b border-[#24324b]">Governance Workflow Actions</h3>
      
      {/* Review */}
      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#24324b]">
        <div className="flex justify-between mb-2">
          <span className="text-xs font-bold text-[#7dd3fc]">Submit for QS Review</span>
          {revBlock && <span className="text-[10px] bg-[#ef4444]/20 text-[#fca5a5] px-1.5 py-0.5 rounded">🔒 Restricted</span>}
        </div>
        <input type="text" placeholder="Optional QS review notes..." className="w-full bg-[#111c31] border border-[#24324b] rounded p-1.5 text-xs text-[#e2e8f0] mb-2" value={revNote} onChange={e => setRevNote(e.target.value)} />
        <button disabled={!!revBlock} onClick={() => { state.sendToReview(revNote); setRevNote(''); }} className="w-full py-1.5 bg-[#1a365d] hover:bg-[#24324b] disabled:opacity-50 text-[#7dd3fc] text-xs font-bold rounded transition">Send to Review</button>
        {revBlock && <p className="text-[11px] text-[#f59e0b] mt-1">{revBlock}</p>}
      </div>

      {/* Approve */}
      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#24324b]">
        <div className="flex justify-between mb-2">
          <span className="text-xs font-bold text-[#22c55e]">Approve Scheme BOQ</span>
          {appBlock && <span className="text-[10px] bg-[#ef4444]/20 text-[#fca5a5] px-1.5 py-0.5 rounded">🔒 Restricted</span>}
        </div>
        <input type="text" placeholder="Signoff approval notes..." className="w-full bg-[#111c31] border border-[#24324b] rounded p-1.5 text-xs text-[#e2e8f0] mb-2" value={appNote} onChange={e => setAppNote(e.target.value)} />
        <button disabled={!!appBlock} onClick={() => { state.approveProject(appNote); setAppNote(''); }} className="w-full py-1.5 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-[#0b1220] text-xs font-bold rounded transition">Signoff & Approve Project</button>
        {appBlock && <p className="text-[11px] text-[#f59e0b] mt-1">{appBlock}</p>}
      </div>

      {/* Reject */}
      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#24324b]">
        <div className="flex justify-between mb-2">
          <span className="text-xs font-bold text-[#ef4444]">Reject Scheme</span>
          {rejBlock && <span className="text-[10px] bg-[#ef4444]/20 text-[#fca5a5] px-1.5 py-0.5 rounded">🔒 Restricted</span>}
        </div>
        <input type="text" placeholder="Required rejection reason..." className="w-full bg-[#111c31] border border-[#24324b] rounded p-1.5 text-xs text-[#e2e8f0] mb-2" value={rejReason} onChange={e => setRejReason(e.target.value)} />
        <button disabled={!!rejBlock} onClick={() => { state.rejectProject(rejReason); setRejReason(''); }} className="w-full py-1.5 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-[#f8fafc] text-xs font-bold rounded transition">Reject Project</button>
        {rejBlock && <p className="text-[11px] text-[#f59e0b] mt-1">{rejBlock}</p>}
      </div>
    </div>
  );
}

export function GovernanceCommentsPanel() {
  const comms = useAppStore(state => state.governance.comments);
  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mb-4">
      <h3 className="font-bold text-[#f8fafc] pb-2 border-b border-[#24324b] mb-3">Signoff Audit Trail ({comms.length})</h3>
      <div className="space-y-2.5 max-h-48 overflow-y-auto">
        {comms.slice().reverse().map(c => (
          <div key={c.id} className="bg-[#0b1220] p-2.5 rounded border border-[#24324b] text-xs">
            <div className="flex justify-between text-[#94a3b8] mb-1">
              <span className="font-bold text-[#d4a574]">{c.author} ({c.role || 'user'})</span>
              <span>{new Date(c.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-[#e2e8f0]">{c.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectWorkspacePanel() {
  const state = useAppStore();
  const [name, setName] = useState('');
  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[#f8fafc]">Project Workspace</h3>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0b1220] text-[#06B6D4]">{state.projects.length} schemes</span>
      </div>
      <div className="flex gap-2 mb-3">
        <input type="text" placeholder="New project name..." className="flex-1 bg-[#0b1220] border border-[#24324b] rounded px-2.5 py-1 text-xs text-[#f8fafc]" value={name} onChange={e => setName(e.target.value)} />
        <button onClick={() => { if(name) { state.createProject(name, 'Enterprise scheme'); setName(''); } }} className="px-3 py-1 bg-[#06B6D4] text-[#0b1220] font-bold text-xs rounded">+ Create</button>
      </div>
      <div className="space-y-1.5 max-h-36 overflow-y-auto">
        {state.projects.map(p => (
          <div key={p.id} className={`flex items-center justify-between p-2 rounded text-xs border ${state.activeProjectId === p.id ? 'bg-[#1a365d] border-[#06B6D4] text-[#f8fafc] font-bold' : 'bg-[#0b1220] border-[#24324b] text-[#94a3b8]'}`}>
            <span className="truncate flex-1 cursor-pointer" onClick={() => state.switchProject(p.id)}>{p.name}</span>
            {!p.isArchived && state.activeProjectId !== p.id && <button onClick={() => state.archiveProject(p.id)} className="text-[10px] text-[#ef4444] ml-2">Archive</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MultiProjectComparePanel() {
  const state = useAppStore();
  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mb-4">
      <h3 className="font-bold text-[#f8fafc] pb-2 border-b border-[#24324b] mb-3">Multi-Project Benchmarking</h3>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="text-[#94a3b8] block mb-1">Scheme A (Left)</label>
          <select className="w-full bg-[#0b1220] border border-[#24324b] rounded p-1.5 text-[#f8fafc]" value={state.compareLeftProjectId} onChange={e => state.setCompareLeftProject(e.target.value)}>
            {state.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[#94a3b8] block mb-1">Scheme B (Right)</label>
          <select className="w-full bg-[#0b1220] border border-[#24324b] rounded p-1.5 text-[#f8fafc]" value={state.compareRightProjectId} onChange={e => state.setCompareRightProject(e.target.value)}>
            {state.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

export function ExportPanel() {
  const state = useAppStore();
  function dlZip() {
    downloadZip('budget-engineer-package.zip', {
      'boq.csv': exportBoqCsv(state.boq),
      'model.json': exportIfcLikeJson(state.bimModel),
      'README.txt': 'Budget Engineer Studio Deliverables Package'
    });
  }

  function dlPdfHtml() {
    const html = generatePdfDossierHtml(state.cadDoc, state.bimModel, state.boq, state.governance, state.snapshots);
    downloadArchive(`${state.cadDoc.name.toLowerCase().replace(/\s+/g, '-')}-dossier.html`, html);
  }

  function printPdfDossier() {
    const html = generatePdfDossierHtml(state.cadDoc, state.bimModel, state.boq, state.governance, state.snapshots);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mb-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#24324b] mb-3">
        <h3 className="font-bold text-[#f8fafc]">Deliverables Export Package</h3>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#06B6D4]/20 text-[#7dd3fc] font-bold">Stage 31 PDF</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={printPdfDossier} className="col-span-2 py-2.5 bg-[#06B6D4] hover:bg-[#7dd3fc] text-[#0b1220] text-xs font-extrabold rounded-lg shadow transition flex items-center justify-center gap-2">
          🖨 Print / Save Executive PDF Dossier
        </button>
        <button onClick={dlPdfHtml} className="py-2 bg-[#1a365d] hover:bg-[#24324b] text-[#7dd3fc] text-xs font-semibold rounded">Dossier HTML</button>
        <button onClick={() => downloadArchive('boq.csv', exportBoqCsv(state.boq))} className="py-2 bg-[#1a365d] hover:bg-[#24324b] text-[#7dd3fc] text-xs font-semibold rounded">BOQ CSV</button>
        <button onClick={() => downloadArchive('model.json', exportIfcLikeJson(state.bimModel))} className="py-2 bg-[#1a365d] hover:bg-[#24324b] text-[#7dd3fc] text-xs font-semibold rounded">IFC JSON</button>
        <button onClick={dlZip} className="py-2 bg-[#8B5CF6] hover:bg-[#a78bfa] text-[#f8fafc] text-xs font-bold rounded shadow">Bundled ZIP</button>
      </div>
    </div>
  );
}

export function StandardsManifestPanel() {
  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mb-4 text-xs">
      <h3 className="font-bold text-[#f8fafc] pb-2 border-b border-[#24324b] mb-2">Standards & COBie Manifest</h3>
      <div className="space-y-1 text-[#94a3b8]">
        <p>• <strong className="text-[#e2e8f0]">IFC4 SPP:</strong> Swept-solid solids + boolean openings</p>
        <p>• <strong className="text-[#e2e8f0]">COBie:</strong> Space schedule & asset inventory mapped</p>
        <p>• <strong className="text-[#e2e8f0]">CWICR:</strong> Zimbabwe 55k cost catalog standard</p>
      </div>
    </div>
  );
}

export function ProjectHistoryPanel() {
  const txs = useAppStore(state => state.transactions);
  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mb-4">
      <h3 className="font-bold text-[#f8fafc] pb-2 border-b border-[#24324b] mb-3">Project Audit Timeline ({txs.length})</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
        {txs.slice(0, 10).map(t => (
          <div key={t.id} className="bg-[#0b1220] p-2 rounded border border-[#24324b]">
            <div className="flex justify-between text-[#d4a574] font-semibold"><span>{t.action}</span><span>{new Date(t.timestamp).toLocaleTimeString()}</span></div>
            <p className="text-[#94a3b8] mt-0.5">{t.details}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RoomSchedulePanel() {
  const boq = useAppStore(state => state.boq);
  function printHtml() {
    const html = printScheduleHtml(boq);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }
  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mb-4">
      <div className="flex justify-between items-center pb-2 border-b border-[#24324b] mb-3">
        <h3 className="font-bold text-[#f8fafc]">Room Schedule & Cost Takeoff</h3>
        <div className="flex gap-2">
          <button onClick={() => downloadArchive('schedule.csv', exportScheduleCsv(boq))} className="px-2 py-1 bg-[#1a365d] text-[#7dd3fc] rounded text-xs font-semibold">CSV</button>
          <button onClick={printHtml} className="px-2 py-1 bg-[#06B6D4] text-[#0b1220] rounded text-xs font-bold">Print HTML</button>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[#94a3b8] border-b border-[#24324b]"><th className="pb-1">Category</th><th className="pb-1">Qty</th><th className="pb-1 text-right">Total</th></tr>
        </thead>
        <tbody className="divide-y divide-[#24324b]">
          {boq.items.map(i => (
            <tr key={i.id}><td className="py-1.5 font-medium text-[#f8fafc]">{i.category}</td><td className="py-1.5 text-[#94a3b8]">{i.quantity} {i.unit}</td><td className="py-1.5 font-mono text-right text-[#06B6D4]">${i.total.toFixed(2)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProjectSnapshotsPanel() {
  const state = useAppStore();
  const [sName, setSName] = useState('');
  return (
    <div className="bg-[#111c31] border border-[#24324b] rounded-xl p-4 text-[#e2e8f0] shadow-lg mb-4">
      <h3 className="font-bold text-[#f8fafc] pb-2 border-b border-[#24324b] mb-3">Version Snapshots ({state.snapshots.length})</h3>
      <div className="flex gap-2 mb-3">
        <input type="text" placeholder="Snapshot version name..." className="flex-1 bg-[#0b1220] border border-[#24324b] rounded px-2 py-1 text-xs text-[#f8fafc]" value={sName} onChange={e => setSName(e.target.value)} />
        <button onClick={() => { if(sName){ state.createSnapshot(sName); setSName(''); } }} className="px-3 py-1 bg-[#8B5CF6] text-[#f8fafc] font-bold text-xs rounded">+ Save</button>
      </div>
      <div className="space-y-1.5 max-h-36 overflow-y-auto">
        {state.snapshots.map(s => (
          <div key={s.id} className="flex justify-between items-center bg-[#0b1220] p-2 rounded text-xs border border-[#24324b]">
            <div><span className="font-bold text-[#f8fafc] block">{s.name}</span><span className="text-[10px] text-[#94a3b8]">${s.boq.summary.grandTotal.toFixed(2)}</span></div>
            <button onClick={() => state.restoreSnapshot(s.id)} className="px-2 py-1 bg-[#1a365d] hover:bg-[#06B6D4] hover:text-[#0b1220] text-[#7dd3fc] rounded font-semibold transition">Restore</button>
          </div>
        ))}
      </div>
    </div>
  );
}
