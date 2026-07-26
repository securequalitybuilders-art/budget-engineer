/**
 * Drawing Standards Enforcement
 *
 * Provides validation utilities to prevent future regressions in:
 * - Approved fonts
 * - Approved lineweights (from LW / thematic tokens)
 * - Approved palette roles (no raw bright technical colors in print mode)
 * - Approved stroke hierarchy
 * - Approved annotation styles
 *
 * P13.2 — Standards Enforcement Tooling
 */
import { LW } from './lineweights';

// ── Approved fonts ──────────────────────────────────────
export const ENFORCED_FONTS = [
  'Arial',
  'Helvetica',
  'sans-serif',
  'Consolas',
  'Courier New',
  'monospace',
  'Inter',
  'Space Grotesk',
];

export const FORBIDDEN_FONT_KEYWORDS = [
  'Comic Sans',
  'Papyrus',
  'Times New Roman',
  'Georgia',
  'Impact',
];

// ── Approved lineweight values ──────────────────────────
export const APPROVED_STROKE_WIDTHS = new Set<number>(
  Object.values(LW).filter((v) => typeof v === 'number'),
);

// Also accept any stroke-width ≤ 0.5 for hatch lines
export function isApprovedStrokeWidth(w: number): boolean {
  return APPROVED_STROKE_WIDTHS.has(w) || w <= 0.5;
}

// ── Approved palette roles for SVG output ────────────────
// Bright RGB primitives that are forbidden in technical print mode SVGs
export const FORBIDDEN_BRIGHT_COLORS = [
  '#ff0000', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff',
  '#facc15', '#22c55e', '#06b6d4', '#ef4444',
  '#f97316', '#10b981', '#8b5cf6', '#ec4899',
  '#14b8a6', '#f43f5e', '#3b82f6', '#c084fc',
  '#9333ea', '#ef4444', '#0ea5e9',
];

// ── Validation ──────────────────────────────────────────

export interface StandardsViolation {
  type: 'font' | 'stroke-width' | 'bright-color' | 'raw-font';
  message: string;
  value: string;
  location?: string;
}

export function validateSvgFonts(svg: string, _allowedFonts: string[] = ENFORCED_FONTS): StandardsViolation[] {
  const violations: StandardsViolation[] = [];
  const fontMatch = svg.match(/font-family="([^"]+)"/g);
  if (!fontMatch) return violations;

  for (const fm of fontMatch) {
    const fonts = fm.replace('font-family="', '').replace('"', '').split(',');
    for (const f of fonts) {
      const trimmed = f.trim();
      if (FORBIDDEN_FONT_KEYWORDS.some(k => trimmed.toLowerCase().includes(k.toLowerCase()))) {
        violations.push({
          type: 'font',
          message: `Forbidden font family: ${trimmed}`,
          value: trimmed,
        });
      }
    }
  }
  return violations;
}

export function validateSvgBrightColors(svg: string, strict = true): StandardsViolation[] {
  if (!strict) return [];
  const violations: StandardsViolation[] = [];

  for (const color of FORBIDDEN_BRIGHT_COLORS) {
    // Check for fill/stroke attributes using bright colors (case-insensitive)
    const re = new RegExp(`(fill|stroke)="${color}"`, 'gi');
    let match;
    while ((match = re.exec(svg)) !== null) {
      violations.push({
        type: 'bright-color',
        message: `Bright color ${color} used in ${match[1]} attribute`,
        value: color,
      });
    }
  }
  return violations;
}

export function validateSvgLineweights(svg: string): StandardsViolation[] {
  const violations: StandardsViolation[] = [];
  const swMatch = svg.match(/stroke-width="([^"]+)"/g);
  if (!swMatch) return violations;

  for (const sw of swMatch) {
    const val = parseFloat(sw.replace('stroke-width="', '').replace('"', ''));
    if (!isNaN(val) && val > 0.5 && !APPROVED_STROKE_WIDTHS.has(val)) {
      // Allow stroke-width values that are close to approved ones (within 0.1 tolerance)
      const isClose = Array.from(APPROVED_STROKE_WIDTHS).some(
        approved => Math.abs(approved - val) < 0.1,
      );
      if (!isClose) {
        violations.push({
          type: 'stroke-width',
          message: `Non-approved stroke-width: ${val}`,
          value: String(val),
        });
      }
    }
  }
  return violations;
}

export interface ValidationReport {
  passed: boolean;
  violations: StandardsViolation[];
  totalChecked: number;
}

export function validateDrawingSvg(
  svg: string,
  options: {
    checkFonts?: boolean;
    checkBrightColors?: boolean;
    checkLineweights?: boolean;
    strict?: boolean;
  } = {},
): ValidationReport {
  const {
    checkFonts = true,
    checkBrightColors = true,
    checkLineweights = true,
    strict = true,
  } = options;

  const allViolations: StandardsViolation[] = [];
  let totalChecked = 0;

  if (checkFonts) {
    totalChecked++;
    allViolations.push(...validateSvgFonts(svg));
  }
  if (checkBrightColors) {
    totalChecked++;
    allViolations.push(...validateSvgBrightColors(svg, strict));
  }
  if (checkLineweights) {
    totalChecked++;
    allViolations.push(...validateSvgLineweights(svg));
  }

  return {
    passed: allViolations.length === 0,
    violations: allViolations,
    totalChecked,
  };
}
