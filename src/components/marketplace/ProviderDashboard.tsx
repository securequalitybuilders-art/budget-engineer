import React, { useState } from 'react';
import { useProviderStore } from '../../stores/providerStore';
import ProviderRegistration from './ProviderRegistration';
import CatalogManager from './CatalogManager';
import CredentialManager from './CredentialManager';
import { Building2, Package, Shield, BarChart3, Settings, Plus, Users, Star, MapPin, ChevronRight } from 'lucide-react';

type Tab = 'overview' | 'catalog' | 'credentials' | 'analytics' | 'settings';

export default function ProviderDashboard() {
  const { providers, selectedProviderId, selectProvider, removeProvider } = useProviderStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showRegistration, setShowRegistration] = useState(false);
  const provider = providers.find(p => p.id === selectedProviderId);

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
    { key: 'catalog', label: 'Catalog', icon: <Package size={16} /> },
    { key: 'credentials', label: 'Credentials', icon: <Shield size={16} /> },
    { key: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
    { key: 'settings', label: 'Settings', icon: <Settings size={16} /> },
  ];

  if (showRegistration) return <ProviderRegistration onComplete={() => setShowRegistration(false)} />;

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)] p-4 md:p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-stone-100 flex items-center gap-2"><Building2 className="text-cyan-400" size={24} /> Provider Dashboard</h2>
          <p className="text-stone-400 text-sm mt-1">Manage your marketplace presence, catalog, and credentials</p>
        </div>
        <button onClick={() => setShowRegistration(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium text-sm transition-colors"><Plus size={18} /> Register New Provider</button>
      </div>

      {providers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <Building2 size={64} className="mx-auto text-stone-700 mb-6" />
            <h3 className="text-xl font-semibold text-stone-300 mb-2">No Providers Yet</h3>
            <p className="text-stone-500 mb-6">Register your first provider to start listing services, managing credentials, and receiving procurement orders.</p>
            <button onClick={() => setShowRegistration(true)} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors">Register Now</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6 flex-1">
          <aside className="w-full md:w-72 shrink-0 flex flex-col gap-2">
            {providers.map(p => (
              <button key={p.id} onClick={() => { selectProvider(p.id); setActiveTab('overview'); }} className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${p.id === selectedProviderId ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-stone-900 border-stone-800 hover:border-stone-700'}`}>
                <div className="w-10 h-10 bg-stone-800 rounded-lg flex items-center justify-center text-stone-300 font-bold text-sm">{p.name.charAt(0)}</div>
                <div className="flex-1 min-w-0"><div className="text-sm font-medium text-stone-200 truncate">{p.name}</div><div className="text-xs text-stone-500">{p.type}</div></div>
                <ChevronRight size={16} className="text-stone-600" />
              </button>
            ))}
          </aside>

          {provider && (
            <main className="flex-1 space-y-4">
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-stone-800 rounded-xl flex items-center justify-center text-stone-200 font-bold text-2xl">{provider.name.charAt(0)}</div>
                    <div><h3 className="text-xl font-bold text-stone-100">{provider.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-stone-400">
                        <span className="flex items-center gap-1"><MapPin size={14} /> {provider.location.city}, {provider.location.country}</span>
                        <span className="flex items-center gap-1"><Star size={14} className="text-amber-500" /> {provider.rating.toFixed(1)}</span>
                        <span className="flex items-center gap-1"><Users size={14} /> {provider.completedProjects} projects</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${provider.verificationStatus === 'verified' ? 'bg-emerald-500/10 text-emerald-400' : provider.verificationStatus === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-stone-800 text-stone-400'}`}>{provider.verificationStatus}</span>
                </div>
              </div>

              <div className="flex gap-2 border-b border-stone-800 pb-1">
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === t.key ? 'bg-stone-900 text-cyan-400 border border-stone-800 border-b-transparent' : 'text-stone-400 hover:text-stone-200'}`}>{t.icon}{t.label}</button>
                ))}
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-stone-900 border border-stone-800 rounded-lg p-5"><div className="text-stone-400 text-sm mb-1">Catalog Items</div><div className="text-3xl font-bold text-stone-200">{provider.catalog.length}</div></div>
                    <div className="bg-stone-900 border border-stone-800 rounded-lg p-5"><div className="text-stone-400 text-sm mb-1">Credentials</div><div className="text-3xl font-bold text-stone-200">{provider.credentials.length}</div></div>
                    <div className="bg-stone-900 border border-stone-800 rounded-lg p-5"><div className="text-stone-400 text-sm mb-1">Services</div><div className="text-3xl font-bold text-stone-200">{provider.services.length}</div></div>
                    <div className="bg-stone-900 border border-stone-800 rounded-lg p-5 col-span-full"><div className="text-stone-400 text-sm mb-1">Portfolio Projects</div><div className="text-3xl font-bold text-stone-200">{provider.portfolio.length}</div></div>
                  </div>
                )}
                {activeTab === 'catalog' && <CatalogManager providerId={provider.id} />}
                {activeTab === 'credentials' && <CredentialManager providerId={provider.id} />}
                {activeTab === 'analytics' && <div className="bg-stone-900 border border-stone-800 rounded-lg p-8 text-center text-stone-500">Analytics dashboard coming in Phase 5.</div>}
                {activeTab === 'settings' && <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 space-y-4"><div className="flex justify-between items-center"><span className="text-stone-300">Account Status</span><span className="text-emerald-400 text-sm font-medium">Active</span></div><div className="flex justify-between items-center"><span className="text-stone-300">Verification</span><span className="text-stone-400 text-sm capitalize">{provider.verificationStatus}</span></div><button onClick={() => removeProvider(provider.id)} className="px-4 py-2 bg-rose-600/10 text-rose-400 hover:bg-rose-600/20 rounded-lg text-sm transition-colors">Remove Provider</button></div>}
              </div>
            </main>
          )}
        </div>
      )}
    </div>
  );
}
