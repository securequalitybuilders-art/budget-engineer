import { expect, test, describe } from 'vitest';
import { generateDefaultRegister } from '@/lib/drawings/drawing-register';
import { TitleBlockMeta, buildTitleBlock } from '@/lib/drawings/title-block';
import { renderProvenanceNote } from '@/lib/drawings/disciplines/svg-shared';
import { DERIVED_PROVENANCE } from '@/domain/drawing-provenance';

describe('Engineering Drawings Engine', () => {
  test('Drawing register includes all expected default sheets', () => {
    const register = generateDefaultRegister({ floorCount: 2 });
    
    expect(register.length).toBeGreaterThan(10);
    
    const types = register.map(s => s.viewId);
    expect(types).toContain('site-plan');
    expect(types).toContain('plan');
    expect(types).toContain('roof');
    expect(types).toContain('front');
    expect(types).toContain('section');
    expect(types).toContain('electrical');
    expect(types).toContain('plumbing');
    expect(types).toContain('hvac');
    expect(types).toContain('schedule-door');
    expect(types).toContain('schedule-window');
    expect(types).toContain('schedule-structural');
    expect(types).toContain('presentation');
  });

  test('Title block renders correctly', () => {
    const meta: TitleBlockMeta = {
      project: 'Test Project',
      drawing: 'Test Drawing',
      sheet: 'A-101',
      drawingType: 'ARCHITECTURAL',
      provenanceSummary: 'Test Provenance',
    };
    
    const svg = buildTitleBlock(800, 600, meta);
    
    expect(svg).toContain('Test Project');
    expect(svg).toContain('Test Drawing');
    expect(svg).toContain('A-101');
    expect(svg).toContain('ARCHITECTURAL');
    expect(svg).toContain('Test Provenance');
    expect(svg).toContain('PROVENANCE');
  });

  test('Provenance note renders correctly', () => {
    const note = renderProvenanceNote(DERIVED_PROVENANCE, 10, 10);
    
    expect(note).toContain('Procedurally inferred');
    expect(note).toContain('DERIVED');
  });
});
