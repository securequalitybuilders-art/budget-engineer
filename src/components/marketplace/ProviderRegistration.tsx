import React, { useState, useCallback } from 'react';
import { useProviderStore } from '../../stores/providerStore';
import { ProviderType } from '../../domain/marketplace';
import { Building2, Briefcase, Package, MapPin, ChevronRight, ChevronLeft, Check, AlertCircle, Globe, Phone, Mail, Building, Users, Award, Shield, Sparkles, Clock } from 'lucide-react';

const PROVIDER_TYPES: { value: ProviderType; label: string; description: string; longDesc: string; icon: React.ReactNode }[] = [
  { value: 'contractor', label: 'General Contractor', description: 'Full construction project management', longDesc: 'Manages entire builds from groundbreak to handover. Subcontracts specialist trades.', icon: <Building2 size={22} /> },
  { value: 'supplier', label: 'Material Supplier', description: 'Building materials and equipment', longDesc: 'Supplies cement, steel, roofing, plumbing, electrical, finishes, and plant hire.', icon: <Package size={22} /> },
  { value: 'professional', label: 'Professional Consultant', description: 'Architect, Engineer, Quantity Surveyor', longDesc: 'Registered professionals offering design, structural, civil, mechanical, electrical engineering.', icon: <Briefcase size={22} /> },
  { value: 'subcontractor', label: 'Specialist Subcontractor', description: 'Electrical, Plumbing, Roofing, etc.', longDesc: 'Specialised trades — electrical, plumbing, HVAC, fire, joinery, waterproofing, steel.', icon: <Users size={22} /> },
  { value: 'consultant', label: 'Advisory Consultant', description: 'PM, BIM, Environmental, H&S', longDesc: 'Project management, BIM coordination, environmental impact, health & safety, compliance.', icon: <Globe size={22} /> },
];

const COUNTRIES = ['Zimbabwe', 'South Africa', 'Botswana', 'Zambia', 'Malawi', 'Mozambique', 'Namibia', 'Lesotho', 'Eswatini', 'Angola', 'DRC', 'Tanzania'];
const SPECIALIZATIONS: Record<string, string[]> = {
  contractor: ['Residential', 'Commercial', 'Industrial', 'Infrastructure', 'Mixed-Use', 'Renovation'],
  supplier: ['Cement & Concrete', 'Steel & Reinforcement', 'Roofing & Cladding', 'Plumbing & Drainage', 'Electrical & Lighting', 'Finishes & Tiles', 'Paint & Coatings', 'Timber & Joinery', 'Glass & Glazing', 'Plant & Equipment'],
  professional: ['Architecture', 'Structural Engineering', 'Civil Engineering', 'MEP Engineering', 'Quantity Surveying', 'BIM Coordination', 'Land Surveying'],
  subcontractor: ['Electrical', 'Plumbing', 'HVAC', 'Fire Protection', 'Joinery & Carpentry', 'Waterproofing', 'Steel Fixing', 'Plastering & Tiling', 'Painting & Decorating'],
  consultant: ['Project Management', 'Environmental Assessment', 'Health & Safety', 'BIM Management', 'Sustainability', 'Risk Management'],
};

