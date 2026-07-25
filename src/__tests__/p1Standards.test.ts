import { describe, it, expect } from 'vitest';

// ─── dimensionStyles ──────────────────────────────────────────────
import {
  getDimensionStyle,
  listDimensionStyles,
  formatDimension,
  formatDimensionLabel,
  dimArrowPath,
  type DimensionStyle,
} from '@/lib/drawings/dimensionStyles';

describe('dimensionStyles', () => {
  const STYLE_NAMES = ['Standard', 'Architectural', 'Structural', 'Site', 'Small', 'MEP'];

  it.each(STYLE_NAMES)('has style: %s', (name) => {
    const s = getDimensionStyle(name);
    expect(s.name).toBe(name);
    expect(s.textHeight).toBeGreaterThan(0);
    expect(s.arrowSize).toBeGreaterThan(0);
  });

  it('returns Standard for unknown style', () => {
    const s = getDimensionStyle('Bogus');
    expect(s.name).toBe('Standard');
  });

  it('lists all 6 styles', () => {
    expect(listDimensionStyles().sort()).toEqual(STYLE_NAMES.sort());
  });

  it('MEP style has blue colour and mm units', () => {
    const s = getDimensionStyle('MEP');
    expect(s.color).toBe('#2563eb');
    expect(s.textColor).toBe('#2563eb');
    expect(s.lineColor).toBe('#2563eb');
    expect(s.units).toBe('mm');
    expect(s.arrowType).toBe('arrow');
  });

  it('Architectural uses tick arrows and mm', () => {
    const s = getDimensionStyle('Architectural');
    expect(s.arrowType).toBe('tick');
    expect(s.units).toBe('mm');
    expect(s.precision).toBe(0);
  });

  it('Site uses metres with 1 decimal', () => {
    const s = getDimensionStyle('Site');
    expect(s.units).toBe('m');
    expect(s.precision).toBe(1);
    expect(s.color).toBe('#f97316');
  });

  it('Structural uses red arrows', () => {
    const s = getDimensionStyle('Structural');
    expect(s.color).toBe('#ef4444');
    expect(s.arrowType).toBe('arrow');
    expect(s.precision).toBe(1);
  });

  it('Small has minimal text height', () => {
    const s = getDimensionStyle('Small');
    expect(s.textHeight).toBe(4);
    expect(s.arrowSize).toBe(2.5);
  });

  describe('formatDimension', () => {
    it('formats mm values without units', () => {
      const s = getDimensionStyle('Architectural');
      expect(formatDimension(4500, s)).toBe('4500');
      expect(formatDimension(0, s)).toBe('0');
    });

    it('formats m values with m suffix', () => {
      const s = getDimensionStyle('Site');
      expect(formatDimension(4500, s)).toBe('4.5m');
      expect(formatDimension(10000, s)).toBe('10.0m');
    });

    it('respects precision', () => {
      const s: DimensionStyle = {
        name: 'Test', textHeight: 6, arrowSize: 4,
        extensionLineExtend: 2, offsetFromOrigin: 2,
        precision: 2, units: 'mm', color: '#000',
        arrowType: 'arrow', textColor: '#000', lineColor: '#000',
      };
      expect(formatDimension(3456, s)).toBe('3456.00');
    });
  });

  describe('formatDimensionLabel', () => {
    it('formats with locale separators', () => {
      const s = getDimensionStyle('Architectural');
      expect(formatDimensionLabel(4500, s)).toBe('4,500');
    });

    it('divides by 1000 for m units', () => {
      const s = getDimensionStyle('Site');
      expect(formatDimensionLabel(4500, s)).toBe('4.5');
    });
  });

  describe('dimArrowPath', () => {
    it('returns arrow path for arrow type', () => {
      const s = getDimensionStyle('Standard');
      const p = dimArrowPath(s);
      expect(p).toContain('M 0 0');
      expect(p).toContain('Z');
    });

    it('returns tick path for tick type', () => {
      const s = getDimensionStyle('Architectural');
      const p = dimArrowPath(s);
      expect(p).toContain('M ');
      expect(p).toContain('L ');
      expect(p).not.toContain('Z');
    });

    it('returns dot path for dot type', () => {
      const s: DimensionStyle = {
        name: 'Dot', textHeight: 6, arrowSize: 4,
        extensionLineExtend: 2, offsetFromOrigin: 2,
        precision: 0, units: 'mm', color: '#000',
        arrowType: 'dot', textColor: '#000', lineColor: '#000',
      };
      const p = dimArrowPath(s);
      expect(p).toContain('A ');
    });

    it('returns empty for none type', () => {
      const s: DimensionStyle = {
        name: 'None', textHeight: 6, arrowSize: 4,
        extensionLineExtend: 2, offsetFromOrigin: 2,
        precision: 0, units: 'mm', color: '#000',
        arrowType: 'none', textColor: '#000', lineColor: '#000',
      };
      expect(dimArrowPath(s)).toBe('');
    });
  });
});

