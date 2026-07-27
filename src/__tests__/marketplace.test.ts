import { describe, it, expect, beforeEach } from 'vitest';
import { createEscrow, completeMilestone, verifyMilestone, releaseFunds, getEscrowProgress, getOverdueMilestones, getMilestoneTimeline, getEscrowSummary } from '../engine/marketplace/escrowEngine';
import { matchSuppliers, createProcurementOrder, calculateLaborNeeds, scheduleDeliveries, createRFQ, calculateFreight, getOrderTimeline } from '../engine/marketplace/procurementEngine';
import { computeExecutionStatus, findCriticalPath, scheduleVariance, budgetVariance, costPerformanceIndex } from '../engine/marketplace/executionMonitor';
import { createExtensionRegistry, loadExtension, disableExtension, enableExtension, triggerHook, getEnabledExtensions, installExtension, uninstallExtension } from '../engine/marketplace/extensionRegistry';
import { useProviderStore } from '../stores/providerStore';

describe('Marketplace Domain Types', () => {
beforeEach(() => { useProviderStore.getState().reset(); });

  it('creates a provider via store', () => {
    const store = useProviderStore.getState();
    store.addProvider({ name: 'Test Co', type: 'contractor', email: 'test@co.zw', phone: '+263771234567', location: { address: '1 Main St', city: 'Harare', country: 'Zimbabwe' } });
    const p = useProviderStore.getState().providers[0];
    expect(p.name).toBe('Test Co');
    expect(p.verificationStatus).toBe('unverified');
    expect(p.catalog).toEqual([]);
    expect(useProviderStore.getState().providers.length).toBe(1);
  });

  it('filters providers by type', () => {
    const store = useProviderStore.getState();
    store.addProvider({ name: 'BuildCo', type: 'contractor', email: 'a@b.com', phone: '123', location: { address: '1 St', city: 'Hre', country: 'ZW' } });
    store.addProvider({ name: 'SupplyCo', type: 'supplier', email: 'c@d.com', phone: '456', location: { address: '2 St', city: 'Hre', country: 'ZW' } });
    store.setFilters({ type: 'supplier' });
    const filtered = store.getFilteredProviders();
    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered.every(p => p.type === 'supplier')).toBe(true);
    store.setFilters({});
  });

  it('manages catalog items', () => {
    const store = useProviderStore.getState();
    const p = store.providers[0];
    if (!p) return;
    store.addCatalogItem(p.id, { name: 'Cement 32.5N', category: 'material', subcategory: 'Cement', description: 'Portland cement', unit: 'ton', unitPrice: 320, minOrder: 1, available: true, leadTimeDays: 3, tags: ['cement'], currency: 'USD', images: [], specifications: {} });
    const updated = store.getProvider(p.id);
    expect(updated?.catalog.length).toBe(1);
    expect(updated?.catalog[0].name).toBe('Cement 32.5N');
    store.removeCatalogItem(p.id, updated!.catalog[0].id);
    expect(store.getProvider(p.id)?.catalog.length).toBe(0);
  });

  it('manages credentials', () => {
    const store = useProviderStore.getState();
    const p = store.providers[0];
    if (!p) return;
    store.addCredential(p.id, { type: 'license', title: 'Civil Engineer License', issuingBody: 'ECZ', number: 'ECZ-2024-001', issueDate: '2024-01-15', expiryDate: '2027-01-15', status: 'active' });
    const updated = store.getProvider(p.id);
    expect(updated?.credentials.length).toBe(1);
    expect(updated?.credentials[0].verificationStatus).toBe('unverified');
  });

  it('adds services and portfolio', () => {
    const store = useProviderStore.getState();
    const p = store.providers[0];
    if (!p) return;
    store.addService(p.id, { name: 'Foundation Works', description: 'Strip footing and raft slab', category: 'Construction', pricingModel: 'fixed', price: 25000, currency: 'USD', availability: { days: ['Mon-Fri'], hours: '7am-5pm' }, serviceArea: ['Harare'] });
    store.addPortfolio(p.id, { title: 'Sunway Shopping Centre', description: '10,000m² retail development', category: 'Commercial', completionDate: '2025-06-01', value: 2500000, images: [] });
    expect(store.getProvider(p.id)?.services.length).toBe(1);
    expect(store.getProvider(p.id)?.portfolio.length).toBe(1);
  });
});

