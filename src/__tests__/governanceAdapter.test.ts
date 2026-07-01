import { describe, it, expect } from 'vitest';
import { buildGovernanceSummary } from '@/adapters/governanceAdapter';
import type { DesignOption } from '@/domain/boq';
import type { ProjectTransaction } from '@/types';

function makeDesign(overrides?: Partial<DesignOption>): DesignOption {
  return {
    id: 'design-1',
    name: 'Test Family Home',
    grossFloorArea: 120,
    floors: 1,
    elements: [
      { id: 'e1', type: 'wall', category: 'wall', name: 'External wall', unit: 'm2', quantity: 96 },
      { id: 'e2', type: 'wall', category: 'wall', name: 'Internal wall', unit: 'm2', quantity: 40 },
    ],
    ...overrides,
  };
}

function makeTx(overrides?: Partial<ProjectTransaction>): ProjectTransaction {
  return {
    id: 'tx-1',
    projectId: 'proj-1',
    actor: 'USER',
    action: 'CREATE',
    entityType: 'design',
    entityId: 'design-1',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('buildGovernanceSummary', () => {
  it('returns Draft status when no design exists', () => {
    const summary = buildGovernanceSummary({});
    expect(summary.status).toBe('draft');
    expect(summary.fingerprint).toBeNull();
    expect(summary.checklistItems.every((i) => !i.satisfied)).toBe(true);
  });

  it('returns Ready for Review when 5 of 6 items satisfied (no analysis)', () => {
    const summary = buildGovernanceSummary({
      selectedDesign: makeDesign(),
      hasBim: true,
      hasBoq: true,
      hasAnalysis: false,
    });
    expect(summary.status).toBe('ready_for_review');
  });

  it('returns Reviewed when all 6 non-professional checklist items are satisfied', () => {
    const summary = buildGovernanceSummary({
      selectedDesign: makeDesign(),
      hasBim: true,
      hasBoq: true,
      hasAnalysis: true,
    });
    const satisfied = summary.checklistItems.filter((i) => i.satisfied).length;
    expect(satisfied).toBe(6);
    expect(summary.status).toBe('reviewed');
  });

  it('returns Exported when a transaction has EXPORT action', () => {
    const summary = buildGovernanceSummary({
      selectedDesign: makeDesign(),
      hasBim: true,
      hasBoq: true,
      hasAnalysis: true,
      transactions: [makeTx({ action: 'EXPORT', entityType: 'export' })],
    });
    expect(summary.status).toBe('exported');
  });

  it('generates stable fingerprint for same design', () => {
    const design = makeDesign();
    const a = buildGovernanceSummary({ selectedDesign: design });
    const b = buildGovernanceSummary({ selectedDesign: design });
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it('generates different fingerprints for different designs', () => {
    const a = buildGovernanceSummary({ selectedDesign: makeDesign({ name: 'House A', grossFloorArea: 100 }) });
    const b = buildGovernanceSummary({ selectedDesign: makeDesign({ name: 'House B', grossFloorArea: 200 }) });
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });

  it('returns role descriptions including Owner, Reviewer, Viewer', () => {
    const summary = buildGovernanceSummary({});
    const roles = summary.roleDescriptions.map((r) => r.role);
    expect(roles).toContain('Owner');
    expect(roles).toContain('Reviewer');
    expect(roles).toContain('Viewer');
  });

  it('returns recent transactions limited to 5', () => {
    const txs = Array.from({ length: 10 }, (_, i) => makeTx({ id: `tx-${i}` }));
    const summary = buildGovernanceSummary({ transactions: txs });
    expect(summary.recentTransactions.length).toBe(5);
  });

  it('returns recommendations when design is missing', () => {
    const summary = buildGovernanceSummary({});
    expect(summary.recommendations.length).toBeGreaterThan(0);
    expect(summary.recommendations[0]).toContain('Start by generating a design');
  });

  it('returns warnings when design exists', () => {
    const summary = buildGovernanceSummary({ selectedDesign: makeDesign() });
    expect(summary.warnings.length).toBeGreaterThan(0);
    expect(summary.warnings[0]).toContain('local demo');
  });

  it('does not throw when called with null/undefined values', () => {
    expect(() =>
      buildGovernanceSummary({
        selectedDesign: null,
        hasBim: false,
        hasBoq: false,
        hasAnalysis: false,
        transactions: undefined,
      }),
    ).not.toThrow();
  });

  it('does not return NaN in any numeric field', () => {
    const summary = buildGovernanceSummary({ selectedDesign: makeDesign({ grossFloorArea: NaN }) });
    const allValues = JSON.stringify(summary);
    expect(allValues).not.toContain('NaN');
  });

  it('sets generatedAt and lastSaved from project timestamps', () => {
    const summary = buildGovernanceSummary({
      selectedDesign: makeDesign(),
      projectCreatedAt: '2025-01-01T00:00:00.000Z',
      projectUpdatedAt: '2025-06-15T00:00:00.000Z',
    });
    expect(summary.generatedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(summary.lastSaved).toBe('2025-06-15T00:00:00.000Z');
  });
});
