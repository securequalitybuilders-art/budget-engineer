import React, { useState, useMemo } from 'react';
import { useProviderStore } from '../../stores/providerStore';
import ProviderRegistration from './ProviderRegistration';
import CatalogManager from './CatalogManager';
import CredentialManager from './CredentialManager';
import { Building2, Package, Shield, BarChart3, Settings, Plus, Users, Star, MapPin, ChevronRight, Briefcase, TrendingUp, Clock, Filter, Search, CheckCircle2, XCircle, AlertTriangle, Award } from 'lucide-react';

type Tab = 'overview' | 'catalog' | 'credentials' | 'services' | 'portfolio' | 'analytics' | 'settings';

export default function ProviderDashboard() {
  const { providers, selectedProviderId, selectProvider, removeProvider, getFilteredProviders, filters, setFilters, setSort, sortBy, sortAsc } = useProviderStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showRegistration, setShowRegistration] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const provider = providers.find(p => p.id === selectedProviderId);

  const filteredProviders = useMemo(() => {
    setFilters({ search: searchQuery || undefined });
    return getFilteredProviders();
  }, [providers, searchQuery, filters]);

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
          <div className="text-center max-w-md"><Building2 size={64} className="mx-auto text-stone-700 mb-6" /><h3 className="text-xl font-semibold text-stone-300 mb-2">No Providers Registered</h3><p className="text-stone-500 mb-6">Register your first provider to start listing services, managing credentials, and receiving procurement orders.</p><button onClick={() => setShowRegistration(true)} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"><Plus size={18} /> Register Now</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)] p-4 md:p-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h2 className="text-2xl font-bold text-stone-100 flex items-center gap-2"><Building2 className="text-cyan-400" size={24} /> Provider Dashboard</h2><p className="text-stone-400 text-sm mt-1">{providers.length} registered {providers.length === 1 ? 'provider' : 'providers'} on the network</p></div>
        <button onClick={() => setShowRegistration(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium text-sm transition-colors"><Plus size={18} /> Register Provider</button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        <aside className="w-full md:w-72 shrink-0 flex flex-col gap-3">
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search providers..." className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-stone-200 outline-none focus:border-stone-600" /></div>
          <div className="flex flex-wrap gap-1 mb-2">
            {[{ key: 'all', label: 'All' }, { key: 'contractor', label: 'Contractor' }, { key: 'supplier', label: 'Supplier' }, { key: 'professional', label: 'Professional' }, { key: 'subcontractor', label: 'Sub' }].map(t => (
              <button key={t.key} onClick={() => setFilters({ type: t.key === 'all' ? undefined : t.key })} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${(t.key === 'all' && !filters.type) || filters.type === t.key ? 'bg-cyan-500/10 text-cyan-400' : 'text-stone-500 hover:text-stone-300'}`}>{t.label}</button>
            ))}
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
            {filteredProviders.map(p => (
              <button key={p.id} onClick={() => { selectProvider(p.id); setActiveTab('overview'); }} className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${p.id === selectedProviderId ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-stone-900 border-stone-800 hover:border-stone-700'}`}>
                <div className="w-10 h-10 bg-stone-800 rounded-lg flex items-center justify-center text-stone-300 font-bold text-sm shrink-0">{p.name.charAt(0)}</div>
                <div className="flex-1 min-w-0"><div className="text-sm font-medium text-stone-200 truncate">{p.name}</div><div className="flex items-center gap-2 text-xs text-stone-500"><span>{p.type}</span><span className={`w-1.5 h-1.5 rounded-full ${p.verificationStatus === 'verified' ? 'bg-emerald-500' : p.verificationStatus === 'pending' ? 'bg-amber-500' : 'bg-stone-600'}`} /></div></div>
                <div className="text-right"><div className="text-xs text-amber-500 flex items-center gap-0.5"><Star size={10} />{p.rating.toFixed(1)}</div><div className="text-xs text-stone-600">{p.completedProjects}</div></div>
              </button>
            ))}
            {filteredProviders.length === 0 && <div className="text-center py-6 text-stone-600 text-sm">No providers match your search.</div>}
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
                  <div className="bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-center"><div className="text-2xl font-bold text-cyan-400">{provider.catalog.length}</div><div className="text-xs text-stone-500">Catalog</div></div>
                  <div className="bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-center"><div className="text-2xl font-bold text-emerald-400">{provider.credentials.length}</div><div className="text-xs text-stone-500">Credentials</div></div>
                </div>
              </div>
            </div>

            <div className="flex gap-1 border-b border-stone-800 pb-1 overflow-x-auto">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${activeTab === t.key ? 'bg-stone-900 text-cyan-400 border border-stone-800 border-b-transparent' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'}`}>{t.icon}{t.label}</button>
              ))}
            </div>

            <div className="flex-1 animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-y-auto">
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
                  <div className="bg-stone-900 border border-stone-800 rounded-lg p-5">
                    <h4 className="text-sm font-semibold text-stone-300 mb-3">Quick Actions</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button onClick={() => setActiveTab('catalog')} className="p-3 bg-stone-950 border border-stone-800 rounded-lg text-left hover:border-stone-700 transition-colors"><Package size={18} className="text-cyan-400 mb-1" /><div className="text-sm font-medium text-stone-300">Manage Catalog</div><div className="text-xs text-stone-600">Add or edit items</div></button>
                      <button onClick={() => setActiveTab('credentials')} className="p-3 bg-stone-950 border border-stone-800 rounded-lg text-left hover:border-stone-700 transition-colors"><Shield size={18} className="text-emerald-400 mb-1" /><div className="text-sm font-medium text-stone-300">Add Credentials</div><div className="text-xs text-stone-600">Upload licenses</div></button>
                      <button onClick={() => setActiveTab('services')} className="p-3 bg-stone-950 border border-stone-800 rounded-lg text-left hover:border-stone-700 transition-colors"><Briefcase size={18} className="text-violet-400 mb-1" /><div className="text-sm font-medium text-stone-300">List Services</div><div className="text-xs text-stone-600">Define offerings</div></button>
                      <button onClick={() => setActiveTab('portfolio')} className="p-3 bg-stone-950 border border-stone-800 rounded-lg text-left hover:border-stone-700 transition-colors"><Award size={18} className="text-amber-400 mb-1" /><div className="text-sm font-medium text-stone-300">Showcase Work</div><div className="text-xs text-stone-600">Add projects</div></button>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'catalog' && <CatalogManager providerId={provider.id} />}
              {activeTab === 'credentials' && <CredentialManager providerId={provider.id} />}
              {activeTab === 'services' && <div className="bg-stone-900 border border-stone-800 rounded-lg p-8 text-center text-stone-500"><Briefcase size={48} className="mx-auto mb-4 text-stone-700" /><p>Service management coming soon. You can define service offerings through the catalog.</p></div>}
              {activeTab === 'portfolio' && <div className="bg-stone-900 border border-stone-800 rounded-lg p-8 text-center text-stone-500"><Award size={48} className="mx-auto mb-4 text-stone-700" /><p>Portfolio showcase coming soon. Upload completed projects and client testimonials.</p></div>}
              {activeTab === 'analytics' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-stone-900 border border-stone-800 rounded-lg p-5"><h4 className="text-sm font-semibold text-stone-300 mb-4">Provider Score</h4><div className="text-center"><div className="text-5xl font-bold text-amber-400">{provider.rating.toFixed(1)}</div><div className="text-sm text-stone-500 mt-2">out of 5.0</div><div className="flex justify-center gap-1 mt-3">{[1,2,3,4,5].map(i => <Star key={i} size={20} className={i <= Math.round(provider.rating) ? 'text-amber-500 fill-amber-500' : 'text-stone-700'} />)}</div></div></div>
                  <div className="bg-stone-900 border border-stone-800 rounded-lg p-5"><h4 className="text-sm font-semibold text-stone-300 mb-4">Marketplace Activity</h4><div className="space-y-3"><div className="flex justify-between items-center"><span className="text-sm text-stone-400">Total Projects</span><span className="text-stone-200 font-semibold">{provider.completedProjects}</span></div><div className="flex justify-between items-center"><span className="text-sm text-stone-400">Catalog Items</span><span className="text-stone-200 font-semibold">{provider.catalog.length}</span></div><div className="flex justify-between items-center"><span className="text-sm text-stone-400">Credentials Verified</span><span className="text-stone-200 font-semibold">{provider.credentials.filter(c => c.verificationStatus === 'verified').length}/{provider.credentials.length}</span></div></div></div>
                </div>
              )}
              {activeTab === 'settings' && (
                <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-stone-800"><span className="text-stone-300">Verification Status</span><span className={`px-3 py-1 rounded-full text-xs font-medium ${provider.verificationStatus === 'verified' ? 'bg-emerald-500/10 text-emerald-400' : provider.verificationStatus === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-stone-800 text-stone-400'}`}>{provider.verificationStatus}</span></div>
                  <div className="flex justify-between items-center py-3 border-b border-stone-800"><span className="text-stone-300">Member Since</span><span className="text-stone-400 text-sm">{new Date(provider.registrationDate).toLocaleDateString()}</span></div>
                  <div className="flex justify-between items-center py-3 border-b border-stone-800"><span className="text-stone-300">Total Catalog Value</span><span className="text-emerald-400 font-semibold">${provider.catalog.reduce((s, i) => s + i.unitPrice, 0).toLocaleString()}</span></div>
                  <div className="pt-4"><button onClick={() => { removeProvider(provider.id); selectProvider(null); }} className="px-5 py-2.5 bg-rose-600/10 text-rose-400 hover:bg-rose-600/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"><XCircle size={16} /> Remove Provider from Marketplace</button></div>
                </div>
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