describe('Escrow Engine', () => {
  const baseEscrow = () => createEscrow({
    projectId: 'proj1', providerId: 'prov1', clientId: 'client1', totalAmount: 50000, milestones: [
      { title: 'Foundation', description: 'Foundation complete', amount: 15000, dueDate: '2026-08-01' },
      { title: 'Structure', description: 'Structure complete', amount: 25000, dueDate: '2026-09-15' },
      { title: 'Roofing', description: 'Roof complete', amount: 10000, dueDate: '2026-10-30' },
    ], terms: 'Standard release',
  });

  it('creates escrow with valid milestones', () => {
    const escrow = baseEscrow();
    expect(escrow.totalAmount).toBe(50000);
    expect(escrow.milestones.length).toBe(3);
    expect(escrow.status).toBe('locked');
  });

  it('throws on milestone amount mismatch', () => {
    expect(() => createEscrow({ projectId: 'p', providerId: 'p', clientId: 'c', totalAmount: 100, milestones: [{ title: 'Test', description: 'Test', amount: 50, dueDate: '2026-08-01' }], terms: '' })).toThrow();
  });

  it('completes a milestone', () => {
    const escrow = baseEscrow();
    const updated = completeMilestone(escrow, escrow.milestones[0].id, { type: 'photo', url: 'https://img.com/proof.jpg', uploadedBy: 'prov1', notes: 'Foundation done' });
    expect(updated.milestones[0].status).toBe('completed');
    expect(updated.milestones[0].completedAt).toBeDefined();
    expect(updated.milestones[0].verificationProof?.length).toBe(1);
  });

  it('verifies and releases a milestone', () => {
    let escrow = baseEscrow();
    escrow = completeMilestone(escrow, escrow.milestones[0].id);
    escrow = verifyMilestone(escrow, escrow.milestones[0].id, true);
    expect(escrow.milestones[0].status).toBe('verified');
    escrow = releaseFunds(escrow, escrow.milestones[0].id, 'client1');
    expect(escrow.milestones[0].status).toBe('released');
    expect(getEscrowProgress(escrow)).toBe(30);
  });

  it('disputes a milestone', () => {
    let escrow = baseEscrow();
    escrow = completeMilestone(escrow, escrow.milestones[0].id);
    escrow = verifyMilestone(escrow, escrow.milestones[0].id, false, 'Work not per specification');
    expect(escrow.milestones[0].status).toBe('disputed');
    expect(escrow.milestones[0].disputedReason).toBe('Work not per specification');
    expect(escrow.status).toBe('disputed');
  });

  it('detects overdue milestones', () => {
    const escrow = createEscrow({ projectId: 'p', providerId: 'p', clientId: 'c', totalAmount: 100, milestones: [{ title: 'Past', description: 'Overdue', amount: 100, dueDate: '2025-01-01' }], terms: '' });
    expect(getOverdueMilestones(escrow).length).toBe(1);
  });

  it('provides escrow summary', () => {
    const escrow = baseEscrow();
    const summary = getEscrowSummary(escrow);
    expect(summary.total).toBe(50000);
    expect(summary.progress).toBe(0);
    expect(summary.nextMilestone).toBeDefined();
  });

  it('calculates milestone timeline', () => {
    const escrow = baseEscrow();
    const timeline = getMilestoneTimeline(escrow);
    expect(timeline.length).toBe(3);
    expect(timeline[0].durationDays).toBeGreaterThan(0);
  });
});