// ─── layerStandard ────────────────────────────────────────────────
import {
  AIA_LAYERS,
  getAiaLayer,
  getAiaLayersByDiscipline,
  searchAiaLayers,
  getDisciplinePrefix,
  aiaLayerColor,
} from '@/lib/drawings/layerStandard';

describe('layerStandard', () => {
  it('has at least 50 layers', () => {
    expect(AIA_LAYERS.length).toBeGreaterThanOrEqual(50);
  });

  it('every layer has required fields', () => {
    for (const l of AIA_LAYERS) {
      expect(l.code).toBeTruthy();
      expect(l.name).toBeTruthy();
      expect(l.discipline).toMatch(/^[ASMEPILC]$/);
      expect(l.description).toBeTruthy();
    }
  });

  it('contains A-WALL', () => {
    const l = getAiaLayer('A-WALL');
    expect(l).toBeDefined();
    expect(l!.discipline).toBe('A');
  });

  it('returns undefined for unknown code', () => {
    expect(getAiaLayer('Z-NONSENSE')).toBeUndefined();
  });

  it('filters by discipline', () => {
    const archLayers = getAiaLayersByDiscipline('A');
    expect(archLayers.length).toBeGreaterThan(0);
    expect(archLayers.every(l => l.discipline === 'A')).toBe(true);
  });

  it('has at least 2 structural layers', () => {
    expect(getAiaLayersByDiscipline('S').length).toBeGreaterThanOrEqual(2);
  });

  it('searches by code', () => {
    const r = searchAiaLayers('WALL');
    expect(r.length).toBeGreaterThan(0);
    expect(r.some(l => l.code === 'A-WALL')).toBe(true);
  });

  it('searches by name', () => {
    const r = searchAiaLayers('Glazing');
    expect(r.some(l => l.code === 'A-GLAZ')).toBe(true);
  });

  it('searches by description', () => {
    const r = searchAiaLayers('ductwork');
    expect(r.some(l => l.code === 'M-HVAC-DUCT')).toBe(true);
  });

  it('returns empty for no match', () => {
    expect(searchAiaLayers('xyznonexistent')).toEqual([]);
  });

  it('has EXST and DEMO phasing layers', () => {
    expect(getAiaLayer('A-EXST')).toBeDefined();
    expect(getAiaLayer('A-EXST-DEMO')).toBeDefined();
    expect(getAiaLayer('S-WALL-EXST')).toBeDefined();
    expect(getAiaLayer('S-FOOT-EXST')).toBeDefined();
  });

  describe('getDisciplinePrefix', () => {
    it('maps A to Architecture', () => expect(getDisciplinePrefix('A')).toBe('Architecture'));
    it('maps S to Structure', () => expect(getDisciplinePrefix('S')).toBe('Structure'));
    it('maps M to Mechanical', () => expect(getDisciplinePrefix('M')).toBe('Mechanical'));
    it('maps unknown to General', () => expect(getDisciplinePrefix('X' as any)).toBe('General'));
  });

  describe('aiaLayerColor', () => {
    it('returns wall colour for A-WALL', () => expect(aiaLayerColor('A-WALL')).toBe('#4a5568'));
    it('returns door colour for A-DOOR', () => expect(aiaLayerColor('A-DOOR')).toBe('#d4a574'));
    it('returns blue for P-PIPE', () => expect(aiaLayerColor('P-PIPE')).toBe('#3b82f6'));
    it('returns default grey for unknown', () => expect(aiaLayerColor('X-UNKNOWN')).toBe('#94a3b8'));
  });
});

