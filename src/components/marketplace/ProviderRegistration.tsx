import React, { useState } from 'react';
import { useProviderStore } from '../../stores/providerStore';
import { ProviderType } from '../../domain/marketplace';
import { Building2, Briefcase, MapPin, Package, ChevronRight, ChevronLeft, Check } from 'lucide-react';

const PROVIDER_TYPES: { value: ProviderType; label: string; icon: React.ReactNode }[] = [
  { value: 'contractor', label: 'Contractor', icon: <Building2 size={20} /> },
  { value: 'supplier', label: 'Material Supplier', icon: <Package size={20} /> },
  { value: 'professional', label: 'Professional (Arch/Eng)', icon: <Briefcase size={20} /> },
  { value: 'subcontractor', label: 'Subcontractor', icon: <Building2 size={20} /> },
  { value: 'consultant', label: 'Consultant', icon: <Briefcase size={20} /> },
];

export default function ProviderRegistration({ onComplete }: { onComplete?: () => void }) {
  const addProvider = useProviderStore(s => s.addProvider);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', type: 'contractor' as ProviderType, email: '', phone: '',
    address: '', city: '', country: '', description: '', specialties: '',
  });

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));
  const canNext = step === 0 ? form.name && form.type : step === 1 ? form.email && form.phone : step === 2 ? form.address && form.city && form.country : true;
  const handleSubmit = () => {
    addProvider({
      name: form.name, type: form.type, email: form.email, phone: form.phone,
      location: { address: form.address, city: form.city, country: form.country },
    });
    onComplete?.();
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 md:p-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-cyan-500/10 rounded-lg"><Building2 className="text-cyan-400" size={24} /></div>
        <div><h2 className="text-xl font-bold text-stone-100">Register as Provider</h2><p className="text-sm text-stone-400">Join the DzeNhare marketplace</p></div>
      </div>
      <div className="flex gap-2 mb-8">
        {['Type', 'Contact', 'Location', 'Catalog'].map((label, i) => (
          <div key={label} className={`flex-1 h-2 rounded-full transition-colors ${i <= step ? 'bg-cyan-500' : 'bg-stone-800'}`} />
        ))}
      </div>
      {step === 0 && (
        <div className="space-y-4">
          <label className="text-sm font-medium text-stone-300">Provider Name</label>
          <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. DzeNhare Earthworks Ltd" className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 placeholder-stone-600 focus:border-cyan-500/50 outline-none" />
          <label className="text-sm font-medium text-stone-300">Provider Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROVIDER_TYPES.map(pt => (
              <button key={pt.value} onClick={() => update('type', pt.value)} className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${form.type === pt.value ? 'border-cyan-500 bg-cyan-500/10' : 'border-stone-800 bg-stone-950 hover:border-stone-700'}`}>
                <span className={form.type === pt.value ? 'text-cyan-400' : 'text-stone-400'}>{pt.icon}</span>
                <span className={`text-sm font-medium ${form.type === pt.value ? 'text-cyan-300' : 'text-stone-300'}`}>{pt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <div><label className="text-sm font-medium text-stone-300">Email Address</label><input value={form.email} onChange={e => update('email', e.target.value)} placeholder="provider@example.com" type="email" className="w-full mt-1 bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 placeholder-stone-600 focus:border-cyan-500/50 outline-none" /></div>
          <div><label className="text-sm font-medium text-stone-300">Phone Number</label><input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+263 77 123 4567" className="w-full mt-1 bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 placeholder-stone-600 focus:border-cyan-500/50 outline-none" /></div>
          <div><label className="text-sm font-medium text-stone-300">Description</label><textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Tell us about your business..." rows={3} className="w-full mt-1 bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 placeholder-stone-600 focus:border-cyan-500/50 outline-none resize-none" /></div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-stone-400 mb-2"><MapPin size={16} /> Business Location</div>
          <div><label className="text-sm font-medium text-stone-300">Street Address</label><input value={form.address} onChange={e => update('address', e.target.value)} placeholder="123 Samora Machel Ave" className="w-full mt-1 bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 placeholder-stone-600 focus:border-cyan-500/50 outline-none" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-stone-300">City</label><input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Harare" className="w-full mt-1 bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 placeholder-stone-600 focus:border-cyan-500/50 outline-none" /></div>
            <div><label className="text-sm font-medium text-stone-300">Country</label><input value={form.country} onChange={e => update('country', e.target.value)} placeholder="Zimbabwe" className="w-full mt-1 bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 placeholder-stone-600 focus:border-cyan-500/50 outline-none" /></div>
          </div>
          <div><label className="text-sm font-medium text-stone-300">Specialties (comma separated)</label><input value={form.specialties} onChange={e => update('specialties', e.target.value)} placeholder="Excavation, Foundation, Concrete Works" className="w-full mt-1 bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 placeholder-stone-600 focus:border-cyan-500/50 outline-none" /></div>
        </div>
      )}
      {step === 3 && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto"><Check className="text-emerald-400" size={32} /></div>
          <h3 className="text-lg font-semibold text-stone-200">Almost Done!</h3>
          <p className="text-stone-400 text-sm">Review your details before submitting. You can add catalog items and credentials after registration.</p>
          <div className="bg-stone-950 rounded-lg p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-400">Name:</span><span className="text-stone-200">{form.name}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Type:</span><span className="text-stone-200">{PROVIDER_TYPES.find(t => t.value === form.type)?.label}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Email:</span><span className="text-stone-200">{form.email}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Location:</span><span className="text-stone-200">{form.city}, {form.country}</span></div>
          </div>
        </div>
      )}
      <div className="flex justify-between mt-8">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="flex items-center gap-2 px-4 py-2 text-stone-400 hover:text-stone-200 disabled:opacity-30 transition-colors"><ChevronLeft size={16} /> Back</button>
        {step < 3 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-stone-800 disabled:text-stone-600 text-white rounded-lg font-medium transition-all"><span>Next</span><ChevronRight size={16} /></button>
        ) : (
          <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-all"><Check size={16} /> Complete Registration</button>
        )}
      </div>
    </div>
  );
}
