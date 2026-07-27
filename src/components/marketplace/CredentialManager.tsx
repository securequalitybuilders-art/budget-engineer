import React, { useState } from 'react';
import { useProviderStore } from '../../stores/providerStore';
import { Shield, Upload, Plus, CheckCircle2, Clock, XCircle, FileText } from 'lucide-react';

const CREDENTIAL_TYPES = ['license', 'certification', 'insurance', 'registration'] as const;

export default function CredentialManager({ providerId }: { providerId: string }) {
  const provider = useProviderStore(s => s.providers.find(p => p.id === providerId));
  const addCredential = useProviderStore(s => s.addCredential);
  const [showForm, setShowForm] = useState(false);
  const [cred, setCred] = useState({ type: 'license' as typeof CREDENTIAL_TYPES[number], title: '', issuingBody: '', number: '', issueDate: '', expiryDate: '' });

  if (!provider) return <div className="text-stone-500 p-8 text-center">Select a provider to manage credentials</div>;

  const statusIcon = (status: string) => {
    if (status === 'active') return <CheckCircle2 size={16} className="text-emerald-500" />;
    if (status === 'expired') return <XCircle size={16} className="text-rose-500" />;
    return <Clock size={16} className="text-amber-500" />;
  };

  const handleAdd = () => {
    addCredential(providerId, { ...cred, status: 'active', type: cred.type });
    setCred({ type: 'license', title: '', issuingBody: '', number: '', issueDate: '', expiryDate: '' });
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Shield className="text-cyan-400" size={20} /><h3 className="text-lg font-semibold text-stone-200">Credentials ({provider.credentials.length})</h3></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"><Plus size={16} /> Add Credential</button>
      </div>
      {showForm && (
        <div className="bg-stone-950 border border-stone-800 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-stone-400">Type</label><select value={cred.type} onChange={e => setCred(f => ({ ...f, type: e.target.value as any }))} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none">{CREDENTIAL_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></div>
            <div><label className="text-xs text-stone-400">Title</label><input value={cred.title} onChange={e => setCred(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Civil Engineering License" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Issuing Body</label><input value={cred.issuingBody} onChange={e => setCred(f => ({ ...f, issuingBody: e.target.value }))} placeholder="e.g. Engineering Council" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">License / Reg Number</label><input value={cred.number} onChange={e => setCred(f => ({ ...f, number: e.target.value }))} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Issue Date</label><input value={cred.issueDate} onChange={e => setCred(f => ({ ...f, issueDate: e.target.value }))} type="date" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Expiry Date</label><input value={cred.expiryDate} onChange={e => setCred(f => ({ ...f, expiryDate: e.target.value }))} type="date" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-stone-900 rounded-lg border border-dashed border-stone-700 cursor-pointer hover:border-stone-600 transition-colors">
            <Upload size={16} className="text-stone-500" /><span className="text-sm text-stone-400">Upload supporting document (optional)</span>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-stone-400 hover:text-stone-200">Cancel</button>
            <button onClick={handleAdd} disabled={!cred.title || !cred.issuingBody} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-600 text-white rounded-lg text-sm font-medium transition-colors">Save Credential</button>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {provider.credentials.map(c => (
          <div key={c.id} className="bg-stone-950 border border-stone-800/50 rounded-lg p-4 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-stone-900 rounded-lg"><FileText size={18} className="text-stone-400" /></div>
              <div><h4 className="font-medium text-stone-200 text-sm">{c.title}</h4><p className="text-xs text-stone-500">{c.issuingBody} — {c.number}</p><p className="text-xs text-stone-600 mt-1">Expires: {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'N/A'}</p></div>
            </div>
            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : c.status === 'expired' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>{statusIcon(c.status)}{c.status}</span>
          </div>
        ))}
        {provider.credentials.length === 0 && <div className="text-center py-8 text-stone-600 text-sm">No credentials uploaded yet. Add your licenses and certifications.</div>}
      </div>
    </div>
  );
}
