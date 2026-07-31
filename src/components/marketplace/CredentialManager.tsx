import React, { useState, useMemo } from 'react';
import { useProviderStore } from '../../stores/providerStore';
import type { Credential } from '../../domain/marketplace';
import { Shield, Upload, Plus, CheckCircle2, Clock, XCircle, FileText, Search, AlertTriangle, Eye, Download, Star, Award, RefreshCw, Calendar, CheckSquare, Square, Trash2, Bell, UserCheck } from 'lucide-react';

const CREDENTIAL_TYPES = ['license', 'certification', 'insurance', 'registration', 'qualification', 'accreditation'] as const;
const TYPE_LABELS: Record<string, string> = { license: 'Professional License', certification: 'Certification', insurance: 'Insurance', registration: 'Registration', qualification: 'Qualification', accreditation: 'Accreditation' };
const TYPE_ICONS: Record<string, React.ReactNode> = { license: <Award size={18} />, certification: <Star size={18} />, insurance: <Shield size={18} />, registration: <FileText size={18} />, qualification: <Award size={18} />, accreditation: <CheckCircle2 size={18} /> };

const ISSUING_BODIES = ['Engineering Council of Zimbabwe', 'Zimbabwe Institution of Engineers', 'Construction Industry Federation of Zimbabwe', 'National Social Security Authority', 'Environmental Management Agency', 'Ministry of Local Government', 'Standards Association of Zimbabwe', 'Public Procurement and Disposal of Public Assets'];

