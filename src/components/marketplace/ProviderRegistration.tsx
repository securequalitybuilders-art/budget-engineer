import React, { useState, useCallback } from 'react';
import { useProviderStore } from '../../stores/providerStore';
import { ProviderType } from '../../domain/marketplace';
import { Building2, Briefcase, Package, MapPin, ChevronRight, ChevronLeft, Check, AlertCircle, Globe, Phone, Mail, Building, Users, Calendar } from 'lucide-react';

const PROVIDER_TYPES: { value: ProviderType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'contractor', label: 'General Contractor', description: 'Full construction project management', icon: <Building2 size={22} /> },
  { value: 'supplier', label: 'Material Supplier', description: 'Building materials and equipment', icon: <Package size={22} /> },
  { value: 'professional', label: 'Professional', description: 'Architect, Engineer, Quantity Surveyor', icon: <Briefcase size={22} /> },
  { value: 'subcontractor', label: 'Specialist Subcontractor', description: 'Electrical, Plumbing, Roofing, etc.', icon: <Users size={22} /> },
  { value: 'consultant', label: 'Consultant', description: 'Advisory, Project Management, BIM', icon: <Globe size={22} /> },
];

const COUNTRIES = ['Zimbabwe', 'South Africa', 'Botswana', 'Zambia', 'Malawi', 'Mozambique', 'Namibia'];