describe('Procurement Engine', () => {
  const mockCatalog = [
    { id: 'c1', providerId: 'p1', name: 'Cement 32.5N', category: 'material' as const, subcategory: 'Cement', description: '', unit: 'ton', unitPrice: 320, currency: 'USD', minOrder: 1, available: true, leadTimeDays: 3, tags: [], images: [], complianceCertification: [], specifications: {}, createdAt: '', updatedAt: '' },
    { id: 'c2', providerId: 'p1', name: 'Steel Rebar Y12', category: 'material' as const, subcategory: 'Steel', description: '', unit: 'ton', unitPrice: 850, currency: 'USD', minOrder: 1, available: true, leadTimeDays: 5, tags: [], images: [], complianceCertification: [], specifications: {}, createdAt: '', updatedAt: '' },
    { id: 'c3', providerId: 'p2', name: 'Cement 42.5N', category: 'material' as const, subcategory: 'Cement', description: '', unit: 'ton', unitPrice: 380, currency: 'USD', minOrder: 1, available: true, leadTimeDays: 2, tags: [], images: [], complianceCertification: [], specifications: {}, createdAt: '', updatedAt: '' },
  ];

  it('matches suppliers by catalog coverage', () => {
    const matches = matchSuppliers(mockCatalog, { items: [{ catalogItemId: 'c1', quantity: 10 }, { catalogItemId: 'c2', quantity: 5 }] });
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].coverageScore).toBeGreaterThan(0);
  });

  it('filters suppliers that cannot meet required items', () => {
    const matches = matchSuppliers(mockCatalog, { items: [{ catalogItemId: 'c1', quantity: 10, required: true }, { catalogItemId: 'c999', quantity: 1, required: true }] });
    expect(matches.length).toBe(0);
  });

  it('prefers suppliers with better pricing and lead time', () => {
    const matches = matchSuppliers(mockCatalog, { items: [{ catalogItemId: 'c1', quantity: 10 }, { catalogItemId: 'c3', quantity: 5 }] });
    expect(matches.length).toBeGreaterThan(0);
  });

  it('creates procurement order', () => {
    const order = createProcurementOrder({ projectId: 'proj1', providerId: 'p1', items: [{ catalogItemId: 'c1', name: 'Cement', quantity: 10, unit: 'ton', unitPrice: 320 }], deliveryDate: '2026-08-15', deliveryLocation: 'Harare', notes: 'Deliver to site' });
    expect(order.items.length).toBe(1);
    expect(order.totalAmount).toBe(3200);
    expect(order.status).toBe('draft');
    expect(order.notes).toBe('Deliver to site');
  });

  it('creates RFQ', () => {
    const rfq = createRFQ({ projectId: 'proj1', title: 'Supply of Cement', description: '50 tons of 32.5N cement', items: [{ name: 'Cement 32.5N', description: 'Portland cement', quantity: 50, unit: 'ton', estimatedPrice: 16000 }], closingDate: '2026-08-30' });
    expect(rfq.items.length).toBe(1);
    expect(rfq.status).toBe('draft');
  });

  it('calculates labor needs from BOQ categories', () => {
    const labor = calculateLaborNeeds([{ category: 'substructure', quantity: 100, unit: 'm³' }, { category: 'superstructure', quantity: 200, unit: 'm³' }]);
    expect(labor.length).toBeGreaterThan(0);
    const mason = labor.find(l => l.role === 'Mason');
    expect(mason).toBeDefined();
    expect(mason!.totalHours).toBeGreaterThan(0);
  });

  it('schedules deliveries', () => {
    const order = createProcurementOrder({ projectId: 'p', providerId: 'p1', items: [{ catalogItemId: 'c1', name: 'Cement', quantity: 10, unit: 'ton', unitPrice: 320 }, { catalogItemId: 'c2', name: 'Steel', quantity: 5, unit: 'ton', unitPrice: 850 }] });
    const schedule = scheduleDeliveries(order, '2026-08-01');
    expect(schedule.length).toBe(2);
    expect(schedule[0].status).toBe('scheduled');
  });

  it('calculates freight costs', () => {
    const order = createProcurementOrder({ projectId: 'p', providerId: 'p1', items: [{ catalogItemId: 'c1', name: 'Cement', quantity: 10, unit: 'ton', unitPrice: 320 }] });
    const local = calculateFreight(order, 30);
    expect(local.method).toContain('Local');
    const regional = calculateFreight(order, 150);
    expect(regional.method).toContain('Regional');
    const distant = calculateFreight(order, 500);
    expect(distant.method).toContain('Long-distance');
  });

  it('builds order timeline', () => {
    const order = createProcurementOrder({ projectId: 'p', providerId: 'p1', items: [{ catalogItemId: 'c1', name: 'Cement', quantity: 10, unit: 'ton', unitPrice: 320 }] });
    const timeline = getOrderTimeline(order);
    expect(timeline.length).toBeGreaterThanOrEqual(1);
    expect(timeline[0].status).toBe('draft');
  });
});

