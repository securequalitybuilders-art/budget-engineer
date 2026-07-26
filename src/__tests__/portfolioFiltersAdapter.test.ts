import { describe, it, expect } from 'vitest';
import { filterAndSortPortfolioProjects } from '@/adapters/portfolioFiltersAdapter';
import type { SchemePortfolioItem } from '@/lib/portfolio/executive-portfolio';

function makeScheme(overrides?: Partial<SchemePortfolioItem>): SchemePortfolioItem {
  return {
    id: 's1',
    name: 'Alpha House',
    isArchived: false,
    grandTotal: 1000000,
    subtotal: 900000,
    wallsTotal: 300000,
    slabsTotal: 200000,
    roofTotal: 150000,
    openingsTotal: 100000,
    objectsTotal: 50000,
    zoneCount: 6,
    wallCount: 12,
    costPerZone: 166667,
    ...overrides,
  };
}

describe('filterAndSortPortfolioProjects', () => {
  it('returns all projects when no filters are active', () => {
    const projects = [makeScheme({ id: '1' }), makeScheme({ id: '2' })];
    const result = filterAndSortPortfolioProjects({ projects, search: '', statusFilter: 'all', sortBy: 'newest' });
    expect(result).toHaveLength(2);
  });

  it('filters by search name (case-insensitive)', () => {
    const projects = [
      makeScheme({ id: '1', name: 'Alpha House' }),
      makeScheme({ id: '2', name: 'Beta Villa' }),
    ];
    const result = filterAndSortPortfolioProjects({ projects, search: 'alpha', statusFilter: 'all', sortBy: 'newest' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters active projects only', () => {
    const projects = [
      makeScheme({ id: '1', isArchived: false }),
      makeScheme({ id: '2', isArchived: true }),
    ];
    const result = filterAndSortPortfolioProjects({ projects, search: '', statusFilter: 'active', sortBy: 'newest' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters archived projects only', () => {
    const projects = [
      makeScheme({ id: '1', isArchived: false }),
      makeScheme({ id: '2', isArchived: true }),
    ];
    const result = filterAndSortPortfolioProjects({ projects, search: '', statusFilter: 'archived', sortBy: 'newest' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('sorts by highest cost', () => {
    const projects = [
      makeScheme({ id: '1', grandTotal: 50000 }),
      makeScheme({ id: '2', grandTotal: 100000 }),
      makeScheme({ id: '3', grandTotal: 75000 }),
    ];
    const result = filterAndSortPortfolioProjects({ projects, search: '', statusFilter: 'all', sortBy: 'highest-cost' });
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('3');
    expect(result[2].id).toBe('1');
  });

  it('sorts by lowest cost', () => {
    const projects = [
      makeScheme({ id: '1', grandTotal: 100000 }),
      makeScheme({ id: '2', grandTotal: 50000 }),
    ];
    const result = filterAndSortPortfolioProjects({ projects, search: '', statusFilter: 'all', sortBy: 'lowest-cost' });
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('1');
  });

  it('sorts by name alphabetically', () => {
    const projects = [
      makeScheme({ id: '1', name: 'Zebra Lodge' }),
      makeScheme({ id: '2', name: 'Alpha House' }),
    ];
    const result = filterAndSortPortfolioProjects({ projects, search: '', statusFilter: 'all', sortBy: 'name' });
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('1');
  });

  it('combines search + status + sort', () => {
    const projects = [
      makeScheme({ id: '1', name: 'Alpha House', isArchived: false, grandTotal: 50000 }),
      makeScheme({ id: '2', name: 'Alpha Villa', isArchived: true, grandTotal: 100000 }),
      makeScheme({ id: '3', name: 'Beta Villa', isArchived: false, grandTotal: 75000 }),
    ];
    const result = filterAndSortPortfolioProjects({ projects, search: 'alpha', statusFilter: 'active', sortBy: 'highest-cost' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('does not mutate the original array', () => {
    const projects = [
      makeScheme({ id: '2', grandTotal: 100000 }),
      makeScheme({ id: '1', grandTotal: 50000 }),
    ];
    const originalIds = projects.map((p) => p.id).join(',');
    filterAndSortPortfolioProjects({ projects, search: '', statusFilter: 'all', sortBy: 'name' });
    expect(projects.map((p) => p.id).join(',')).toBe(originalIds);
  });

  it('handles empty projects array', () => {
    const result = filterAndSortPortfolioProjects({ projects: [], search: '', statusFilter: 'all', sortBy: 'newest' });
    expect(result).toHaveLength(0);
  });

  it('handles zero grandTotal safely in cost sort', () => {
    const projects = [
      makeScheme({ id: '1', grandTotal: 0 }),
      makeScheme({ id: '2', grandTotal: 50000 }),
    ];
    const result = filterAndSortPortfolioProjects({ projects, search: '', statusFilter: 'all', sortBy: 'lowest-cost' });
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
  });
});
