import { describe, it, expect, beforeEach } from 'vitest';

// ─── discipline definitions ───────────────────────────────────────
import {
  DISCIPLINES,
  getDiscipline,
  getDisciplineByAiaCode,
  getDisciplineByAiaCodeOrFail,
  DEFAULT_DISCIPLINE,
  type DisciplineId,
} from '@/lib/studio/discipline';

describe('discipline definitions', () => {
  it('has all 8 disciplines', () => {
    expect(DISCIPLINES.length).toBe(8);
  });

  const ids: DisciplineId[] = ['ARCH', 'STR', 'MEP', 'ELEC', 'PLUM', 'INT', 'LAND', 'CIVIL'];

  it.each(ids)('discipline %s has required fields', (id) => {
    const d = getDiscipline(id);
    expect(d.id).toBe(id);
    expect(d.label).toBeTruthy();
    expect(d.shortLabel).toBeTruthy();
    expect(d.aiaCode).toMatch(/^[ASMEPILC]$/);
    expect(d.color).toMatch(/^#/);
    expect(d.description).toBeTruthy();
    expect(d.icon).toBeTruthy();
  });

  it('ARCH has purple colour', () => {
    expect(getDiscipline('ARCH').color).toBe('#8B5CF6');
  });

  it('STR has red colour', () => {
    expect(getDiscipline('STR').color).toBe('#EF4444');
  });

  it('PLUM has blue colour', () => {
    expect(getDiscipline('PLUM').color).toBe('#3B82F6');
  });

  it('MEP has amber colour', () => {
    expect(getDiscipline('MEP').color).toBe('#F59E0B');
  });

  it('ELEC has yellow colour', () => {
    expect(getDiscipline('ELEC').color).toBe('#FBBF24');
  });

  it('INT has pink colour', () => {
    expect(getDiscipline('INT').color).toBe('#EC4899');
  });

  it('LAND has green colour', () => {
    expect(getDiscipline('LAND').color).toBe('#22C55E');
  });

  it('CIVIL has purple colour', () => {
    expect(getDiscipline('CIVIL').color).toBe('#A855F7');
  });

  it('getDiscipline throws for unknown id', () => {
    expect(() => getDiscipline('FAKE' as any)).toThrow('Unknown discipline');
  });

  it('default discipline is ARCH', () => {
    expect(DEFAULT_DISCIPLINE).toBe('ARCH');
  });

  describe('getDisciplineByAiaCode', () => {
    it('finds ARCH by A', () => {
      const d = getDisciplineByAiaCode('A');
      expect(d).toBeDefined();
      expect(d!.id).toBe('ARCH');
    });

    it('finds STR by S', () => {
      const d = getDisciplineByAiaCode('S');
      expect(d!.id).toBe('STR');
    });

    it('finds MEP by M', () => {
      const d = getDisciplineByAiaCode('M');
      expect(d!.id).toBe('MEP');
    });

    it('returns undefined for unknown code', () => {
      expect(getDisciplineByAiaCode('X' as any)).toBeUndefined();
    });
  });

  describe('getDisciplineByAiaCodeOrFail', () => {
    it('returns discipline for valid code', () => {
      expect(getDisciplineByAiaCodeOrFail('A').id).toBe('ARCH');
    });

    it('throws for unknown code', () => {
      expect(() => getDisciplineByAiaCodeOrFail('X' as any)).toThrow('No studio discipline');
    });
  });

  it('each discipline maps to a valid AIA code', () => {
    for (const d of DISCIPLINES) {
      expect(['A', 'S', 'M', 'E', 'P', 'I', 'L', 'C']).toContain(d.aiaCode);
    }
  });

  it('no two disciplines share the same id', () => {
    const ids = DISCIPLINES.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no two disciplines share the same AIA code', () => {
    const codes = DISCIPLINES.map(d => d.aiaCode);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

// ─── discipline store ─────────────────────────────────────────────
import { useDisciplineStore } from '@/stores/disciplineStore';

describe('disciplineStore', () => {
  beforeEach(() => {
    useDisciplineStore.setState({
      currentDiscipline: 'ARCH',
      visibleDisciplines: ['ARCH', 'STR', 'MEP', 'ELEC', 'PLUM', 'INT', 'LAND', 'CIVIL'],
      disciplineFilter: null,
    });
  });

  it('defaults to ARCH', () => {
    const s = useDisciplineStore.getState();
    expect(s.currentDiscipline).toBe('ARCH');
  });

  it('setCurrentDiscipline changes discipline', () => {
    useDisciplineStore.getState().setCurrentDiscipline('STR');
    expect(useDisciplineStore.getState().currentDiscipline).toBe('STR');
  });

  it('showAllDisciplines shows all 8', () => {
    useDisciplineStore.getState().hideAllDisciplines();
    useDisciplineStore.getState().showAllDisciplines();
    expect(useDisciplineStore.getState().visibleDisciplines.length).toBe(8);
  });

  it('hideAllDisciplines empties visible list', () => {
    useDisciplineStore.getState().hideAllDisciplines();
    expect(useDisciplineStore.getState().visibleDisciplines).toEqual([]);
  });

  it('toggleDisciplineVisibility removes a discipline', () => {
    useDisciplineStore.getState().toggleDisciplineVisibility('MEP');
    expect(useDisciplineStore.getState().visibleDisciplines).not.toContain('MEP');
  });

  it('toggleDisciplineVisibility adds back a discipline', () => {
    useDisciplineStore.getState().toggleDisciplineVisibility('MEP');
    useDisciplineStore.getState().toggleDisciplineVisibility('MEP');
    expect(useDisciplineStore.getState().visibleDisciplines).toContain('MEP');
  });

  it('setDisciplineFilter sets filter', () => {
    useDisciplineStore.getState().setDisciplineFilter('ARCH');
    expect(useDisciplineStore.getState().disciplineFilter).toBe('ARCH');
  });

  it('setDisciplineFilter(null) clears filter', () => {
    useDisciplineStore.getState().setDisciplineFilter('ARCH');
    useDisciplineStore.getState().setDisciplineFilter(null);
    expect(useDisciplineStore.getState().disciplineFilter).toBeNull();
  });
});
