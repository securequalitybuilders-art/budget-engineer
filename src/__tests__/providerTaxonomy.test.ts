import { describe, it, expect } from 'vitest';
import {
  PROVIDER_CATEGORIES,
  PROVIDER_SPECIALTIES,
  ALL_SPECIALTIES,
  providerTypeForCategory,
  providerCategoryForType,
  specialtiesForCategory,
  specialtyLabel,
  specialtyInfo,
  categoryLabel,
} from '@/domain/providerTaxonomy';

describe('provider taxonomy — matrix integrity', () => {
  it('defines the 5 matrix groups', () => {
    expect(PROVIDER_CATEGORIES.map((c) => c.value)).toEqual([
      'professional-consultant',
      'general-contractor',
      'subcontracting-firm',
      'skilled-artisan',
      'testing-qa',
    ]);
  });

  it('every category has metadata', () => {
    for (const c of PROVIDER_CATEGORIES) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.shortLabel.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(0);
    }
  });

  it('provides 24 granular specialties across the matrix', () => {
    expect(ALL_SPECIALTIES).toHaveLength(24);
    expect(PROVIDER_SPECIALTIES['professional-consultant']).toHaveLength(7);
    expect(PROVIDER_SPECIALTIES['general-contractor']).toHaveLength(3);
    expect(PROVIDER_SPECIALTIES['subcontracting-firm']).toHaveLength(7);
    expect(PROVIDER_SPECIALTIES['skilled-artisan']).toHaveLength(4);
    expect(PROVIDER_SPECIALTIES['testing-qa']).toHaveLength(3);
  });

  it('every specialty has a unique id, label and description', () => {
    const ids = ALL_SPECIALTIES.map((s) => s.value);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of ALL_SPECIALTIES) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
    }
  });

  it('artisan specialties carry their trade rosters', () => {
    const civil = PROVIDER_SPECIALTIES['skilled-artisan'].find((s) => s.value === 'civil-structural-trade');
    expect(civil?.trades).toContain('Steel Fixers');
    expect(civil?.trades).toContain('Masons & Bricklayers');
    const mep = PROVIDER_SPECIALTIES['skilled-artisan'].find((s) => s.value === 'mep-trade');
    expect(mep?.trades).toContain('Certified Electricians');
  });

  it('maps every category to a non-supplier coarse provider type', () => {
    for (const c of PROVIDER_CATEGORIES) {
      expect(providerTypeForCategory(c.value)).not.toBe('supplier');
    }
    expect(providerTypeForCategory('professional-consultant')).toBe('professional');
    expect(providerTypeForCategory('general-contractor')).toBe('contractor');
    expect(providerTypeForCategory('subcontracting-firm')).toBe('subcontractor');
    expect(providerTypeForCategory('skilled-artisan')).toBe('subcontractor');
    expect(providerTypeForCategory('testing-qa')).toBe('consultant');
  });

  it('reverses coarse types back to a category where one exists', () => {
    expect(providerCategoryForType('professional')).toBe('professional-consultant');
    expect(providerCategoryForType('contractor')).toBe('general-contractor');
    expect(providerCategoryForType('subcontractor')).toBe('subcontracting-firm');
    expect(providerCategoryForType('consultant')).toBe('testing-qa');
    expect(providerCategoryForType('supplier')).toBeUndefined();
  });

  it('helpers resolve labels and filterable specialty lists', () => {
    expect(specialtyLabel('quantity-surveyor')).toBe('Quantity Surveyor & Budget Engineer');
    expect(specialtyInfo('hse-officer')?.description).toContain('EIA');
    expect(specialtyInfo('does-not-exist' as never)).toBeUndefined();
    expect(specialtyLabel('does-not-exist' as never)).toBe('does-not-exist');
    expect(categoryLabel('testing-qa')).toContain('Testing');
    expect(specialtiesForCategory(undefined)).toEqual([]);
    expect(specialtiesForCategory('general-contractor')).toHaveLength(3);
  });
});