export default function CredentialManager({ providerId }: { providerId: string }) {
  const provider = useProviderStore(s => s.providers.find(p => p.id === providerId));
  const addCredential = useProviderStore(s => s.addCredential);
  const updateCredential = useProviderStore(s => s.updateCredential);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [cred, setCred] = useState({ type: 'license' as typeof CREDENTIAL_TYPES[number], title: '', issuingBody: '', number: '', issueDate: '', expiryDate: '', notes: '' });

  const now = useMemo(() => new Date(), []);
  const filteredCreds = useMemo(() => {
    let c = [...(provider?.credentials ?? [])];
    if (search) { const q = search.toLowerCase(); c = c.filter(cr => cr.title.toLowerCase().includes(q) || cr.issuingBody.toLowerCase().includes(q) || cr.number.toLowerCase().includes(q) || cr.notes?.toLowerCase().includes(q)); }
    if (statusFilter !== 'all') c = c.filter(cr => cr.status === statusFilter);
    if (typeFilter !== 'all') c = c.filter(cr => cr.type === typeFilter);
    return c.sort((a, b) => new Date(b.issueDate || 0).getTime() - new Date(a.issueDate || 0).getTime());
  }, [provider?.credentials, search, statusFilter, typeFilter]);

  const getStatusInfo = (cred: Credential) => {
    if (cred.status === 'expired') return { icon: <XCircle size={16} />, label: 'Expired', style: 'bg-rose-500/10 text-rose-400' };
    if (cred.status === 'revoked') return { icon: <AlertTriangle size={16} />, label: 'Revoked', style: 'bg-red-500/10 text-red-400' };
    if (cred.status === 'pending_renewal') return { icon: <Clock size={16} />, label: 'Pending Renewal', style: 'bg-amber-500/10 text-amber-400' };
    if (cred.expiryDate) {
      const daysUntilExpiry = Math.ceil((new Date(cred.expiryDate).getTime() - now.getTime()) / 86400000);
      if (daysUntilExpiry < 0) return { icon: <XCircle size={16} />, label: 'Expired', style: 'bg-rose-500/10 text-rose-400' };
      if (daysUntilExpiry <= 90) return { icon: <Clock size={16} />, label: `Expires in ${daysUntilExpiry}d`, style: 'bg-amber-500/10 text-amber-400' };
    }
    return { icon: <CheckCircle2 size={16} />, label: 'Active', style: 'bg-emerald-500/10 text-emerald-400' };
  };

  const handleAdd = () => { addCredential(providerId, { ...cred, status: 'active' }); setCred({ type: 'license', title: '', issuingBody: '', number: '', issueDate: '', expiryDate: '', notes: '' }); setShowForm(false); };

  const toggleSelect = (id: string) => { setSelectedItems(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const bulkDelete = () => { selectedItems.forEach(id => updateCredential(providerId, id, { status: 'revoked' })); setSelectedItems(new Set()); setSelectMode(false); };
  const bulkVerify = () => { selectedItems.forEach(id => updateCredential(providerId, id, { verificationStatus: 'verified', verifiedAt: new Date().toISOString(), verifiedBy: 'provider' })); setSelectedItems(new Set()); setSelectMode(false); };

  const activeCount = (provider?.credentials ?? []).filter(c => c.status === 'active').length;
  const expiringCount = (provider?.credentials ?? []).filter(c => c.status === 'active' && c.expiryDate && Math.ceil((new Date(c.expiryDate).getTime() - now.getTime()) / 86400000) <= 90).length;
  const expiredCount = (provider?.credentials ?? []).filter(c => c.status === 'expired' || (c.expiryDate && Math.ceil((new Date(c.expiryDate).getTime() - now.getTime()) / 86400000) < 0)).length;
  const verifiedCount = (provider?.credentials ?? []).filter(c => c.verificationStatus === 'verified').length;

  const renewalTimeline = useMemo(() => {
    const items = (provider?.credentials ?? []).filter(c => c.expiryDate).map(c => ({
      ...c,
      daysUntilExpiry: Math.ceil((new Date(c.expiryDate).getTime() - now.getTime()) / 86400000),
    })).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    return items;
  }, [provider?.credentials, now]);

  const verificationStats = useMemo(() => ({
    verified: (provider?.credentials ?? []).filter(c => c.verificationStatus === 'verified').length,
    failed: (provider?.credentials ?? []).filter(c => c.verificationStatus === 'failed').length,
    unverified: (provider?.credentials ?? []).filter(c => !c.verificationStatus || c.verificationStatus === 'unverified').length,
  }), [provider?.credentials]);

  if (!provider) return <div className="text-stone-400 p-12 text-center">Select a provider to manage credentials</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-4"><div className="text-stone-400 text-xs mb-1">Total</div><div className="text-2xl font-bold text-stone-200">{provider.credentials.length}</div></div>
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-4"><div className="text-stone-400 text-xs mb-1">Active</div><div className="text-2xl font-bold text-emerald-400">{activeCount}</div></div>
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-4"><div className="text-stone-400 text-xs mb-1">Expiring Soon</div><div className={`text-2xl font-bold ${expiringCount > 0 ? 'text-amber-400' : 'text-stone-400'}`}>{expiringCount}</div></div>
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-4"><div className="text-stone-400 text-xs mb-1">Expired</div><div className={`text-2xl font-bold ${expiredCount > 0 ? 'text-rose-400' : 'text-stone-400'}`}>{expiredCount}</div></div>
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-4"><div className="text-stone-400 text-xs mb-1">Verified</div><div className="text-2xl font-bold text-cyan-400">{verifiedCount}</div></div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
          {verificationStats.verified > 0 && <div className="h-full bg-emerald-500 float-left transition-all" style={{ width: `${(verificationStats.verified / provider.credentials.length) * 100}%` }} />}
          {verificationStats.failed > 0 && <div className="h-full bg-rose-500 float-left transition-all" style={{ width: `${(verificationStats.failed / provider.credentials.length) * 100}%` }} />}
          {verificationStats.unverified > 0 && <div className="h-full bg-stone-600 float-left transition-all" style={{ width: `${(verificationStats.unverified / provider.credentials.length) * 100}%` }} />}
        </div>
        <div className="flex gap-3 text-xs text-stone-400"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{verificationStats.verified} Verified</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" />{verificationStats.failed} Failed</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-stone-600" />{verificationStats.unverified} Unverified</span></div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-stone-200 flex items-center gap-2"><Shield className="text-cyan-400" size={20} /> Credentials & Licenses</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTimeline(!showTimeline)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${showTimeline ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-stone-400 hover:text-stone-200 bg-stone-950 border border-stone-800'}`}><Calendar size={12} /> Renewal Calendar</button>
          <button onClick={() => { setSelectMode(!selectMode); setSelectedItems(new Set()); }} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${selectMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-stone-400 hover:text-stone-200 bg-stone-950 border border-stone-800'}`}><CheckSquare size={12} /> Select</button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"><Plus size={16} /> {showForm ? 'Cancel' : 'Add Credential'}</button>
        </div>
      </div>

      {showTimeline && (
        <div className="bg-stone-950 border border-stone-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4"><h4 className="text-sm font-semibold text-stone-300 flex items-center gap-2"><Calendar size={16} className="text-cyan-400" /> Renewal Timeline</h4><button onClick={() => setShowTimeline(false)} aria-label="Close renewal timeline" className="text-stone-400 hover:text-stone-300"><XCircle size={14} /></button></div>
          <div className="relative">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-stone-800" />
            <div className="space-y-0">
              {renewalTimeline.length === 0 && <div className="text-center py-6 text-stone-400 text-sm">No credentials with expiry dates</div>}
              {renewalTimeline.slice(0, 20).map(c => {
                const isUrgent = c.daysUntilExpiry <= 30;
                const isWarning = c.daysUntilExpiry <= 90 && c.daysUntilExpiry > 30;
                return (
                  <div key={c.id} className="flex items-start gap-4 py-2.5">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 z-10 ${isUrgent ? 'border-rose-500 bg-rose-500/10' : isWarning ? 'border-amber-500 bg-amber-500/10' : 'border-emerald-500 bg-emerald-500/10'}`}>
                      <div className={`w-2 h-2 rounded-full ${isUrgent ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0"><div className="text-sm text-stone-200">{c.title}</div><div className="text-xs text-stone-400">{c.issuingBody}</div></div>
                    <div className={`text-xs font-medium shrink-0 ${isUrgent ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-stone-400'}`}>{c.daysUntilExpiry <= 0 ? 'Expired' : `${c.daysUntilExpiry}d remaining`}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, issuer, number..." aria-label="Search credentials" className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-10 pr-4 py-2 text-sm text-stone-200 outline-none focus:border-stone-600" /></div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-400 outline-none"><option value="all">All Types</option>{CREDENTIAL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select>
        <div className="flex gap-1 bg-stone-950 border border-stone-800 rounded-lg p-1">
          {[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'expired', label: 'Expired' }, { key: 'pending_renewal', label: 'Renewal' }].map(s => (
            <button key={s.key} onClick={() => setStatusFilter(s.key)} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${statusFilter === s.key ? 'bg-stone-800 text-stone-200' : 'text-stone-400 hover:text-stone-300'}`}>{s.label}</button>
          ))}
        </div>
      </div>

      {selectMode && selectedItems.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
          <span className="text-sm text-stone-300">{selectedItems.size} selected</span>
          <button onClick={bulkVerify} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 rounded-lg transition-colors"><UserCheck size={12} /> Mark Verified</button>
          <button onClick={bulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg transition-colors"><Trash2 size={12} /> Revoke</button>
          <button onClick={() => { setSelectedItems(new Set()); setSelectMode(false); }} className="text-xs text-stone-400 hover:text-stone-300 ml-auto">Cancel</button>
        </div>
      )}

      {showForm && (
        <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between"><h4 className="text-sm font-semibold text-stone-300">Add New Credential</h4><button onClick={() => setShowForm(false)} aria-label="Close credential form" className="text-stone-400 hover:text-stone-300"><XCircle size={16} /></button></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><label className="text-xs text-stone-400">Type</label><select value={cred.type} onChange={e => setCred(f => ({ ...f, type: e.target.value as typeof CREDENTIAL_TYPES[number] }))} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none">{CREDENTIAL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></div>
            <div className="col-span-2"><label className="text-xs text-stone-400">Title *</label><input value={cred.title} onChange={e => setCred(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Civil Engineering License (CEng)" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div>
              <label className="text-xs text-stone-400">Issuing Body *</label>
              <div className="relative"><input value={cred.issuingBody} onChange={e => setCred(f => ({ ...f, issuingBody: e.target.value }))} placeholder="e.g. Engineering Council of Zimbabwe" list="issuing-bodies" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /><datalist id="issuing-bodies">{ISSUING_BODIES.map(b => <option key={b} value={b} />)}</datalist></div>
            </div>
            <div><label className="text-xs text-stone-400">License / Reference Number</label><input value={cred.number} onChange={e => setCred(f => ({ ...f, number: e.target.value }))} placeholder="e.g. ECZ/2024/12345" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Issue Date</label><input value={cred.issueDate} onChange={e => setCred(f => ({ ...f, issueDate: e.target.value }))} type="date" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Expiry Date</label><input value={cred.expiryDate} onChange={e => setCred(f => ({ ...f, expiryDate: e.target.value }))} type="date" className={`w-full mt-1 bg-stone-900 border ${cred.expiryDate && new Date(cred.expiryDate) < new Date() ? 'border-rose-500/50' : 'border-stone-800'} rounded px-3 py-2 text-sm text-stone-200 outline-none`} /></div>
            <div className="col-span-3"><label className="text-xs text-stone-400">Notes</label><textarea value={cred.notes} onChange={e => setCred(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none resize-none" placeholder="Any additional information about this credential..." /></div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-stone-900 rounded-lg border border-dashed border-stone-700 cursor-pointer hover:border-stone-600 transition-colors group"><Upload size={16} className="text-stone-400 group-hover:text-cyan-400 transition-colors" /><span className="text-sm text-stone-400 group-hover:text-stone-300 transition-colors">Upload scanned document (PDF, JPG, PNG — max 10MB)</span></div>
          <div className="flex gap-2 justify-end pt-1"><button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200">Cancel</button><button onClick={handleAdd} disabled={!cred.title || !cred.issuingBody} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-400 text-white rounded-lg text-sm font-medium transition-colors"><Plus size={14} /> Save Credential</button></div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {filteredCreds.map(c => {
          const statusInfo = getStatusInfo(c);
          const isExpanded = showDetail === c.id;
          const isSelected = selectedItems.has(c.id);
          return (
            <div key={c.id} className={`bg-stone-950 border ${isExpanded ? 'border-stone-700' : 'border-stone-800/50'} rounded-lg transition-all hover:border-stone-700 ${isSelected ? 'ring-1 ring-cyan-500/20 border-cyan-500/50' : ''}`}>
              <div className="p-4 flex items-start gap-4 cursor-pointer" onClick={() => { if (!selectMode) setShowDetail(isExpanded ? null : c.id); }}>
                {selectMode && <button onClick={(e) => { e.stopPropagation(); toggleSelect(c.id); }} aria-label={isSelected ? 'Deselect credential' : 'Select credential'} className="mt-1">{isSelected ? <CheckSquare size={16} className="text-cyan-400" /> : <Square size={16} className="text-stone-400" />}</button>}
                <div className={`p-2.5 rounded-lg shrink-0 ${c.verificationStatus === 'verified' ? 'bg-emerald-500/10' : 'bg-stone-900'}`}>{TYPE_ICONS[c.type] ?? <FileText size={18} />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div><h4 className="font-medium text-stone-200 text-sm">{c.title}</h4><p className="text-xs text-stone-400 mt-0.5">{TYPE_LABELS[c.type]} · {c.issuingBody}</p></div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statusInfo.style}`}>{statusInfo.icon}{statusInfo.label}</span>
                      {c.verificationStatus && <span className={`text-xs px-2 py-1 rounded-full ${c.verificationStatus === 'verified' ? 'bg-emerald-500/10 text-emerald-400' : c.verificationStatus === 'failed' ? 'bg-rose-500/10 text-rose-400' : 'bg-stone-800 text-stone-400'}`}>{c.verificationStatus === 'verified' ? '✓ Verified' : c.verificationStatus === 'failed' ? '✗ Failed' : 'Unverified'}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-stone-400">
                    <span className="flex items-center gap-1"><FileText size={10} />Ref: {c.number || '—'}</span>
                    <span className="flex items-center gap-1"><Calendar size={10} />Issued: {c.issueDate ? new Date(c.issueDate).toLocaleDateString() : '—'}</span>
                    <span className="flex items-center gap-1"><Clock size={10} />Expires: {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'N/A'}</span>
                    {c.verifiedAt && <span className="flex items-center gap-1"><UserCheck size={10} />Verified: {new Date(c.verifiedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-stone-800 p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  {c.notes && <div className="bg-stone-900 rounded-lg p-3"><p className="text-xs text-stone-400">{c.notes}</p></div>}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-stone-900 rounded-lg p-3"><div className="text-xs text-stone-400">Type</div><div className="text-sm text-stone-200 mt-0.5">{TYPE_LABELS[c.type]}</div></div>
                    <div className="bg-stone-900 rounded-lg p-3"><div className="text-xs text-stone-400">Issuing Body</div><div className="text-sm text-stone-200 mt-0.5">{c.issuingBody}</div></div>
                    <div className="bg-stone-900 rounded-lg p-3"><div className="text-xs text-stone-400">Reference</div><div className="text-sm text-stone-200 mt-0.5 font-mono">{c.number || '—'}</div></div>
                    <div className="bg-stone-900 rounded-lg p-3"><div className="text-xs text-stone-400">Verification</div><div className={`text-sm mt-0.5 ${c.verificationStatus === 'verified' ? 'text-emerald-400' : c.verificationStatus === 'failed' ? 'text-rose-400' : 'text-amber-400'}`}>{c.verificationStatus ?? 'Unverified'}</div></div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 bg-stone-900 rounded-lg transition-colors"><Eye size={14} /> View Document</button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 bg-stone-900 rounded-lg transition-colors"><Download size={14} /> Download</button>
                    {c.verificationStatus !== 'verified' && <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 rounded-lg transition-colors"><RefreshCw size={14} /> Request Verification</button>}
                    {c.verificationStatus === 'verified' && <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-500/10 rounded-lg transition-colors"><CheckCircle2 size={14} /> Verified by {c.verifiedBy ?? 'system'}</button>}
                  </div>
                  {c.expiryDate && (
                    <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${new Date(c.expiryDate) < now ? 'bg-rose-500/10 text-rose-400' : Math.ceil((new Date(c.expiryDate).getTime() - now.getTime()) / 86400000) <= 90 ? 'bg-amber-500/10 text-amber-400' : 'bg-stone-900 text-stone-400'}`}>
                      <Bell size={12} />
                      {new Date(c.expiryDate) < now ? 'This credential has expired. Renew immediately to maintain compliance.' : Math.ceil((new Date(c.expiryDate).getTime() - now.getTime()) / 86400000) <= 90 ? `Expiring in ${Math.ceil((new Date(c.expiryDate).getTime() - now.getTime()) / 86400000)} days — renew soon to avoid lapse.` : 'Credential is current and valid.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filteredCreds.length === 0 && (
          <div className="text-center py-16 text-stone-400"><Shield size={48} className="mx-auto mb-4 text-stone-700" /><p className="text-sm">{search || statusFilter !== 'all' || typeFilter !== 'all' ? 'No credentials match your filters.' : 'No credentials uploaded yet. Add your professional licenses, certifications, and insurance documents to build trust with clients.'}</p></div>
        )}
      </div>
    </div>
  );
}