export default function ProviderRegistration({ onComplete }: { onComplete?: () => void }) {
  const addProvider = useProviderStore(s => s.addProvider);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '', type: 'contractor' as ProviderType, email: '', phone: '', alternativePhone: '', website: '',
    address: '', city: '', province: '', country: 'Zimbabwe', registrationNumber: '', taxId: '',
    yearEstablished: '', employeeCount: '', description: '', specialties: '', regions: '',
  });

  const update = useCallback((field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => { const next = { ...e }; delete next[field]; return next; });
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (step === 0) { if (!form.name.trim()) errs.name = 'Provider name is required'; if (!form.type) errs.type = 'Select a provider type'; }
    if (step === 1) { if (!form.email.trim()) errs.email = 'Email is required'; else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format'; if (!form.phone.trim()) errs.phone = 'Phone is required'; if (form.website && !/^https?:\/\/.+/.test(form.website)) errs.website = 'Website must start with http:// or https://'; }
    if (step === 2) { if (!form.address.trim()) errs.address = 'Address is required'; if (!form.city.trim()) errs.city = 'City is required'; if (!form.country) errs.country = 'Country is required'; }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => { if (validate()) setStep(s => s + 1); };
  const handleBack = () => { setErrors({}); setStep(s => Math.max(0, s - 1)); };

  const handleSubmit = () => {
    addProvider({
      name: form.name, type: form.type, email: form.email, phone: form.phone,
      alternativePhone: form.alternativePhone || undefined, website: form.website || undefined,
      registrationNumber: form.registrationNumber || undefined, taxId: form.taxId || undefined,
      yearEstablished: form.yearEstablished ? parseInt(form.yearEstablished) : undefined,
      employeeCount: form.employeeCount ? parseInt(form.employeeCount) : undefined,
      location: { address: form.address, city: form.city, province: form.province || undefined, country: form.country },
      availability: { regions: form.regions.split(',').map(r => r.trim()).filter(Boolean), preferredProjectTypes: [] },
    });
    onComplete?.();
  };

  const inputClass = (field: string) => `w-full mt-1 bg-stone-950 border ${errors[field] ? 'border-rose-500/50' : 'border-stone-800'} rounded-lg px-4 py-3 text-stone-200 placeholder-stone-600 focus:border-cyan-500/50 outline-none transition-colors text-sm`;
  const labelClass = 'text-sm font-medium text-stone-300';

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 md:p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-cyan-500/10 rounded-xl"><Building2 className="text-cyan-400" size={26} /></div>
        <div><h2 className="text-xl font-bold text-stone-100">Register as Marketplace Provider</h2><p className="text-sm text-stone-400">Join DzeNhare — connect with projects across SADC</p></div>
      </div>
      <div className="flex gap-2 mb-8">
        {['Business Type', 'Contact', 'Location', 'Review'].map((label, i) => (<div key={label} className="flex-1"><div className={`h-2 rounded-full transition-colors ${i <= step ? 'bg-cyan-500' : 'bg-stone-800'}`} /><div className={`text-xs mt-1.5 text-center ${i === step ? 'text-cyan-400 font-medium' : 'text-stone-600'}`}>{label}</div></div>))}
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <div><label className={labelClass}>Business Name *</label><div className="relative mt-1"><Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" /><input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. DzeNhare Earthworks (Pvt) Ltd" className={`${inputClass('name')} pl-10`} /></div>{errors.name && <p className="text-rose-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.name}</p>}</div>
          <div><label className={labelClass}>Business Type *</label><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            {PROVIDER_TYPES.map(pt => (
              <button key={pt.value} onClick={() => update('type', pt.value)} className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${form.type === pt.value ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30' : 'border-stone-800 bg-stone-950 hover:border-stone-700'}`}>
                <span className={form.type === pt.value ? 'text-cyan-400' : 'text-stone-400'}>{pt.icon}</span>
                <div className="text-left"><div className={`text-sm font-medium ${form.type === pt.value ? 'text-cyan-300' : 'text-stone-200'}`}>{pt.label}</div><div className="text-xs text-stone-500 mt-0.5">{pt.description}</div></div>
              </button>
            ))}
          </div></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Year Established</label><input value={form.yearEstablished} onChange={e => update('yearEstablished', e.target.value)} placeholder="e.g. 2015" type="number" className={inputClass('yearEstablished')} /></div>
            <div><label className={labelClass}>Number of Employees</label><input value={form.employeeCount} onChange={e => update('employeeCount', e.target.value)} placeholder="e.g. 50" type="number" className={inputClass('employeeCount')} /></div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div><label className={labelClass}>Email Address *</label><div className="relative mt-1"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" /><input value={form.email} onChange={e => update('email', e.target.value)} placeholder="info@company.co.zw" type="email" className={`${inputClass('email')} pl-10`} /></div>{errors.email && <p className="text-rose-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.email}</p>}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Phone Number *</label><div className="relative mt-1"><Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" /><input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+263 77 123 4567" type="tel" className={`${inputClass('phone')} pl-10`} /></div>{errors.phone && <p className="text-rose-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.phone}</p>}</div>
            <div><label className={labelClass}>Alternative Phone</label><div className="relative mt-1"><Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" /><input value={form.alternativePhone} onChange={e => update('alternativePhone', e.target.value)} placeholder="+263 71 987 6543" type="tel" className={`${inputClass('alternativePhone')} pl-10`} /></div></div>
          </div>
          <div><label className={labelClass}>Website</label><div className="relative mt-1"><Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" /><input value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://www.example.com" className={`${inputClass('website')} pl-10`} /></div>{errors.website && <p className="text-rose-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.website}</p>}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Registration Number</label><input value={form.registrationNumber} onChange={e => update('registrationNumber', e.target.value)} placeholder="CR/2023/12345" className={inputClass('registrationNumber')} /></div>
            <div><label className={labelClass}>Tax ID (VAT)</label><input value={form.taxId} onChange={e => update('taxId', e.target.value)} placeholder="VAT-123456" className={inputClass('taxId')} /></div>
          </div>
          <div><label className={labelClass}>Business Description</label><textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Describe your core services, specialties, and track record..." rows={3} className={`${inputClass('description')} resize-none`} /></div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-stone-400 mb-2"><MapPin size={16} /> Business Location</div>
          <div><label className={labelClass}>Street Address *</label><input value={form.address} onChange={e => update('address', e.target.value)} placeholder="123 Samora Machel Avenue" className={inputClass('address')} />{errors.address && <p className="text-rose-400 text-xs mt-1">{errors.address}</p>}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>City *</label><input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Harare" className={inputClass('city')} />{errors.city && <p className="text-rose-400 text-xs mt-1">{errors.city}</p>}</div>
            <div><label className={labelClass}>Province</label><input value={form.province} onChange={e => update('province', e.target.value)} placeholder="Harare Province" className={inputClass('province')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Country *</label><select value={form.country} onChange={e => update('country', e.target.value)} className={inputClass('country')}>{COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className={labelClass}>Service Regions</label><input value={form.regions} onChange={e => update('regions', e.target.value)} placeholder="Harare, Bulawayo, Mutare" className={inputClass('regions')} /></div>
          </div>
          <div><label className={labelClass}>Specialties</label><textarea value={form.specialties} onChange={e => update('specialties', e.target.value)} placeholder="Excavation, Foundation Works, Concrete Structures, Roadworks" rows={2} className={`${inputClass('specialties')} resize-none`} /></div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center py-6 space-y-5">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto"><Check className="text-emerald-400" size={32} /></div>
          <div><h3 className="text-lg font-semibold text-stone-200">Review Your Registration</h3><p className="text-stone-400 text-sm mt-1">You can add catalog items, credentials, and portfolio after registering.</p></div>
          <div className="bg-stone-950 rounded-xl p-5 text-left space-y-3 text-sm border border-stone-800/50">
            {[{ label: 'Business Name', value: form.name }, { label: 'Type', value: PROVIDER_TYPES.find(t => t.value === form.type)?.label }, { label: 'Email', value: form.email }, { label: 'Phone', value: form.phone }, { label: 'Location', value: `${form.city}, ${form.country}` }, { label: 'Year Established', value: form.yearEstablished || '—' }, { label: 'Employees', value: form.employeeCount ? `${form.employeeCount}` : '—' }].map(r => (
              <div key={r.label} className="flex justify-between"><span className="text-stone-400">{r.label}</span><span className="text-stone-200 font-medium">{r.value}</span></div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between mt-8 pt-4 border-t border-stone-800">
        <button onClick={handleBack} disabled={step === 0} className="flex items-center gap-2 px-4 py-2 text-stone-400 hover:text-stone-200 disabled:opacity-30 transition-colors text-sm"><ChevronLeft size={16} /> Back</button>
        <div className="flex gap-3">
          {step < 3 ? (
            <button onClick={handleNext} className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium text-sm transition-all"><span>Continue</span><ChevronRight size={16} /></button>
          ) : (
            <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-all"><Check size={16} /> Complete Registration</button>
          )}
        </div>
      </div>
    </div>
  );
}