export default function ProviderRegistration({ onComplete }: { onComplete?: () => void }) {
  const addProvider = useProviderStore(s => s.addProvider);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '', tradingAs: '', type: 'contractor' as ProviderType, email: '', phone: '', alternativePhone: '', website: '',
    address: '', city: '', province: '', country: 'Zimbabwe', postalCode: '', registrationNumber: '', taxId: '',
    yearEstablished: '', employeeCount: '', description: '', specialties: '', regions: '', serviceRadius: '', insuranceType: '', insuranceExpiry: '',
    acceptsPO: false, acceptsRetention: false,
  });

  const update = useCallback((field: string, value: string | boolean) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => { const next = { ...e }; delete next[field]; return next; });
  }, []);

  const selectedSpecializations = SPECIALIZATIONS[form.type] ?? [];

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (step === 0) { if (!form.name.trim()) errs.name = 'Business name is required'; if (!form.type) errs.type = 'Select a provider type'; }
    if (step === 1) {
      if (!form.email.trim()) errs.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
      if (!form.phone.trim()) errs.phone = 'Phone is required';
      else if (!/^\+?[\d\s\-()]{7,20}$/.test(form.phone)) errs.phone = 'Invalid phone number';
      if (form.website && !/^https?:\/\/.+/.test(form.website)) errs.website = 'Must start with http:// or https://';
    }
    if (step === 2) { if (!form.address.trim()) errs.address = 'Address is required'; if (!form.city.trim()) errs.city = 'City is required'; if (!form.country) errs.country = 'Country is required'; }
    if (step === 3 && !form.specialties.trim()) errs.specialties = 'Select at least one specialty';
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
      availability: { regions: form.regions.split(',').map(r => r.trim()).filter(Boolean), preferredProjectTypes: form.specialties.split(',').map(s => s.trim()).filter(Boolean) },
    });
    setSubmitted(true);
    setTimeout(() => onComplete?.(), 2000);
  };

  const inputClass = (field: string) => `w-full mt-1 bg-stone-950 border ${errors[field] ? 'border-rose-500/50' : 'border-stone-800'} rounded-lg px-4 py-3 text-stone-200 placeholder-stone-600 focus:border-cyan-500/50 outline-none transition-colors text-sm`;
  const labelClass = 'text-sm font-medium text-stone-300';

  if (submitted) return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-8 max-w-lg mx-auto w-full text-center">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><Sparkles className="text-emerald-400" size={40} /></div>
      <h2 className="text-2xl font-bold text-stone-100 mb-2">Registration Submitted!</h2>
      <p className="text-stone-400 mb-6"><span className="text-cyan-400 font-semibold">{form.name}</span> is now being processed. You can start adding catalog items and credentials.</p>
      <div className="bg-stone-950 border border-stone-800/50 rounded-lg p-4 space-y-2 text-sm text-left">
        <div className="flex items-center gap-2 text-emerald-400"><Check size={14} /> Profile created</div>
        <div className="flex items-center gap-2 text-amber-400"><Clock size={14} /> Verification pending</div>
        <div className="flex items-center gap-2 text-stone-400"><AlertCircle size={14} /> Add catalog items next</div>
      </div>
    </div>
  );

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 md:p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-2.5 bg-cyan-500/10 rounded-xl"><Building2 className="text-cyan-400" size={26} /></div>
        <div><h2 className="text-xl font-bold text-stone-100">Register as Marketplace Provider</h2><p className="text-sm text-stone-400">Join DzeNhare — connect with projects across SADC</p></div>
      </div>
      <div className="flex gap-2 mb-8">
        {['Business Type', 'Contact', 'Location', 'Services', 'Review'].map((label, i) => (<div key={label} className="flex-1"><div className={`h-2 rounded-full transition-colors ${i <= step ? 'bg-cyan-500' : 'bg-stone-800'}`} /><div className={`text-xs mt-1.5 text-center ${i === step ? 'text-cyan-400 font-medium' : 'text-stone-400'}`}>{label}</div></div>))}
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <div><label className={labelClass}>Registered Business Name *</label><div className="relative mt-1"><Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. DzeNhare Earthworks (Pvt) Ltd" className={`${inputClass('name')} pl-10`} /></div>{errors.name && <p className="text-rose-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.name}</p>}</div>
          <div><label className={labelClass}>Trading As (if different)</label><input value={form.tradingAs} onChange={e => update('tradingAs', e.target.value)} placeholder="e.g. DzeNhare Earthworks" className={inputClass('tradingAs')} /></div>
          <div><label className={labelClass}>Business Type *</label><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            {PROVIDER_TYPES.map(pt => (
              <button key={pt.value} onClick={() => update('type', pt.value)} className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${form.type === pt.value ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30' : 'border-stone-800 bg-stone-950 hover:border-stone-700'}`}>
                <span className={form.type === pt.value ? 'text-cyan-400' : 'text-stone-400'}>{pt.icon}</span>
                <div className="text-left"><div className={`text-sm font-medium ${form.type === pt.value ? 'text-cyan-300' : 'text-stone-200'}`}>{pt.label}</div><div className="text-xs text-stone-400 mt-0.5">{pt.longDesc}</div></div>
              </button>
            ))}
          </div></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Year Established</label><input value={form.yearEstablished} onChange={e => update('yearEstablished', e.target.value)} placeholder="e.g. 2015" type="number" min="1900" max="2026" className={inputClass('yearEstablished')} /></div>
            <div><label className={labelClass}>Number of Employees</label><input value={form.employeeCount} onChange={e => update('employeeCount', e.target.value)} placeholder="e.g. 50" type="number" min="0" className={inputClass('employeeCount')} /></div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-stone-400 mb-1"><Mail size={16} /> Contact Information</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Email Address *</label><div className="relative mt-1"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={form.email} onChange={e => update('email', e.target.value)} placeholder="info@company.co.zw" type="email" className={`${inputClass('email')} pl-10`} /></div>{errors.email && <p className="text-rose-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.email}</p>}</div>
            <div><label className={labelClass}>Confirm Email</label><input placeholder="confirm@company.co.zw" type="email" className={inputClass('_confirm')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Phone Number *</label><div className="relative mt-1"><Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+263 77 123 4567" type="tel" className={`${inputClass('phone')} pl-10`} /></div>{errors.phone && <p className="text-rose-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.phone}</p>}</div>
            <div><label className={labelClass}>Alternative Phone</label><div className="relative mt-1"><Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={form.alternativePhone} onChange={e => update('alternativePhone', e.target.value)} placeholder="+263 71 987 6543" type="tel" className={`${inputClass('alternativePhone')} pl-10`} /></div></div>
          </div>
          <div><label className={labelClass}>Website</label><div className="relative mt-1"><Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://www.example.com" className={`${inputClass('website')} pl-10`} /></div>{errors.website && <p className="text-rose-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.website}</p>}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Company Registration Number</label><input value={form.registrationNumber} onChange={e => update('registrationNumber', e.target.value)} placeholder="CR/2023/12345" className={inputClass('registrationNumber')} /><p className="text-xs text-stone-400 mt-1">As registered with Companies Registry</p></div>
            <div><label className={labelClass}>Tax ID / VAT Number</label><input value={form.taxId} onChange={e => update('taxId', e.target.value)} placeholder="VAT-123456" className={inputClass('taxId')} /></div>
          </div>
          <div><label className={labelClass}>Business Description</label><textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Describe your core services, specialties, key projects, and track record..." rows={3} className={`${inputClass('description')} resize-none`} /><p className="text-xs text-stone-400 mt-1">{form.description.length}/500 characters</p></div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-stone-400 mb-1"><MapPin size={16} /> Business Location & Coverage</div>
          <div><label className={labelClass}>Street Address *</label><input value={form.address} onChange={e => update('address', e.target.value)} placeholder="123 Samora Machel Avenue" className={inputClass('address')} />{errors.address && <p className="text-rose-400 text-xs mt-1">{errors.address}</p>}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>City *</label><input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Harare" className={inputClass('city')} />{errors.city && <p className="text-rose-400 text-xs mt-1">{errors.city}</p>}</div>
            <div><label className={labelClass}>Province / State</label><input value={form.province} onChange={e => update('province', e.target.value)} placeholder="Harare Province" className={inputClass('province')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Country *</label><select value={form.country} onChange={e => update('country', e.target.value)} className={inputClass('country')}>{COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className={labelClass}>Postal Code</label><input value={form.postalCode} onChange={e => update('postalCode', e.target.value)} placeholder="e.g. 00263" className={inputClass('postalCode')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Service Regions</label><input value={form.regions} onChange={e => update('regions', e.target.value)} placeholder="Harare, Bulawayo, Mutare" className={inputClass('regions')} /><p className="text-xs text-stone-400 mt-1">Comma-separated cities/provinces</p></div>
            <div><label className={labelClass}>Service Radius (km)</label><input value={form.serviceRadius} onChange={e => update('serviceRadius', e.target.value)} placeholder="e.g. 500" type="number" className={inputClass('serviceRadius')} /></div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-stone-400 mb-1"><Award size={16} /> Specializations & Insurance</div>
          <div><label className={labelClass}>Select Your Specializations *</label><div className="flex flex-wrap gap-2 mt-2">{selectedSpecializations.map(s => {
            const selected = form.specialties.includes(s);
            return (<button key={s} onClick={() => { const list = form.specialties.split(',').map(x => x.trim()).filter(Boolean); update('specialties', selected ? list.filter(x => x !== s).join(', ') : [...list, s].join(', ')); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selected ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'}`}>{s}</button>);
          })}</div>{errors.specialties && <p className="text-rose-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.specialties}</p>}</div>
          <div className="grid grid-cols-2 gap-4"><div><label className={labelClass}>Insurance Type</label><select value={form.insuranceType} onChange={e => update('insuranceType', e.target.value)} className={inputClass('insuranceType')}><option value="">Select insurance type</option><option value="public_liability">Public Liability</option><option value="professional_indemnity">Professional Indemnity</option><option value="contractors_all_risk">Contractor's All Risk</option><option value="worker_comp">Workers Compensation</option></select></div>
            <div><label className={labelClass}>Insurance Expiry</label><input value={form.insuranceExpiry} onChange={e => update('insuranceExpiry', e.target.value)} type="date" className={inputClass('insuranceExpiry')} /></div></div>
          <div className="space-y-2 bg-stone-950 border border-stone-800 rounded-lg p-4"><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.acceptsPO} onChange={e => update('acceptsPO', e.target.checked)} className="w-4 h-4 rounded border-stone-700 bg-stone-900 text-cyan-500 focus:ring-cyan-500" /><span className="text-sm text-stone-300">I accept purchase orders from verified clients</span></label><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.acceptsRetention} onChange={e => update('acceptsRetention', e.target.checked)} className="w-4 h-4 rounded border-stone-700 bg-stone-900 text-cyan-500 focus:ring-cyan-500" /><span className="text-sm text-stone-300">I accept standard retention (5% holdback)</span></label></div>
        </div>
      )}

      {step === 4 && (
        <div className="text-center py-6 space-y-5">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto"><Check className="text-emerald-400" size={32} /></div>
          <div><h3 className="text-lg font-semibold text-stone-200">Review Your Registration</h3><p className="text-stone-400 text-sm mt-1">You can add catalog items, credentials, and portfolio after registering.</p></div>
          <div className="bg-stone-950 rounded-xl p-5 text-left space-y-2 text-sm border border-stone-800/50">
            {[{ label: 'Business Name', value: form.name }, { label: 'Trading As', value: form.tradingAs || '—' }, { label: 'Type', value: PROVIDER_TYPES.find(t => t.value === form.type)?.label }, { label: 'Email', value: form.email }, { label: 'Phone', value: form.phone }, { label: 'Location', value: `${form.city}, ${form.country}` }, { label: 'Year Established', value: form.yearEstablished || '—' }, { label: 'Employees', value: form.employeeCount ? `${form.employeeCount}` : '—' }, { label: 'Specializations', value: form.specialties.split(',').filter(Boolean).join(', ') || '—' }, { label: 'Service Regions', value: form.regions || '—' }].map(r => (
              <div key={r.label} className="flex justify-between items-center"><span className="text-stone-400">{r.label}</span><span className="text-stone-200 font-medium text-right max-w-[60%] truncate">{r.value}</span></div>
            ))}
          </div>
          <p className="text-xs text-stone-400 flex items-center justify-center gap-1"><Shield size={12} /> By submitting you agree to the DzeNhare Marketplace Terms of Service</p>
        </div>
      )}

      <div className="flex justify-between mt-8 pt-4 border-t border-stone-800">
        <button onClick={handleBack} disabled={step === 0} className="flex items-center gap-2 px-4 py-2 text-stone-400 hover:text-stone-200 disabled:opacity-30 transition-colors text-sm"><ChevronLeft size={16} /> Back</button>
        <div className="flex gap-3">
          {step < 4 ? (
            <button onClick={handleNext} className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium text-sm transition-all"><span>Continue</span><ChevronRight size={16} /></button>
          ) : (
            <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-all"><Check size={16} /> Complete Registration</button>
          )}
        </div>
      </div>
    </div>
  );
}
