import React, { useState, useMemo, useEffect } from 'react';
import { useProviderStore } from '../../stores/providerStore';
import type { ServiceOffering } from '../../domain/marketplace';
import ProviderRegistration from './ProviderRegistration';
import CatalogManager from './CatalogManager';
import CredentialManager from './CredentialManager';
import { Building2, Package, Shield, BarChart3, Settings, Plus, Users, Star, MapPin, Briefcase, TrendingUp, Clock, Search, XCircle, AlertTriangle, Award, Bell, Activity, AlertOctagon, RefreshCw, Info, ArrowUpDown, Calendar } from 'lucide-react';

type Tab = 'overview' | 'catalog' | 'credentials' | 'services' | 'portfolio' | 'analytics' | 'settings';

function generateActivityFeed(providerId: string, providerName: string): { id: string; type: 'catalog' | 'credential' | 'system'; message: string; time: string; icon: React.ReactNode }[] {
  const now = new Date();
  const items = [
    { type: 'system' as const, message: `${providerName} registered on marketplace`, time: new Date(now.getTime() - 7 * 86400000).toISOString(), icon: <Building2 size={14} className="text-cyan-400" /> },
    { type: 'catalog' as const, message: `Catalog updated with new items`, time: new Date(now.getTime() - 3 * 86400000).toISOString(), icon: <Package size={14} className="text-emerald-400" /> },
    { type: 'credential' as const, message: `Credential verification requested`, time: new Date(now.getTime() - 1 * 86400000).toISOString(), icon: <Shield size={14} className="text-amber-400" /> },
  ];
  return items.map((item, i) => ({ ...item, id: `${providerId}-activity-${i}` }));
}

function generateNotifications(providerId: string): { id: string; type: 'warning' | 'error' | 'info'; message: string; action: string }[] {
  return [
    { id: `${providerId}-notif-1`, type: 'info', message: '3 credentials expiring within 90 days', action: 'Review' },
    { id: `${providerId}-notif-2`, type: 'warning', message: '2 catalog items out of stock', action: 'Restock' },
    { id: `${providerId}-notif-3`, type: 'info', message: 'Provider verification pending', action: 'Resubmit' },
  ];
}

