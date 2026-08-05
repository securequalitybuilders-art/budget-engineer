import { create } from 'zustand';
import { Provider, CatalogItem, Credential, ServiceOffering, Portfolio, Review, InsuranceCoverage, ProviderAvailability } from '../domain/marketplace';
import type { ProviderCategory } from '../domain/providerTaxonomy';

interface ProviderFilters {
  type?: string; category?: ProviderCategory; verificationStatus?: string; ratingMin?: number;
  location?: string; search?: string; hasCatalog?: boolean;
}

interface ProviderStore {
  providers: Provider[];
  selectedProviderId: string | null;
  loading: boolean;
  error: string | null;
  filters: ProviderFilters;
  sortBy: 'name' | 'rating' | 'date' | 'projects';
  sortAsc: boolean;
  addProvider: (data: Omit<Provider, 'id' | 'registrationDate' | 'verificationStatus' | 'rating' | 'completedProjects' | 'totalContractValue' | 'credentials' | 'catalog' | 'services' | 'portfolio' | 'reviews' | 'insurance' | 'availability'> & { availability?: Partial<ProviderAvailability> }) => Provider;
  updateProvider: (id: string, updates: Partial<Provider>) => void;
  removeProvider: (id: string) => void;
  selectProvider: (id: string | null) => void;
  getProvider: (id: string) => Provider | undefined;
  getFilteredProviders: () => Provider[];
  setFilters: (filters: Partial<ProviderFilters>) => void;
  setSort: (sortBy: 'name' | 'rating' | 'date' | 'projects', asc?: boolean) => void;
  addCatalogItem: (providerId: string, item: Omit<CatalogItem, 'id' | 'providerId' | 'createdAt' | 'updatedAt'>) => void;
  updateCatalogItem: (providerId: string, itemId: string, updates: Partial<CatalogItem>) => void;
  removeCatalogItem: (providerId: string, itemId: string) => void;
  addCredential: (providerId: string, credential: Omit<Credential, 'id'>) => void;
  updateCredential: (providerId: string, credentialId: string, updates: Partial<Credential>) => void;
  addService: (providerId: string, service: Omit<ServiceOffering, 'id' | 'providerId'>) => void;
  updateService: (providerId: string, serviceId: string, updates: Partial<ServiceOffering>) => void;
  removeService: (providerId: string, serviceId: string) => void;
  addPortfolio: (providerId: string, portfolio: Omit<Portfolio, 'id' | 'providerId'>) => void;
  addReview: (providerId: string, review: Omit<Review, 'id' | 'createdAt'>) => void;
  addInsurance: (providerId: string, insurance: Omit<InsuranceCoverage, 'id'>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const defaultAvailability: ProviderAvailability = {
  status: 'available', regions: [], preferredProjectTypes: [],
};

export const useProviderStore = create<ProviderStore>((set, get) => ({
  providers: [],
  selectedProviderId: null,
  loading: false,
  error: null,
  filters: {},
  sortBy: 'date',
  sortAsc: false,

  addProvider: (data) => {
    const provider: Provider = {
      ...data, id: crypto.randomUUID(), registrationDate: new Date().toISOString(),
      verificationStatus: 'unverified', rating: 0, completedProjects: 0, totalContractValue: 0,
      credentials: [], catalog: [], services: [], portfolio: [],
      reviews: [], insurance: [],
      availability: { ...defaultAvailability, ...data.availability },
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

  getFilteredProviders: () => {
    const { providers, filters, sortBy, sortAsc } = get();
    let filtered = [...providers];
    if (filters.type) filtered = filtered.filter(p => p.type === filters.type);
    if (filters.category) filtered = filtered.filter(p => p.category === filters.category);
    if (filters.verificationStatus) filtered = filtered.filter(p => p.verificationStatus === filters.verificationStatus);
    if (filters.ratingMin) filtered = filtered.filter(p => p.rating >= filters.ratingMin!);
    if (filters.location) filtered = filtered.filter(p => p.location.city.toLowerCase().includes(filters.location!.toLowerCase()) || p.location.country.toLowerCase().includes(filters.location!.toLowerCase()));
    if (filters.search) { const q = filters.search.toLowerCase(); filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)); }
    if (filters.hasCatalog) filtered = filtered.filter(p => p.catalog.length > 0);
    filtered.sort((a, b) => {
      const cmp = sortBy === 'name' ? a.name.localeCompare(b.name) : sortBy === 'rating' ? a.rating - b.rating : sortBy === 'projects' ? a.completedProjects - b.completedProjects : new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime();
      return sortAsc ? cmp : -cmp;
    });
    return filtered;
  },

  setFilters: (filters) => set(s => ({ filters: { ...s.filters, ...filters } })),
  setSort: (sortBy, asc) => set({ sortBy, sortAsc: asc ?? get().sortAsc }),

  addCatalogItem: (providerId, item) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, catalog: [...p.catalog, { ...item, id: crypto.randomUUID(), providerId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), images: item.images ?? [], specifications: item.specifications ?? {} }],
    } : p),
  })),

  updateCatalogItem: (providerId, itemId, updates) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, catalog: p.catalog.map(c => c.id === itemId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c),
    } : p),
  })),

  removeCatalogItem: (providerId, itemId) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, catalog: p.catalog.filter(c => c.id !== itemId),
    } : p),
  })),

  addCredential: (providerId, credential) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, credentials: [...p.credentials, { ...credential, id: crypto.randomUUID(), verificationStatus: 'unverified' }],
    } : p),
  })),

  updateCredential: (providerId, credentialId, updates) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, credentials: p.credentials.map(c => c.id === credentialId ? { ...c, ...updates } : c),
    } : p),
  })),

  addService: (providerId, service) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, services: [...p.services, { ...service, id: crypto.randomUUID(), providerId }],
    } : p),
  })),

  updateService: (providerId, serviceId, updates) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, services: p.services.map(sv => sv.id === serviceId ? { ...sv, ...updates } : sv),
    } : p),
  })),

  removeService: (providerId, serviceId) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, services: p.services.filter(sv => sv.id !== serviceId),
    } : p),
  })),

  addPortfolio: (providerId, portfolio) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, portfolio: [...p.portfolio, { ...portfolio, id: crypto.randomUUID(), providerId }],
    } : p),
  })),

  addReview: (providerId, review) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, reviews: [...p.reviews, { ...review, id: crypto.randomUUID(), createdAt: new Date().toISOString() }],
    } : p),
  })),

  addInsurance: (providerId, insurance) => set(s => ({
    providers: s.providers.map(p => p.id === providerId ? {
      ...p, insurance: [...p.insurance, { ...insurance, id: crypto.randomUUID() }],
    } : p),
  })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ providers: [], selectedProviderId: null, filters: {}, error: null }),
}));