describe('Execution Monitor', () => {
  const mockData = {
    tasks: [
      { id: 't1', plannedDays: 10, actualDays: 10, dependencies: [] },
      { id: 't2', plannedDays: 15, actualDays: 18, dependencies: ['t1'] },
      { id: 't3', plannedDays: 20, actualDays: 0, dependencies: ['t2'] },
    ],
    budgetCategories: [
      { category: 'Substructure', budgeted: 15000, actual: 14500 },
      { category: 'Superstructure', budgeted: 35000, actual: 5000 },
    ],
    qualityMetrics: [
      { metric: 'Concrete Strength', score: 28, target: 25 },
      { metric: 'Finish Quality', score: 3.5, target: 4.0 },
    ],
    resources: [
      { role: 'Mason', required: 10, assigned: 8 },
      { role: 'Laborer', required: 20, assigned: 15 },
    ],
  };

  it('computes full execution status', () => {
    const status = computeExecutionStatus(mockData);
    expect(status.overallProgress).toBeGreaterThanOrEqual(0);
    expect(status.schedule.length).toBe(3);
    expect(status.budget.length).toBe(2);
    expect(status.quality.length).toBe(2);
    expect(status.resources.length).toBe(2);
  });

  it('finds critical path', () => {
    const path = findCriticalPath(mockData.tasks);
    expect(path.length).toBeGreaterThan(0);
    expect(path).toContain('t1');
  });

  it('calculates schedule variance', () => {
    expect(scheduleVariance(mockData.tasks)).toBe(-17);
  });

  it('calculates budget variance', () => {
    expect(budgetVariance(mockData.budgetCategories)).toBe(30500);
  });

  it('calculates cost performance index', () => {
    const cpi = costPerformanceIndex(mockData.budgetCategories);
    expect(cpi).toBeGreaterThan(0);
  });
});

describe('Extension Registry', () => {
  it('creates registry with 5 built-in extensions', () => {
    const registry = createExtensionRegistry();
    expect(registry.size).toBe(5);
  });

  it('loads an extension', () => {
    const registry = createExtensionRegistry();
    expect(loadExtension(registry, 'bi-takeoff')).toBe(true);
    const ext = registry.get('bi-takeoff');
    expect(ext?.loaded).toBe(true);
  });

  it('disables and enables extensions', () => {
    const registry = createExtensionRegistry();
    loadExtension(registry, 'bi-takeoff');
    disableExtension(registry, 'bi-takeoff');
    expect(registry.get('bi-takeoff')?.enabled).toBe(false);
    enableExtension(registry, 'bi-takeoff');
    expect(registry.get('bi-takeoff')?.enabled).toBe(true);
  });

  it('triggers hooks on loaded extensions', () => {
    const registry = createExtensionRegistry();
    loadExtension(registry, 'bi-takeoff');
    const results = triggerHook(registry, 'onPlanLoad', { planId: 'plan1' });
    expect(results.length).toBe(1);
  });

  it('installs and uninstalls extensions', () => {
    const registry = createExtensionRegistry();
    const ext = installExtension(registry, { id: 'custom-ext', name: 'Custom', version: '1.0.0', description: 'Test', author: 'User', entrypoint: 'custom.js', permissions: [], hooks: [], config: {} });
    expect(registry.size).toBe(6);
    expect(ext.manifest.name).toBe('Custom');
    uninstallExtension(registry, 'custom-ext');
    expect(registry.size).toBe(5);
  });

  it('returns enabled extensions', () => {
    const registry = createExtensionRegistry();
    disableExtension(registry, 'bi-compliance');
    const enabled = getEnabledExtensions(registry);
    expect(enabled.length).toBe(4);
  });
});