// ─── title-block ──────────────────────────────────────────────────
import { buildTitleBlock, TITLE_BLOCK_H } from '@/lib/drawings/title-block';

describe('title-block', () => {
  const META = {
    project: 'Test Project',
    drawing: 'TEST PLAN',
    sheet: 'A-101',
    scale: '1:100',
    date: '2026-07-25',
    revision: '01',
    drawnBy: 'Test Engineer',
    checkedBy: 'Reviewer',
    approvedBy: 'Approver',
    drawingType: 'ARCHITECTURAL',
    client: 'Client Name',
    projectNumber: 'PRJ-001',
    projectDescription: 'A test building',
  };

  it('produces SVG group string', () => {
    const svg = buildTitleBlock(841, 594, META);
    expect(svg).toContain('<g ');
    expect(svg).toContain('</g>');
  });

  it('returns a non-empty string', () => {
    const svg = buildTitleBlock(420, 297, META);
    expect(svg.length).toBeGreaterThan(100);
  });

  it('contains project name', () => {
    const svg = buildTitleBlock(841, 594, META);
    expect(svg).toContain('Test Project');
  });

  it('contains sheet reference', () => {
    const svg = buildTitleBlock(841, 594, META);
    expect(svg).toContain('A-101');
  });

  it('contains revision', () => {
    const svg = buildTitleBlock(841, 594, META);
    expect(svg).toContain('01');
  });

  it('contains scale', () => {
    const svg = buildTitleBlock(841, 594, META);
    expect(svg).toContain('1:100');
  });

  it('contains client when provided', () => {
    const svg = buildTitleBlock(841, 594, META);
    expect(svg).toContain('Client Name');
  });

  it('works with minimal metadata', () => {
    const svg = buildTitleBlock(420, 297, { project: 'Min', drawing: 'Min' });
    expect(svg).toContain('Min');
  });

  it('handles print mode differently', () => {
    const def = buildTitleBlock(420, 297, META, false);
    const print = buildTitleBlock(420, 297, META, true);
    expect(def).not.toBe(print);
    // print mode should use light background
    expect(print).toContain('#f1f5f9');
  });

  it('contains provenance when provided', () => {
    const svg = buildTitleBlock(841, 594, { ...META, provenanceSummary: 'AI-generated' });
    expect(svg).toContain('AI-generated');
  });

  it('TITLE_BLOCK_H is 60', () => {
    expect(TITLE_BLOCK_H).toBe(60);
  });

  it('renders 5 vertical columns', () => {
    const svg = buildTitleBlock(841, 594, META);
    const matches = svg.match(/<line/g);
    expect(matches!.length).toBeGreaterThanOrEqual(4); // at least 4 dividers
  });
});

// ─── sheetSet ─────────────────────────────────────────────────────
import {
  getSheetDimensions,
  listSheetSizes,
  suggestSheetSize,
  scaleToFit,
} from '@/lib/drawings/sheetSet';

describe('sheetSet', () => {
  it('gets A4 landscape dimensions', () => {
    const d = getSheetDimensions('A4', true);
    expect(d.widthMm).toBe(297);
    expect(d.heightMm).toBe(210);
    expect(d.portrait).toBe(false);
  });

  it('gets A4 portrait dimensions', () => {
    const d = getSheetDimensions('A4', false);
    expect(d.widthMm).toBe(210);
    expect(d.heightMm).toBe(297);
    expect(d.portrait).toBe(true);
  });

  it('A0 landscape is 1189x841', () => {
    const d = getSheetDimensions('A0', true);
    expect(d.widthMm).toBe(1189);
    expect(d.heightMm).toBe(841);
  });

  it('lists all 5 sizes', () => {
    expect(listSheetSizes()).toEqual(['A4', 'A3', 'A2', 'A1', 'A0']);
  });

  it('suggests A4 for small content', () => {
    expect(suggestSheetSize(200, 150)).toBe('A4');
  });

  it('suggests A0 for oversized content', () => {
    expect(suggestSheetSize(5000, 4000)).toBe('A0');
  });

  it('suggests A1 for intermediate content', () => {
    expect(suggestSheetSize(700, 500)).toBe('A1');
  });

  describe('scaleToFit', () => {
    it('returns scale <= 1', () => {
      const r = scaleToFit(500, 400, 1000, 800);
      expect(r.scale).toBeLessThanOrEqual(1);
      expect(r.scale).toBeGreaterThan(0);
    });

    it('centres content', () => {
      const r = scaleToFit(100, 100, 500, 500);
      expect(r.offsetX).toBeGreaterThan(0);
      expect(r.offsetY).toBeGreaterThan(0);
    });
  });
});

