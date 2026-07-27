import React, { useState, useMemo } from 'react';
import { useProviderStore } from '../../stores/providerStore';
import { Shield, Upload, Plus, CheckCircle2, Clock, XCircle, FileText, Search, Filter, AlertTriangle, Eye, Download } from 'lucide-react';

const CREDENTIAL_TYPES = ['license', 'certification', 'insurance', 'registration', 'qualification', 'accreditation'] as const;
const TYPE_LABELS: Record<string, string> = { license: 'Professional License', certification: 'Certification', insurance: 'Insurance', registration: 'Registration', qualification: 'Qualification', accreditation: 'Accreditation' };

const STATUS_STYLES: Record<string, string> = { active: 'bg-emerald-500/10 text-emerald-400', expired: 'bg-rose-500/10 text-rose-400', revoked: 'bg-red-500/10 text-red-400', pending_renewal: 'bg-amber-500/10 text-amber-400' };
const VERIFIED_STYLES: Record<string, string> = { verified: 'text-emerald-400', unverified: 'text-stone-500', failed: 'text-rose-400' };

export default function CredentialManager({ providerId }: { providerId: string }) {
  const provider = useProviderStore(s => s.providers.find(p => p.id === providerId));
  const addCredential = useProviderStore(s => s.addCredential);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cred, setCred] = useState({ type: 'license' as typeof CREDENTIAL_TYPES[number], title: '', issuingBody: '', number: '', issueDate: '', expiryDate: '', notes: '' });

  if (!provider) return <div className="text-stone-500 p-12 text-center">Select a provider to manage credentials</div>;

  const now = new Date();
  const filteredCreds = useMemo(() => {
    let c = provider.credentials;
    if (search) { const q = search.toLowerCase(); c = c.filter(cr => cr.title.toLowerCase().includes(q) || cr.issuingBody.toLowerCase().includes(q) || cr.number.toLowerCase().includes(q)); }
    if (statusFilter !== 'all') c = c.filter(cr => cr.status === statusFilter);
    return c.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [provider.credentials, search, statusFilter]);

  const getStatusInfo = (cred: typeof provider.credentials[0]) => {
    if (cred.status === 'expired') return { icon: <XCircle size={16} />, label: 'Expired', style: 'bg-rose-500/10 text-rose-400' };
    if (cred.status === 'revoked') return { icon: <AlertTriangle size={16} />, label: 'Revoked', style: 'bg-red-500/10 text-red-400' };
    if (cred.status === 'pending_renewal') return { icon: <Clock size={16} />, label: 'Pending Renewal', style: 'bg-amber-500/10 text-amber-400' };
    if (cred.expiryDate && new Date(cred.expiryDate) < now) return { icon: <Clock size={16} />, label: 'Expiring Soon', style: 'bg-amber-500/10 text-amber-400' };
    return { icon: <CheckCircle2 size={16} />, label: 'Active', style: 'bg-emerald-500/10 text-emerald-400' };
  };

  const handleAdd = () => {
    addCredential(providerId, { ...cred, status: 'active', type: cred.type });
    setCred({ type: 'license', title: '', issuingBody: '', number: '', issueDate: '', expiryDate: '', notes: '' });
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h3 className="text-lg font-semibold text-stone-200 flex items-center gap-2"><Shield className="text-cyan-400" size={20} /> Credentials & Licenses ({provider.credentials.length})</h3></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"><Plus size={16} /> {showForm ? 'Cancel' : 'Add Credential'}</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search credentials..." className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-10 pr-4 py-2 text-sm text-stone-200 outline-none focus:border-stone-600" /></div>
        <div className="flex gap-1 bg-stone-950 border border-stone-800 rounded-lg p-1">
          {[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'expired', label: 'Expired' }, { key: 'pending_renewal', label: 'Pending' }].map(s => (
            <button key={s.key} onClick={() => setStatusFilter(s.key)} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${statusFilter === s.key ? 'bg-stone-800 text-stone-200' : 'text-stone-500 hover:text-stone-300'}`}>{s.label}</button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 space-y-3">
          <h4 className="text-sm font-semibold text-stone-300">New Credential</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><label className="text-xs text-stone-500">Type</label><select value={cred.type} onChange={e => setCred(f => ({ ...f, type: e.target.value as any }))} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none">{CREDENTIAL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></div>
            <div className="col-span-2"><label className="text-xs text-stone-500">Title *</label><input value={cred.title} onChange={e => setCred(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Civil Engineering License, Public Liability Insurance" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-500">Issuing Body *</label><input value={cred.issuingBody} onChange={e => setCred(f => ({ ...f, issuingBody: e.target.value }))} placeholder="e.g. Engineering Council of Zimbabwe" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-500">License / Reg Number</label><input value={cred.number} onChange={e => setCred(f => ({ ...f, number: e.target.value }))} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-500">Issue Date</label><input value={cred.issueDate} onChange={e => setCred(f => ({ ...f, issueDate: e.target.value }))} type="date" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-500">Expiry Date</label><input value={cred.expiryDate} onChange={e => setCred(f => ({ ...f, expiryDate: e.target.value }))} type="date" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div className="col-span-3"><label className="text-xs text-stone-500">Notes</label><textarea value={cred.notes} onChange={e => setCred(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none resize-none" /></div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-stone-900 rounded-lg border border-dashed border-stone-700 cursor-pointer hover:border-stone-600 transition-colors"><Upload size={16} className="text-stone-500" /><span className="text-sm text-stone-400">Upload supporting document (PDF, JPG — max 10MB)</span></div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200">Cancel</button>
            <button onClick={handleAdd} disabled={!cred.title || !cred.issuingBody} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-600 text-white rounded-lg text-sm font-medium transition-colors"><Plus size={14} /> Save Credential</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {filteredCreds.map(c => {
          const statusInfo = getStatusInfo(c);
          return (
            <div key={c.id} className="bg-stone-950 border border-stone-800/50 rounded-lg p-4 flex items-start gap-4 hover:border-stone-700 transition-colors group">
              <div className="p-2.5 bg-stone-900 rounded-lg shrink-0"><FileText size={20} className="text-stone-400" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div><h4 className="font-medium text-stone-200 text-sm">{c.title}</h4><p className="text-xs text-stone-500 mt-0.5">{TYPE_LABELS[c.type]} · {c.issuingBody}</p></div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statusInfo.style}`}>{statusInfo.icon}{statusInfo.label}</span>
                    {c.verificationStatus && <span className={`text-xs ${VERIFIED_STYLES[c.verificationStatus]}`}>{c.verificationStatus === 'verified' ? '✓ Verified' : c.verificationStatus === 'failed' ? '✗ Failed' : '○ Unverified'}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-stone-600">
                  <span>Reg: {c.number || '—'}</span>
                  <span>Issued: {c.issueDate ? new Date(c.issueDate).toLocaleDateString() : '—'}</span>
                  <span>Expires: {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                {c.notes && <p className="text-xs text-stone-600 mt-1 italic">{c.notes}</p>}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                <button className="p-1.5 text-stone-500 hover:text-cyan-400"><Eye size={14} /></button>
                <button className="p-1.5 text-stone-500 hover:text-emerald-400"><Download size={14} /></button>
              </div>
            </div>
          );
        })}
        {filteredCreds.length === 0 && <div className="text-center py-12 text-stone-600 text-sm">{search || statusFilter !== 'all' ? 'No credentials match your filters.' : 'No credentials uploaded yet. Add your licenses, certifications, and insurance.'}</div>}
      </div>
    </div>
  );
}
