import { create } from 'zustand';
import { Provider, CatalogItem, Credential, ServiceOffering, Portfolio } from '../domain/marketplace';

interface ProviderStore {
  providers: Provider[];
  selectedProviderId: string | null;
  loading: boolean;
  error: string | null;
  addProvider: (provider: Omit<Provider, 'id' | 'registrationDate' | 'verificationStatus' | 'rating' | 'completedProjects' | 'credentials' | 'catalog' | 'services' | 'portfolio'>) => Provider;
  updateProvider: (id: string, updates: Partial<Provider>) => void;
  removeProvider: (id: string) => void;
  selectProvider: (id: string | null) => void;
  getProvider: (id: string) => Provider | undefined;
  addCatalogItem: (providerId: string, item: Omit<CatalogItem, 'id' | 'providerId'>) => void;
  removeCatalogItem: (providerId: string, itemId: string) => void;
  addCredential: (providerId: string, credential: Omit<Credential, 'id'>) => void;
  addService: (providerId: string, service: Omit<ServiceOffering, 'id' | 'providerId'>) => void;
  addPortfolio: (providerId: string, portfolio: Omit<Portfolio, 'id' | 'providerId'>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProviderStore = create<ProviderStore>((set, get) => ({
  providers: [],
  selectedProviderId: null,
  loading: false,
  error: null,

  addProvider: (data) => {
    const provider: Provider = {
      ...data, id: crypto.randomUUID(), registrationDate: new Date().toISOString(),
      verificationStatus: 'unverified', rating: 0, completedProjects: 0,
      credentials: [], catalog: [], services: [], portfolio: [],
    };
    set(s => ({ providers: [...s.providers, provider], selectedProviderId: provider.id }));
    return provider;
  },

  updateProvider: (id, updates) => set(s => ({
    providers: s.providers.map(p => p.id === id ? { ...p, ...updates } : p),
  })),

  removeProvider: (id) => set(s => ({
    providers: s.providers.filter(p => p.id !== id),
    selectedProviderId: s.selectedProviderId === id ? null : s.selectedProviderId,
  })),

  selectProvider: (id) => set({ selectedProviderId: id }),

  getProvider: (id) => get().providers.find(p => p.id === id),

  addCatalogItem: (providerId, item) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, catalog: [...p.catalog, { ...item, id: crypto.randomUUID(), providerId }],
    } : p),
  })),

  removeCatalogItem: (providerId, itemId) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, catalog: p.catalog.filter(c => c.id !== itemId),
    } : p),
  })),

  addCredential: (providerId, credential) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, credentials: [...p.credentials, { ...credential, id: crypto.randomUUID() }],
    } : p),
  })),

  addService: (providerId, service) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, services: [...p.services, { ...service, id: crypto.randomUUID(), providerId }],
    } : p),
  })),

  addPortfolio: (providerId, portfolio) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, portfolio: [...p.portfolio, { ...portfolio, id: crypto.randomUUID(), providerId }],
    } : p),
  })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