function ServicesTab({ providerId }: { providerId: string }) {
  const provider = useProviderStore(s => s.providers.find(p => p.id === providerId));
  const [showForm, setShowForm] = useState(false);
  const [svc, setSvc] = useState({ name: '', description: '', category: '', pricingModel: 'fixed' as ServiceOffering['pricingModel'], price: 0, currency: 'USD', serviceArea: '', availability: 'Mon-Fri 08:00-17:00' });
  if (!provider) return null;
  const addSvc = () => {
    if (!svc.name || !svc.category) return;
    useProviderStore.getState().addService(provider.id, {
      name: svc.name, description: svc.description, category: svc.category,
      pricingModel: svc.pricingModel, price: svc.price, currency: svc.currency,
      serviceArea: svc.serviceArea.split(',').map(s => s.trim()),
      availability: { days: ['Mon','Tue','Wed','Thu','Fri'], hours: svc.availability },
    });
    setSvc({ name: '', description: '', category: '', pricingModel: 'fixed', price: 0, currency: 'USD', serviceArea: '', availability: 'Mon-Fri 08:00-17:00' });
    setShowForm(false);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-stone-300 flex items-center gap-2"><Briefcase size={16} className="text-cyan-400" /> Service Offerings</h3><button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"><Plus size={16} /> {showForm ? 'Cancel' : 'Add Service'}</button></div>
      {showForm && (
        <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-xs text-stone-400">Service Name *</label><input value={svc.name} onChange={e => setSvc(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Structural Engineering Design" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div className="col-span-2"><label className="text-xs text-stone-400">Description</label><textarea value={svc.description} onChange={e => setSvc(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none resize-none" placeholder="Describe the service offering..." /></div>
            <div><label className="text-xs text-stone-400">Category *</label><input value={svc.category} onChange={e => setSvc(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Structural, MEP, Civil" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Pricing Model</label><select value={svc.pricingModel} onChange={e => setSvc(f => ({ ...f, pricingModel: e.target.value as ServiceOffering['pricingModel'] }))} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none">{['fixed','hourly','per_unit','milestone','cost_plus'].map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}</select></div>
            <div><label className="text-xs text-stone-400">Price</label><input value={svc.price || ''} onChange={e => setSvc(f => ({ ...f, price: Number(e.target.value) }))} type="number" min={0} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Currency</label><select value={svc.currency} onChange={e => setSvc(f => ({ ...f, currency: e.target.value }))} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none"><option value="USD">USD</option><option value="ZWL">ZWL</option><option value="ZAR">ZAR</option></select></div>
            <div><label className="text-xs text-stone-400">Service Area (comma-separated)</label><input value={svc.serviceArea} onChange={e => setSvc(f => ({ ...f, serviceArea: e.target.value }))} placeholder="e.g. Harare, Bulawayo, Mutare" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Availability</label><input value={svc.availability} onChange={e => setSvc(f => ({ ...f, availability: e.target.value }))} placeholder="e.g. Mon-Fri 08:00-17:00" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
          </div>
          <div className="flex gap-2 justify-end"><button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200">Cancel</button><button onClick={addSvc} disabled={!svc.name || !svc.category} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-400 text-white rounded-lg text-sm font-medium transition-colors"><Plus size={14} /> Save Service</button></div>
        </div>
      )}
      {provider.services.length === 0 && !showForm && (
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-8 text-center"><Briefcase size={48} className="mx-auto mb-4 text-stone-700" /><p className="text-stone-400">No service offerings yet. Click "Add Service" to create one.</p></div>
      )}
      {provider.services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {provider.services.map(s => (
            <div key={s.id} className="bg-stone-900 border border-stone-800 rounded-lg p-5">
              <div className="flex items-start justify-between mb-2"><div><h4 className="text-sm font-semibold text-stone-200">{s.name}</h4><span className="text-xs text-stone-400">{s.category}</span></div><span className="px-2 py-0.5 text-xs font-medium bg-cyan-500/10 text-cyan-400 rounded-full">{s.pricingModel.replace('_',' ')}</span></div>
              {s.description && <p className="text-xs text-stone-400 mb-3 line-clamp-2">{s.description}</p>}
              <div className="flex items-center justify-between border-t border-stone-800 pt-3"><span className="text-emerald-400 font-semibold text-sm">{s.currency} {s.price.toLocaleString()}</span><span className="text-xs text-stone-400">{s.serviceArea.slice(0, 3).join(', ')}{s.serviceArea.length > 3 && ` +${s.serviceArea.length - 3}`}</span></div>
              <div className="flex items-center justify-between mt-1"><span className="text-[10px] text-stone-400 flex items-center gap-1"><Clock size={10} /> {s.availability.days.join(', ')} {s.availability.hours}</span><button onClick={() => useProviderStore.getState().removeService(provider.id, s.id)} className="text-xs text-rose-400 hover:text-rose-300">Remove</button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioTab({ providerId }: { providerId: string }) {
  const provider = useProviderStore(s => s.providers.find(p => p.id === providerId));
  const [showForm, setShowForm] = useState(false);
  const [pf, setPf] = useState({ title: '', description: '', category: '', completionDate: '', value: 0, clientName: '', location: '' });
  if (!provider) return null;
  const addPf = () => {
    if (!pf.title || !pf.category) return;
    useProviderStore.getState().addPortfolio(provider.id, {
      title: pf.title, description: pf.description, category: pf.category,
      completionDate: pf.completionDate || new Date().toISOString(),
      value: pf.value, clientName: pf.clientName || undefined, location: pf.location || undefined,
      images: [], documents: [],
    });
    setPf({ title: '', description: '', category: '', completionDate: '', value: 0, clientName: '', location: '' });
    setShowForm(false);
  };
  const totalValue = provider.portfolio.reduce((s, p) => s + p.value, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-stone-300 flex items-center gap-2"><Award size={16} className="text-amber-400" /> Portfolio ({provider.portfolio.length} projects · ${totalValue.toLocaleString()} total)</h3><button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"><Plus size={16} /> {showForm ? 'Cancel' : 'Add Project'}</button></div>
      {showForm && (
        <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-xs text-stone-400">Project Title *</label><input value={pf.title} onChange={e => setPf(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Harare Medical Centre" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div className="col-span-2"><label className="text-xs text-stone-400">Description</label><textarea value={pf.description} onChange={e => setPf(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none resize-none" placeholder="Describe the project, scope, and outcomes..." /></div>
            <div><label className="text-xs text-stone-400">Category *</label><input value={pf.category} onChange={e => setPf(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Residential, Commercial" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Completion Date</label><input value={pf.completionDate} onChange={e => setPf(f => ({ ...f, completionDate: e.target.value }))} type="date" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Contract Value (USD)</label><input value={pf.value || ''} onChange={e => setPf(f => ({ ...f, value: Number(e.target.value) }))} type="number" min={0} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Client Name</label><input value={pf.clientName} onChange={e => setPf(f => ({ ...f, clientName: e.target.value }))} placeholder="e.g. Ministry of Health" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Location</label><input value={pf.location} onChange={e => setPf(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Harare, Zimbabwe" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
          </div>
          <div className="flex gap-2 justify-end"><button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200">Cancel</button><button onClick={addPf} disabled={!pf.title || !pf.category} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-400 text-white rounded-lg text-sm font-medium transition-colors"><Plus size={14} /> Save Project</button></div>
        </div>
      )}
      {provider.portfolio.length === 0 && !showForm && (
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-8 text-center"><Award size={48} className="mx-auto mb-4 text-stone-700" /><p className="text-stone-400">No portfolio projects yet. Click "Add Project" to showcase your work.</p></div>
      )}
      {provider.portfolio.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {provider.portfolio.sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime()).map(p => (
            <div key={p.id} className="bg-stone-900 border border-stone-800 rounded-lg p-5">
              <div className="flex items-start justify-between mb-2">
                <div><h4 className="text-sm font-semibold text-stone-200">{p.title}</h4><span className="text-xs text-stone-400">{p.category}</span></div>
                <span className="text-emerald-400 font-semibold text-sm">${p.value.toLocaleString()}</span>
              </div>
              {p.description && <p className="text-xs text-stone-400 mb-3 line-clamp-2">{p.description}</p>}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400 border-t border-stone-800 pt-3">
                {p.clientName && <span className="flex items-center gap-1"><Users size={12} /> {p.clientName}</span>}
                {p.location && <span className="flex items-center gap-1"><MapPin size={12} /> {p.location}</span>}
                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(p.completionDate).toLocaleDateString()}</span>
                {p.testimonial && <span className="flex items-center gap-1"><Star size={12} className="text-amber-500" /> Testimonial</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProviderDashboard() {
  const { providers, selectedProviderId, selectProvider, removeProvider, getFilteredProviders, filters, setFilters, setSort, sortBy } = useProviderStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showRegistration, setShowRegistration] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const provider = providers.find(p => p.id === selectedProviderId);

  useEffect(() => {
    setFilters({ search: searchQuery || undefined });
  }, [searchQuery, setFilters]);

  const filteredProviders = useMemo(() => {
    return getFilteredProviders();
  }, [providers, filters]);

  const activityFeed = useMemo(() => provider ? generateActivityFeed(provider.id, provider.name) : [], [provider]);
  const notifications = useMemo(() => provider ? generateNotifications(provider.id) : [], [provider]);

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
    { key: 'catalog', label: 'Catalog', icon: <Package size={16} /> },
    { key: 'credentials', label: 'Credentials', icon: <Shield size={16} /> },
    { key: 'services', label: 'Services', icon: <Briefcase size={16} /> },
    { key: 'portfolio', label: 'Portfolio', icon: <Award size={16} /> },
    { key: 'analytics', label: 'Analytics', icon: <TrendingUp size={16} /> },
    { key: 'settings', label: 'Settings', icon: <Settings size={16} /> },
  ];

  if (showRegistration) return <ProviderRegistration onComplete={() => setShowRegistration(false)} />;

  if (providers.length === 0) {
    return (
      <div className="flex h-full flex-col bg-[var(--bg-primary)] p-4 md:p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-2xl font-bold text-stone-100 flex items-center gap-2"><Building2 className="text-cyan-400" size={24} /> Provider Dashboard</h2><p className="text-stone-400 text-sm mt-1">Manage your marketplace presence, catalog, and credentials</p></div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md"><Building2 size={64} className="mx-auto text-stone-700 mb-6" /><h3 className="text-xl font-semibold text-stone-300 mb-2">No Providers Registered</h3><p className="text-stone-400 mb-2">Register your first provider to start listing services, managing credentials, and receiving procurement orders.</p><p className="text-stone-400 text-sm mb-6">You can register as a contractor, supplier, subcontractor, or construction professional.</p><button onClick={() => setShowRegistration(true)} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"><Plus size={18} /> Register Now</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)] p-4 md:p-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h2 className="text-2xl font-bold text-stone-100 flex items-center gap-2"><Building2 className="text-cyan-400" size={24} /> Provider Dashboard</h2><p className="text-stone-400 text-sm mt-1">{providers.length} registered {providers.length === 1 ? 'provider' : 'providers'} on the network</p></div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => { setShowNotifications(!showNotifications); setShowActivity(false); }} aria-label="Toggle notifications" className="relative p-2 text-stone-400 hover:text-stone-200 bg-stone-950 border border-stone-800 rounded-lg transition-colors">
              <Bell size={18} />
              {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">{notifications.length}</span>}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-stone-950 border border-stone-800 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-stone-800 flex items-center justify-between"><span className="text-sm font-medium text-stone-200">Notifications</span><button onClick={() => setShowNotifications(false)} aria-label="Close notifications" className="text-stone-400 hover:text-stone-300"><XCircle size={14} /></button></div>
                <div className="max-h-64 overflow-y-auto">{notifications.map(n => (
                  <div key={n.id} className="flex items-start gap-3 p-3 hover:bg-stone-900 transition-colors border-b border-stone-800/50 last:border-0">
                    <div className={`p-1.5 rounded-full shrink-0 ${n.type === 'warning' ? 'bg-amber-500/10' : n.type === 'error' ? 'bg-rose-500/10' : 'bg-cyan-500/10'}`}>
                      {n.type === 'warning' ? <AlertTriangle size={12} className="text-amber-400" /> : n.type === 'error' ? <XCircle size={12} className="text-rose-400" /> : <Info size={12} className="text-cyan-400" />}
                    </div>
                    <div className="flex-1 min-w-0"><p className="text-xs text-stone-300">{n.message}</p><button className="text-xs text-cyan-400 hover:text-cyan-300 mt-0.5">{n.action} →</button></div>
                  </div>
                ))}</div>
                {notifications.length === 0 && <div className="p-6 text-center text-stone-400 text-sm">No notifications</div>}
              </div>
            )}
          </div>
          <button onClick={() => setShowRegistration(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium text-sm transition-colors"><Plus size={18} /> Register Provider</button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        <aside className="w-full md:w-72 shrink-0 flex flex-col gap-3">
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search providers..." aria-label="Search providers" className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-stone-200 outline-none focus:border-stone-600" /></div>
          <div className="flex flex-wrap gap-1 mb-2">
            {[{ key: 'all', label: 'All' }, { key: 'contractor', label: 'Contractor' }, { key: 'supplier', label: 'Supplier' }, { key: 'professional', label: 'Professional' }, { key: 'subcontractor', label: 'Sub' }].map(t => (
              <button key={t.key} onClick={() => setFilters({ type: t.key === 'all' ? undefined : t.key })} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${(t.key === 'all' && !filters.type) || filters.type === t.key ? 'bg-cyan-500/10 text-cyan-400' : 'text-stone-400 hover:text-stone-300'}`}>{t.label}</button>
            ))}
          </div>
          <div className="flex items-center justify-between px-1"><span className="text-xs text-stone-400">{filteredProviders.length} providers</span><button onClick={() => { setSort(sortBy === 'name' ? 'date' : sortBy === 'date' ? 'rating' : 'name'); }} className="text-xs text-stone-400 hover:text-stone-300 flex items-center gap-1"><ArrowUpDown size={10} /> {sortBy}</button></div>
          <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
            {filteredProviders.map(p => (
              <button key={p.id} onClick={() => { selectProvider(p.id); setActiveTab('overview'); }} className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${p.id === selectedProviderId ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-stone-900 border-stone-800 hover:border-stone-700'}`}>
                <div className="w-10 h-10 bg-stone-800 rounded-lg flex items-center justify-center text-stone-300 font-bold text-sm shrink-0">{p.name.charAt(0)}</div>
                <div className="flex-1 min-w-0"><div className="text-sm font-medium text-stone-200 truncate">{p.name}</div><div className="flex items-center gap-2 text-xs text-stone-400"><span>{p.type}</span><span className={`w-1.5 h-1.5 rounded-full ${p.verificationStatus === 'verified' ? 'bg-emerald-500' : p.verificationStatus === 'pending' ? 'bg-amber-500' : 'bg-stone-600'}`} /></div></div>
                <div className="text-right"><div className="text-xs text-amber-500 flex items-center gap-0.5"><Star size={10} />{p.rating.toFixed(1)}</div><div className="text-xs text-stone-400">{p.completedProjects}</div></div>
              </button>
            ))}
            {filteredProviders.length === 0 && <div className="text-center py-6 text-stone-400 text-sm">No providers match your search.</div>}
          </div>
        </aside>

        {provider && (
          <main className="flex-1 flex flex-col gap-4 min-w-0">
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 md:p-6">
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-stone-800 to-stone-700 rounded-xl flex items-center justify-center text-stone-200 font-bold text-2xl shrink-0">{provider.name.charAt(0)}</div>
                <div className="flex-1"><h3 className="text-xl font-bold text-stone-100 flex items-center gap-2">{provider.name}<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${provider.verificationStatus === 'verified' ? 'bg-emerald-500/10 text-emerald-400' : provider.verificationStatus === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-stone-800 text-stone-400'}`}>{provider.verificationStatus}</span></h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-stone-400"><span className="flex items-center gap-1"><MapPin size={14} />{provider.location.city}, {provider.location.country}</span><span className="flex items-center gap-1"><Star size={14} className="text-amber-500" />{provider.rating.toFixed(1)}</span><span className="flex items-center gap-1"><Users size={14} />{provider.completedProjects} projects</span><span className="flex items-center gap-1"><Briefcase size={14} />{provider.type}</span></div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <div className="bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-center"><div className="text-2xl font-bold text-cyan-400">{provider.catalog.length}</div><div className="text-xs text-stone-400">Catalog</div></div>
                  <div className="bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-center"><div className="text-2xl font-bold text-emerald-400">{provider.credentials.length}</div><div className="text-xs text-stone-400">Credentials</div></div>
                  <div className="bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-center"><div className="text-2xl font-bold text-amber-400">{provider.services.length}</div><div className="text-xs text-stone-400">Services</div></div>
                </div>
              </div>
            </div>

            <div className="flex gap-1 border-b border-stone-800 pb-1 overflow-x-auto">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${activeTab === t.key ? 'bg-stone-900 text-cyan-400 border border-stone-800 border-b-transparent' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'}`}>{t.icon}{t.label}</button>
              ))}
              <button onClick={() => setShowActivity(!showActivity)} className={`ml-auto flex items-center gap-1.5 px-3 py-2 text-xs rounded-t-lg transition-colors ${showActivity ? 'text-cyan-400 bg-stone-900 border border-stone-800 border-b-transparent' : 'text-stone-400 hover:text-stone-300'}`}><Activity size={14} /> Activity</button>
            </div>

            <div className="flex-1 animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-y-auto">
              {showActivity && (
                <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3"><h4 className="text-sm font-semibold text-stone-300 flex items-center gap-2"><Activity size={14} className="text-cyan-400" /> Recent Activity</h4><button onClick={() => setShowActivity(false)} aria-label="Close activity panel" className="text-stone-400 hover:text-stone-300"><XCircle size={14} /></button></div>
                  <div className="relative">
                    <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-stone-800" />
                    <div className="space-y-3">
                      {activityFeed.map(a => (
                        <div key={a.id} className="flex items-start gap-3 pl-1">
                          <div className="w-4 h-4 rounded-full bg-stone-900 flex items-center justify-center z-10 ring-2 ring-stone-950">{a.icon}</div>
                          <div className="flex-1 min-w-0"><p className="text-xs text-stone-300">{a.message}</p><p className="text-[10px] text-stone-400 mt-0.5">{new Date(a.time).toLocaleDateString()}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Catalog Items', value: provider.catalog.length, icon: <Package size={18} />, color: 'text-cyan-400' },
                      { label: 'Credentials', value: provider.credentials.length, icon: <Shield size={18} />, color: 'text-emerald-400' },
                      { label: 'Active Services', value: provider.services.length, icon: <Briefcase size={18} />, color: 'text-violet-400' },
                      { label: 'Portfolio Projects', value: provider.portfolio.length, icon: <Award size={18} />, color: 'text-amber-400' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-stone-900 border border-stone-800 rounded-lg p-5"><div className="flex items-center gap-2 text-stone-400 text-sm mb-2">{stat.icon}<span>{stat.label}</span></div><div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div></div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-stone-900 border border-stone-800 rounded-lg p-5">
                      <h4 className="text-sm font-semibold text-stone-300 mb-3">Quick Actions</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setActiveTab('catalog')} className="p-3 bg-stone-950 border border-stone-800 rounded-lg text-left hover:border-stone-700 transition-colors"><Package size={18} className="text-cyan-400 mb-1" /><div className="text-sm font-medium text-stone-300">Manage Catalog</div><div className="text-xs text-stone-400">Add or edit items</div></button>
                        <button onClick={() => setActiveTab('credentials')} className="p-3 bg-stone-950 border border-stone-800 rounded-lg text-left hover:border-stone-700 transition-colors"><Shield size={18} className="text-emerald-400 mb-1" /><div className="text-sm font-medium text-stone-300">Add Credentials</div><div className="text-xs text-stone-400">Upload licenses</div></button>
                        <button onClick={() => setActiveTab('services')} className="p-3 bg-stone-950 border border-stone-800 rounded-lg text-left hover:border-stone-700 transition-colors"><Briefcase size={18} className="text-violet-400 mb-1" /><div className="text-sm font-medium text-stone-300">List Services</div><div className="text-xs text-stone-400">Define offerings</div></button>
                        <button onClick={() => setActiveTab('portfolio')} className="p-3 bg-stone-950 border border-stone-800 rounded-lg text-left hover:border-stone-700 transition-colors"><Award size={18} className="text-amber-400 mb-1" /><div className="text-sm font-medium text-stone-300">Showcase Work</div><div className="text-xs text-stone-400">Add projects</div></button>
                      </div>
                    </div>
                    <div className="bg-stone-900 border border-stone-800 rounded-lg p-5">
                      <h4 className="text-sm font-semibold text-stone-300 mb-3">Marketplace Stats</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><span className="text-sm text-stone-400">Total Catalog Value</span><span className="text-emerald-400 font-semibold">${provider.catalog.reduce((s, i) => s + i.unitPrice, 0).toLocaleString()}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm text-stone-400">Avg Credential Score</span><span className="text-stone-200 font-semibold">{provider.credentials.length > 0 ? `${Math.round(provider.credentials.filter(c => c.verificationStatus === 'verified').length / provider.credentials.length * 100)}% verified` : 'N/A'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm text-stone-400">Registration Date</span><span className="text-stone-200 text-sm">{new Date(provider.registrationDate).toLocaleDateString()}</span></div>
                        {notifications.length > 0 && <div className="border-t border-stone-800 pt-3 mt-3"><div className="text-xs text-stone-400 mb-2 flex items-center gap-1"><AlertOctagon size={12} /> {notifications.length} pending items</div>{notifications.slice(0, 2).map(n => (
                          <div key={n.id} className="flex items-center gap-2 py-1"><span className={`w-1.5 h-1.5 rounded-full ${n.type === 'warning' ? 'bg-amber-500' : 'bg-cyan-500'}`} /><span className="text-xs text-stone-400">{n.message}</span></div>
                        ))}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'catalog' && <CatalogManager providerId={provider.id} />}
              {activeTab === 'credentials' && <CredentialManager providerId={provider.id} />}
              {activeTab === 'services' && <ServicesTab providerId={provider.id} />}
              {activeTab === 'portfolio' && <PortfolioTab providerId={provider.id} />}
              {activeTab === 'analytics' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-stone-900 border border-stone-800 rounded-lg p-5"><h4 className="text-sm font-semibold text-stone-300 mb-4">Provider Score</h4><div className="text-center"><div className="text-5xl font-bold text-amber-400">{provider.rating.toFixed(1)}</div><div className="text-sm text-stone-400 mt-2">out of 5.0</div><div className="flex justify-center gap-1 mt-3">{[1,2,3,4,5].map(i => <Star key={i} size={20} className={i <= Math.round(provider.rating) ? 'text-amber-500 fill-amber-500' : 'text-stone-700'} />)}</div></div></div>
                  <div className="bg-stone-900 border border-stone-800 rounded-lg p-5"><h4 className="text-sm font-semibold text-stone-300 mb-4">Marketplace Activity</h4><div className="space-y-3"><div className="flex justify-between items-center"><span className="text-sm text-stone-400">Total Projects</span><span className="text-stone-200 font-semibold">{provider.completedProjects}</span></div><div className="flex justify-between items-center"><span className="text-sm text-stone-400">Catalog Items</span><span className="text-stone-200 font-semibold">{provider.catalog.length}</span></div><div className="flex justify-between items-center"><span className="text-sm text-stone-400">Credentials Verified</span><span className="text-stone-200 font-semibold">{provider.credentials.filter(c => c.verificationStatus === 'verified').length}/{provider.credentials.length}</span></div><div className="flex justify-between items-center"><span className="text-sm text-stone-400">Services Listed</span><span className="text-stone-200 font-semibold">{provider.services.length}</span></div><div className="flex justify-between items-center"><span className="text-sm text-stone-400">Portfolio Items</span><span className="text-stone-200 font-semibold">{provider.portfolio.length}</span></div></div></div>
                  <div className="md:col-span-2 bg-stone-900 border border-stone-800 rounded-lg p-5">
                    <h4 className="text-sm font-semibold text-stone-300 mb-4">Catalog Growth</h4>
                    <div className="flex items-end gap-2 h-32">
                      {[3, 5, 8, 12, 15, 18].map((val, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-cyan-500/20 rounded-t transition-all hover:bg-cyan-500/30" style={{ height: `${(val / 20) * 100}%` }}>
                            <div className="w-full h-full bg-gradient-to-t from-cyan-500/40 to-transparent rounded-t" />
                          </div>
                          <span className="text-[10px] text-stone-400">{['Jan','Feb','Mar','Apr','May','Jun'][i]}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-stone-400 mt-2">Catalog items added per month (simulated)</p>
                  </div>
                </div>
              )}
              {activeTab === 'settings' && (
                <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-stone-800"><span className="text-stone-300">Verification Status</span><span className={`px-3 py-1 rounded-full text-xs font-medium ${provider.verificationStatus === 'verified' ? 'bg-emerald-500/10 text-emerald-400' : provider.verificationStatus === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-stone-800 text-stone-400'}`}>{provider.verificationStatus}</span></div>
                  <div className="flex justify-between items-center py-3 border-b border-stone-800"><span className="text-stone-300">Member Since</span><span className="text-stone-400 text-sm">{new Date(provider.registrationDate).toLocaleDateString()}</span></div>
                  <div className="flex justify-between items-center py-3 border-b border-stone-800"><span className="text-stone-300">Total Catalog Value</span><span className="text-emerald-400 font-semibold">${provider.catalog.reduce((s, i) => s + i.unitPrice, 0).toLocaleString()}</span></div>
                  <div className="flex justify-between items-center py-3 border-b border-stone-800"><span className="text-stone-300">Credentials</span><span className="text-stone-400 text-sm">{provider.credentials.filter(c => c.verificationStatus === 'verified').length} verified / {provider.credentials.length} total</span></div>
                  <div className="flex justify-between items-center py-3 border-b border-stone-800"><span className="text-stone-300">Service Regions</span><span className="text-stone-400 text-sm">{provider.availability?.regions?.join(', ') || 'Not specified'}</span></div>
                  <div className="pt-4 flex gap-3">
                    <button className="px-5 py-2.5 bg-cyan-600/10 text-cyan-400 hover:bg-cyan-600/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"><RefreshCw size={16} /> Request Re-verification</button>
                    <button onClick={() => { removeProvider(provider.id); selectProvider(null); }} className="px-5 py-2.5 bg-rose-600/10 text-rose-400 hover:bg-rose-600/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"><XCircle size={16} /> Remove Provider</button>
                  </div>
                </div>
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
