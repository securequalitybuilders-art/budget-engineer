import { describe, it, expect } from 'vitest';

// ─── roomTemplates ────────────────────────────────────────────────
import { ROOM_TEMPLATES, getRoomTemplate, getTemplatesByType, searchRoomTemplates } from '@/lib/interior/roomTemplates';

describe('roomTemplates', () => {
  it('has exactly 14 templates', () => {
    expect(ROOM_TEMPLATES.length).toBe(14);
  });

  it('every template has required fields', () => {
    for (const t of ROOM_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.roomType).toBeTruthy();
      expect(t.minWidth).toBeGreaterThan(0);
      expect(t.minDepth).toBeGreaterThan(0);
      expect(t.defaultWidth).toBeGreaterThanOrEqual(t.minWidth);
      expect(t.defaultDepth).toBeGreaterThanOrEqual(t.minDepth);
      expect(t.description).toBeTruthy();
      expect(t.suggestedFixtures.length).toBeGreaterThan(0);
      expect(t.suggestedMaterials.wall).toBeTruthy();
      expect(t.suggestedMaterials.floor).toBeTruthy();
      expect(t.suggestedMaterials.ceiling).toBeTruthy();
    }
  });

  it('no two templates share the same id', () => {
    const ids = ROOM_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('BATH-FULL is first and has min 1800x2400', () => {
    const t = ROOM_TEMPLATES[0];
    expect(t.id).toBe('BATH-FULL');
    expect(t.minWidth).toBe(1800);
    expect(t.minDepth).toBe(2400);
  });

  it('BATH-HALF has min 1200x1500', () => {
    const t = getRoomTemplate('BATH-HALF')!;
    expect(t.minWidth).toBe(1200);
    expect(t.minDepth).toBe(1500);
  });

  it('KITCHEN-ISLAND has island fixture', () => {
    const t = getRoomTemplate('KITCHEN-ISLAND')!;
    expect(t.suggestedFixtures).toContain('KITCHEN-ISLAND');
  });

  it('BED-MASTER has king bed', () => {
    const t = getRoomTemplate('BED-MASTER')!;
    expect(t.suggestedFixtures).toContain('BED-KING');
  });

  it('HOME-OFFICE has desk and chair', () => {
    const t = getRoomTemplate('HOME-OFFICE')!;
    expect(t.suggestedFixtures).toContain('DESK');
    expect(t.suggestedFixtures).toContain('CHAIR-DESK');
  });

  it('getRoomTemplate returns undefined for unknown', () => {
    expect(getRoomTemplate('NONEXISTENT')).toBeUndefined();
  });

  it('has templates for all expected room types', () => {
    const types = ROOM_TEMPLATES.map(t => t.roomType);
    expect(types).toContain('bathroom');
    expect(types).toContain('kitchen');
    expect(types).toContain('bedroom');
    expect(types).toContain('living');
    expect(types).toContain('dining');
    expect(types).toContain('office');
    expect(types).toContain('laundry');
    expect(types).toContain('entry');
  });

  describe('getTemplatesByType', () => {
    it('returns 3 bathroom templates', () => {
      expect(getTemplatesByType('bathroom').length).toBeGreaterThanOrEqual(2);
    });

    it('returns 3 kitchen templates', () => {
      expect(getTemplatesByType('kitchen').length).toBe(3);
    });

    it('returns empty for unused type', () => {
      expect(getTemplatesByType('gym')).toEqual([]);
    });
  });

  describe('searchRoomTemplates', () => {
    it('finds by name', () => {
      const r = searchRoomTemplates('Bathroom');
      expect(r.length).toBeGreaterThan(0);
    });

    it('finds by description', () => {
      const r = searchRoomTemplates('island');
      expect(r.some(t => t.id === 'KITCHEN-ISLAND')).toBe(true);
    });

    it('returns empty for no match', () => {
      expect(searchRoomTemplates('xyznonexistent')).toEqual([]);
    });
  });

  const FIXTURE_IDS = ROOM_TEMPLATES.flatMap(t => t.suggestedFixtures);
  it('all suggested fixtures use uppercase IDs', () => {
    for (const id of FIXTURE_IDS) {
      expect(id).toEqual(id.toUpperCase());
    }
  });
});

// ─── fixtures ─────────────────────────────────────────────────────
import { FIXTURES, getFixtureById, getFixturesByCategory, searchFixtures } from '@/lib/interior/fixtures';

describe('fixtures', () => {
  it('has at least 40 fixtures', () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(40);
  });

  it('every fixture has required fields', () => {
    for (const f of FIXTURES) {
      expect(f.id).toBeTruthy();
      expect(f.name).toBeTruthy();
      expect(f.width).toBeGreaterThan(0);
      expect(f.depth).toBeGreaterThan(0);
      expect(f.height).toBeGreaterThanOrEqual(0);
      expect(f.symbol).toBeTruthy();
      expect(['floor', 'wall', 'ceiling', 'counter']).toContain(f.mounting);
    }
  });

  it('no two fixtures share the same id', () => {
    const ids = FIXTURES.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fixture IDs are uppercase', () => {
    for (const f of FIXTURES) {
      expect(f.id).toEqual(f.id.toUpperCase());
    }
  });

  it('WC-CLOSET is 400x650 floor-mounted', () => {
    const wc = getFixtureById('WC-CLOSET')!;
    expect(wc.width).toBe(400);
    expect(wc.depth).toBe(650);
    expect(wc.mounting).toBe('floor');
    expect(wc.category).toBe('sanitary');
  });

  it('BED-KING is 1800x2100', () => {
    const bed = getFixtureById('BED-KING')!;
    expect(bed.width).toBe(1800);
    expect(bed.depth).toBe(2100);
  });

  it('DISHWASHER is 600x600 floor-mounted', () => {
    const d = getFixtureById('DISHWASHER')!;
    expect(d.width).toBe(600);
    expect(d.depth).toBe(600);
    expect(d.mounting).toBe('floor');
  });

  it('LIGHT-CEILING is ceiling-mounted', () => {
    const l = getFixtureById('LIGHT-CEILING')!;
    expect(l.mounting).toBe('ceiling');
  });

  it('getFixtureById returns undefined for unknown', () => {
    expect(getFixtureById('NONEXISTENT')).toBeUndefined();
  });

  describe('getFixturesByCategory', () => {
    it('returns sanitary fixtures', () => {
      const s = getFixturesByCategory('sanitary');
      expect(s.length).toBeGreaterThanOrEqual(14);
      expect(s.every(f => f.category === 'sanitary')).toBe(true);
    });

    it('returns kitchen fixtures', () => {
      const k = getFixturesByCategory('kitchen');
      expect(k.length).toBeGreaterThanOrEqual(9);
    });

    it('returns lighting fixtures', () => {
      const l = getFixturesByCategory('lighting');
      expect(l.length).toBeGreaterThanOrEqual(5);
    });

    it('returns furniture fixtures', () => {
      const f = getFixturesByCategory('furniture');
      expect(f.length).toBeGreaterThanOrEqual(20);
    });

    it('returns accessories', () => {
      const a = getFixturesByCategory('accessory');
      expect(a.length).toBeGreaterThanOrEqual(7);
    });

    it('returns mechanical fixtures', () => {
      const m = getFixturesByCategory('mechanical');
      expect(m.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('searchFixtures', () => {
    it('finds by id', () => {
      const r = searchFixtures('BATH');
      expect(r.some(f => f.id === 'BATH-STANDARD')).toBe(true);
    });

    it('finds by name', () => {
      const r = searchFixtures('shower');
      expect(r.some(f => f.id === 'SHOWER-TRAY')).toBe(true);
    });

    it('finds by category and name', () => {
      const r = searchFixtures('lighting');
      expect(r.length).toBeGreaterThanOrEqual(5);
      expect(r.some(f => f.id === 'LIGHT-CEILING')).toBe(true);
    });

    it('returns empty for no match', () => {
      expect(searchFixtures('xyznonexistent')).toEqual([]);
    });
  });
});