// ─── namingConventions ────────────────────────────────────────────
import {
  formatDrawingName,
  formatBoardName,
  formatArchiveName,
  nextRevision,
  generateSheetNumber,
  createInitialRevision,
} from '@/lib/drawings/namingConventions';

describe('namingConventions', () => {
  describe('formatDrawingName', () => {
    it('formats standard drawing name', () => {
      const name = formatDrawingName({
        projectCode: 'PRJ-001', discipline: 'A',
        sheetNumber: '101', revision: '02', title: 'Floor Plan',
      });
      expect(name).toBe('PRJ-001_A-101_R02_Floor-Plan.dxf');
    });

    it('sanitises project code', () => {
      const name = formatDrawingName({
        projectCode: 'bad/name!', discipline: 'S',
        sheetNumber: '001', revision: '00', title: 'Column Layout',
      });
      expect(name).not.toContain('/');
      expect(name).not.toContain('!');
    });

    it('sanitises title', () => {
      const name = formatDrawingName({
        projectCode: 'TEST', discipline: 'A',
        sheetNumber: '001', revision: '00', title: 'Plan & Section / Detail',
      });
      expect(name).not.toContain('&');
    });

    it('pads revision to 2 digits', () => {
      const name = formatDrawingName({
        projectCode: 'X', discipline: 'A',
        sheetNumber: '001', revision: '1', title: 'Test',
      });
      expect(name).toContain('_R01_');
    });
  });

  describe('formatBoardName', () => {
    it('formats board name', () => {
      expect(formatBoardName('PRJ-001', 2, '01')).toBe('PRJ-001_BOARD_02_R01');
    });
  });

  describe('formatArchiveName', () => {
    it('formats archive name', () => {
      expect(formatArchiveName('PRJ-001', '2026-07-25', '1')).toBe('PRJ-001_2026-07-25_v1.beproj');
    });
  });

  describe('nextRevision', () => {
    it('increments revision', () => {
      expect(nextRevision('00')).toBe('01');
      expect(nextRevision('05')).toBe('06');
    });

    it('starts at 01 for empty', () => {
      expect(nextRevision('')).toBe('01');
    });
  });

  describe('generateSheetNumber', () => {
    it('generates A-001 for arch seq 1', () => {
      expect(generateSheetNumber('A', 1)).toBe('A-001');
    });

    it('generates S-101 for struct seq 101', () => {
      expect(generateSheetNumber('S', 101)).toBe('S-101');
    });
  });

  describe('createInitialRevision', () => {
    it('creates revision R00 with Preliminary status', () => {
      const r = createInitialRevision();
      expect(r.revision).toBe('00');
      expect(r.status).toBe('Preliminary');
      expect(r.date).toBeTruthy();
    });
  });
});

// ─── lineweights ──────────────────────────────────────────────────
import { LW } from '@/lib/drawings/lineweights';

describe('lineweights', () => {
  it('has all expected constants', () => {
    expect(LW.CUT).toBe(4);
    expect(LW.MAJOR).toBe(2.5);
    expect(LW.PROFILE).toBe(2);
    expect(LW.PARTITION).toBe(1.5);
    expect(LW.PROJECTION).toBe(1);
    expect(LW.FIXTURE).toBe(1);
    expect(LW.DIMENSION).toBe(0.5);
    expect(LW.HIDDEN).toBe(0.75);
    expect(LW.HATCH).toBe(0.35);
    expect(LW.ANNOTATION).toBe(0.5);
    expect(LW.GRID).toBe(0.35);
    expect(LW.REFERENCE).toBe(0.5);
  });

  it('CUT is heaviest', () => {
    const vals = Object.values(LW);
    expect(Math.max(...vals)).toBe(LW.CUT);
  });

  it('HATCH is lightest', () => {
    const vals = Object.values(LW);
    expect(Math.min(...vals)).toBe(LW.HATCH);
  });

  it('has exactly 12 entries', () => {
    expect(Object.keys(LW).length).toBe(12);
  });
});
