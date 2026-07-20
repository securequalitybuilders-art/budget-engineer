import { CadDocument, Vec2, SectionConfig, RoofType } from '@/domain/ws6-types';
import { TitleBlockMeta, buildTitleBlock, TITLE_BLOCK_H } from './title-block';
import { renderProvenanceNote, HATCH_PATTERNS } from './disciplines/svg-shared';
import { SECTION_DERIVED_PROVENANCE } from '@/domain/drawing-provenance';
import { LW } from './lineweights';
import { renderSectionHeightDims } from './dimension-engine';
import {
  resolveSectionCutPlane,
  getFloorBuildUpWithFooting,
  getFoundationSpec,
  getRoofType,
  getRoofBuildUp,
  inferRoomsAtCut,
  renderFloorBuildUpSvg,
  renderStairCutSvg,
} from './section-cut-engine';
import { renderLevelDatum, renderDatumColumn, renderOverallHeightNote } from './elevation-datums';
import { renderKeynoteCallout, renderKeynoteSchedule, type KeynoteEntry } from './leader-notes';
import { renderElevationBubble, renderCrossSheetReference } from './elevation-reference-engine';
import { DEFAULT_COORDINATOR } from './sheet-coordination';

const SCALE = 28;
const PAD = 40;
const SLAB_T = 0.2;
const GROUND_DEPTH = 0.8;
const PLANE_THRESH = 0.6;

const dist = (a: Vec2, b: Vec2) => Math.hypot(b.x - a.x, b.y - a.y);

export type { SectionAxis, SectionConfig } from '@/domain/ws6-types';

export function buildSectionSvg(cad: CadDocument, titleMeta?: TitleBlockMeta, config?: SectionConfig, _printMode = false): string {
  const printMode = _printMode ?? false;
  const cut = resolveSectionCutPlane(cad, config);
  const axis = cut.axis;
  const hOf = (p: Vec2) => (axis === 'AA' ? p.x : p.y);
  const planeOf = (p: Vec2) => (axis === 'AA' ? p.y : p.x);

  const allPts = cad.walls.flatMap(w => [w.start, w.end]);
  const hs = allPts.map(hOf);
  const minH = Math.min(...hs, 0);
  const maxH = Math.max(...hs, 1);
  const bWidth = maxH - minH;

  const topFloor = cad.floors[cad.floors.length - 1];
  const totalHeight = topFloor.elevation + topFloor.height;

  const roofType: RoofType = config?.roofType ?? getRoofType(cad);
  const roofBuildUp = getRoofBuildUp(cad, roofType);
  const roofExtra = roofType === 'pitched-truss' ? 1.5 : roofType === 'flat-parapet' ? roofBuildUp.parapetHeightMm / 1000 : 0;
  const apexRise = roofExtra;

  const w = bWidth * SCALE + PAD * 2;
  const h = (totalHeight + GROUND_DEPTH + apexRise) * SCALE + PAD * 2;

  const sx = (hcoord: number) => (hcoord - minH) * SCALE + PAD;
  const sz = (z: number) => h - PAD - GROUND_DEPTH * SCALE - z * SCALE;

  const svgH = h + (titleMeta ? TITLE_BLOCK_H : 0);
  const label = axis === 'AA' ? 'A\u2013A' : 'B\u2013B';

  const bg = printMode ? '#ffffff' : '#0b1220';
  const cutFill = printMode ? '#cbd5e1' : '#1e293b';
  const cutStroke = printMode ? '#0f172a' : '#334155';
  const textMain = printMode ? '#0f172a' : '#e2e8f0';
  const textSub = printMode ? '#475569' : '#94a3b8';
  const projColor = printMode ? '#94a3b8' : '#475569';

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(svgH)}" viewBox="0 0 ${w} ${svgH}">`);
  parts.push(`<defs>${HATCH_PATTERNS}</defs>`);
  parts.push(`<rect width="${w}" height="${svgH}" fill="${bg}"/>`);

  const groundY = sz(0);
  parts.push(`<rect x="0" y="${groundY.toFixed(1)}" width="${w}" height="${(svgH - groundY).toFixed(1)}" fill="url(#earth-hatch)" opacity="${printMode ? 0.5 : 0.8}"/>`);
  parts.push(`<rect x="0" y="${groundY.toFixed(1)}" width="${w}" height="${(svgH - groundY).toFixed(1)}" fill="${printMode ? '#f8fafc' : '#0b1220'}" opacity="${printMode ? 0.3 : 0.5}"/>`);
  parts.push(`<line x1="0" y1="${groundY.toFixed(1)}" x2="${w}" y2="${groundY.toFixed(1)}" stroke="${cutStroke}" stroke-width="${LW.CUT}" stroke-linecap="butt"/>`);
  parts.push(...renderLevelDatum(0, 'NGL', 20, groundY, true, printMode));

  const leftX = sx(minH);
  const rightX = sx(maxH);
  const wallT = Math.max(0.2 * SCALE, 5);

  const foundationSpec = getFoundationSpec(cad);
  const roomsAtCut = inferRoomsAtCut(cad, cut.position, axis);

  for (let fi = 0; fi < cad.floors.length; fi++) {
    const floor = cad.floors[fi];
    const baseZ = floor.elevation;
    const topZ = floor.elevation + floor.height;
    const slabY = sz(baseZ + SLAB_T);
    const slabH = SLAB_T * SCALE;

    const buildUp = getFloorBuildUpWithFooting(fi, cad.floors.length);

    const wellStair = cad.blocks.find(b => b.floorId === floor.id && b.kind === 'stair');
    if (wellStair) {
      const a = axis === 'AA' ? wellStair.position.x : wellStair.position.y;
      const span = axis === 'AA' ? wellStair.width : wellStair.depth;
      const gx1 = sx(a);
      const gx2 = sx(a + span);
      parts.push(`<rect x="${leftX.toFixed(1)}" y="${slabY.toFixed(1)}" width="${(gx1 - leftX).toFixed(1)}" height="${slabH.toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);
      parts.push(`<rect x="${gx2.toFixed(1)}" y="${slabY.toFixed(1)}" width="${(rightX - gx2).toFixed(1)}" height="${slabH.toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);
      parts.push(`<rect x="${(gx1 - 4).toFixed(1)}" y="${slabY.toFixed(1)}" width="8" height="${(slabH * 2).toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.PARTITION}"/>`);
      parts.push(`<rect x="${(gx2 - 4).toFixed(1)}" y="${slabY.toFixed(1)}" width="8" height="${(slabH * 2).toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.PARTITION}"/>`);

      if (fi < cad.floors.length - 1) {
        parts.push(...renderStairCutSvg(gx1 + 4, gx2 - 4, sz(baseZ), sz(topZ), 12, printMode));
        parts.push(`<text x="${((gx1 + gx2) / 2).toFixed(1)}" y="${(sz(baseZ + 1)).toFixed(1)}" fill="${textSub}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">STAIR</text>`);
      }
    } else {
      parts.push(...renderFloorBuildUpSvg(buildUp, leftX, rightX, slabY, slabH, printMode));
    }

    // External walls at cut
    const extWallsAtCut = cad.walls.filter(w => {
      if (w.floorId !== floor.id) return false;
      const plane = (planeOf(w.start) + planeOf(w.end)) / 2;
      return Math.abs(plane - cut.position) < PLANE_THRESH && w.structural;
    });

    for (const ew of extWallsAtCut) {
      const wh = hOf(ew.start);
      const wLeft = sx(wh);
      parts.push(`<rect x="${wLeft.toFixed(1)}" y="${sz(topZ).toFixed(1)}" width="${wallT.toFixed(1)}" height="${(floor.height * SCALE).toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);
      parts.push(`<rect x="${wLeft.toFixed(1)}" y="${sz(topZ).toFixed(1)}" width="${wallT.toFixed(1)}" height="${(floor.height * SCALE).toFixed(1)}" fill="url(#brick-hatch)" opacity="${printMode ? 0.2 : 0.35}"/>`);
    }

    // Foundation for ground floor external walls — proportional to storey count
    if (fi === 0) {
      for (const ew of extWallsAtCut) {
        const wh = hOf(ew.start);
        const wL = sx(wh);
        const footW = foundationSpec.width * SCALE;
        const footH = foundationSpec.depth * SCALE;
        const footD = 0.6 * SCALE;
        const ftY = sz(-footD);
        const ext = (footW - wallT) / 2;
        const fl = wL - ext;
        parts.push(`<rect x="${fl.toFixed(1)}" y="${ftY.toFixed(1)}" width="${footW.toFixed(1)}" height="${footH.toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);
        parts.push(`<rect x="${fl.toFixed(1)}" y="${ftY.toFixed(1)}" width="${footW.toFixed(1)}" height="${footH.toFixed(1)}" fill="url(#concrete-hatch)" opacity="${printMode ? 0.25 : 0.4}"/>`);
        parts.push(`<text x="${(fl + footW / 2).toFixed(1)}" y="${(ftY - 4).toFixed(1)}" fill="${textSub}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${(foundationSpec.width * 1000).toFixed(0)}W \u00d7 ${(foundationSpec.depth * 1000).toFixed(0)}D FOOTING (${cad.floors.length} STOREY)</text>`);
      }
    }

    // Internal walls at cut
    const internalWallsAtCut = cad.walls.filter(w => {
      const plane = (planeOf(w.start) + planeOf(w.end)) / 2;
      return Math.abs(plane - cut.position) < PLANE_THRESH && !w.structural;
    });

    for (const iw of internalWallsAtCut) {
      if (iw.floorId !== floor.id) continue;
      const iwh = hOf(iw.start);
      const iwLeft = sx(iwh);
      const iwT = Math.max(0.15 * SCALE, 3);
      parts.push(`<rect x="${iwLeft.toFixed(1)}" y="${sz(topZ).toFixed(1)}" width="${iwT.toFixed(1)}" height="${(floor.height * SCALE).toFixed(1)}" fill="${cutFill}" stroke="${projColor}" stroke-width="${LW.PARTITION}"/>`);
      parts.push(`<rect x="${iwLeft.toFixed(1)}" y="${sz(topZ).toFixed(1)}" width="${iwT.toFixed(1)}" height="${(floor.height * SCALE).toFixed(1)}" fill="url(#timber-hatch)" opacity="${printMode ? 0.15 : 0.25}"/>`);
    }

    // Openings at cut
    for (const o of cad.openings.filter(o => o.floorId === floor.id)) {
      const host = cad.walls.find(wl => wl.id === o.wallId);
      if (!host) continue;
      const hostPlane = (planeOf(host.start) + planeOf(host.end)) / 2;
      if (Math.abs(hostPlane - cut.position) > PLANE_THRESH) continue;
      const ln = Math.max(dist(host.start, host.end), 0.01);
      const t = o.offset / ln;
      const oh = hOf({ x: host.start.x + (host.end.x - host.start.x) * t, y: host.start.y + (host.end.y - host.start.y) * t });
      const sill = o.sillHeight ?? 0;
      const head = o.headHeight ?? (o.kind === 'door' ? 2.1 : (sill + 1.2));
      const opX = sx(oh) - o.width * SCALE / 2;
      const opY = sz(baseZ + head);
      const opW = o.width * SCALE;
      const opH = (head - sill) * SCALE;
      parts.push(`<rect x="${opX.toFixed(1)}" y="${opY.toFixed(1)}" width="${opW.toFixed(1)}" height="${opH.toFixed(1)}" fill="${bg}" stroke="${projColor}" stroke-width="${LW.PROJECTION}"/>`);

      const reveal = 4;
      parts.push(`<rect x="${(opX - reveal).toFixed(1)}" y="${opY.toFixed(1)}" width="${reveal.toFixed(1)}" height="${opH.toFixed(1)}" fill="none" stroke="${projColor}" stroke-width="${LW.HATCH}"/>`);
      parts.push(`<rect x="${(opX + opW).toFixed(1)}" y="${opY.toFixed(1)}" width="${reveal.toFixed(1)}" height="${opH.toFixed(1)}" fill="none" stroke="${projColor}" stroke-width="${LW.HATCH}"/>`);
      parts.push(`<rect x="${opX.toFixed(1)}" y="${(opY - 3).toFixed(1)}" width="${opW.toFixed(1)}" height="3" fill="${projColor}" stroke="none"/>`);
      parts.push(`<text x="${(opX + opW + 3).toFixed(1)}" y="${(opY - 2).toFixed(1)}" fill="${textSub}" font-size="5" font-family="Arial,Helvetica,sans-serif">HD +${(baseZ + head).toFixed(2)}</text>`);
      parts.push(`<text x="${(opX + opW + 3).toFixed(1)}" y="${(sz(baseZ + sill) + 10).toFixed(1)}" fill="${textSub}" font-size="5" font-family="Arial,Helvetica,sans-serif">SILL +${(baseZ + sill).toFixed(2)}</text>`);
    }

    // Room label at cut
    for (const [, prog] of roomsAtCut) {
      if (cad.floors.some(f => f.id === floor.id)) {
        parts.push(`<text x="${((leftX + rightX) / 2).toFixed(1)}" y="${(sz(baseZ + floor.height * 0.5) - 4).toFixed(1)}" fill="${projColor}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-style="italic">${prog}</text>`);
      }
    }

    // Floor level label
    parts.push(`<text x="${(rightX + 6).toFixed(1)}" y="${(sz(baseZ) - 2).toFixed(1)}" fill="${textSub}" font-size="10" font-family="Arial,Helvetica,sans-serif">${floor.name} +${baseZ.toFixed(2)}</text>`);
    parts.push(`<line x1="${(rightX + 2).toFixed(1)}" y1="${sz(baseZ).toFixed(1)}" x2="${(w - 20).toFixed(1)}" y2="${sz(baseZ).toFixed(1)}" stroke="${projColor}" stroke-width="${LW.REFERENCE}" stroke-dasharray="4 4"/>`);
  }

  // ── Roof (roof-type aware) ──
  const roofZ = totalHeight;
  const roofEavesY = sz(roofZ);

  if (roofType === 'pitched-truss') {
    renderPitchedTrussRoof(parts, leftX, rightX, roofZ, roofEavesY, roofBuildUp.hasInsulation, printMode, cutFill, cutStroke, textSub, projColor);
  } else if (roofType === 'flat-parapet') {
    renderFlatParapetRoof(parts, leftX, rightX, roofZ, roofBuildUp.parapetHeightMm / 1000, roofBuildUp, printMode, cutFill, cutStroke, textSub, projColor);
  } else {
    renderSlabEdgeRoof(parts, leftX, rightX, roofZ, printMode, cutFill, cutStroke, textSub, projColor);
  }

  // ── Cut header ──
  parts.push(`<text x="8" y="16" fill="${textMain}" font-size="13" font-weight="700" font-family="Arial,Helvetica,sans-serif">Section ${label}</text>`);
  parts.push(`<line x1="0" y1="21" x2="${w.toFixed(0)}" y2="21" stroke="${projColor}" stroke-width="0.35" opacity="0.3"/>`);

  const cutRoomText = cut.roomsCut.length > 0 ? ` \u00b7 Cutting: ${cut.roomsCut.slice(0, 4).join(', ')}${cut.roomsCut.length > 4 ? '...' : ''}` : '';
  parts.push(`<text x="8" y="34" fill="${textSub}" font-size="9" font-family="Arial,Helvetica,sans-serif">cut @ ${axis === 'AA' ? 'Y' : 'X'}=${cut.position.toFixed(1)} m · looking ${axis === 'AA' ? 'North' : 'East'}${cutRoomText}</text>`);

  if (cut.stairsCut.length > 0) {
    parts.push(`<text x="8" y="46" fill="${textSub}" font-size="7" font-family="Arial,Helvetica,sans-serif">Stair flights intersected</text>`);
  }
  if (cut.serviceCoresCut.length > 0) {
    parts.push(`<text x="8" y="54" fill="${textSub}" font-size="7" font-family="Arial,Helvetica,sans-serif">Service cores intersected</text>`);
  }

  // ── Height dimensions ──
  const heightLevels = cad.floors.map(f => ({ z: f.elevation, label: f.name }));
  const roofLabel = roofType === 'pitched-truss' ? 'Wall Plate' : roofType === 'flat-parapet' ? 'Roof Slab' : 'Roof Edge';
  heightLevels.push({ z: totalHeight, label: roofLabel });
  if (roofType === 'pitched-truss') {
    heightLevels.push({ z: totalHeight + 1.5, label: 'Apex' });
  }
  parts.push(renderSectionHeightDims(heightLevels, w - 20, { py: (p) => sz(p.y), w, h }, printMode));

  // ── Datum column ──
  const datumLevels = cad.floors.flatMap(f => [
    { elevation: f.elevation, label: `${f.name} SL`, isGround: f.elevation === 0 },
  ]);
  parts.push(...renderDatumColumn(datumLevels, 20, sz, printMode));

  // ── Overall height note ──
  parts.push(renderOverallHeightNote(totalHeight, cad.floors.length, w - 8, h - 8, printMode));

  // ── Leader-linked construction notes (dynamic by roof/foundation) ──
  const foundationNote = `FOUNDATION: ${(foundationSpec.width * 1000).toFixed(0)}mm \u00d7 ${(foundationSpec.depth * 1000).toFixed(0)}mm RC STRIP \u00b7 REINFORCEMENT T12 @ 150c/c \u00b7 ${(foundationSpec.blinding * 1000).toFixed(0)}mm BLINDING (${cad.floors.length}-STOREY)`;

  const roofNote = roofType === 'pitched-truss'
    ? 'ROOF: CHROMADEK ON TIMBER TRUSSES @ 600c/c \u00b7 150mm INSULATION \u00b7 12.5mm FIRELINE'
    : roofType === 'flat-parapet'
      ? `ROOF: PVC WATERPROOF MEMBRANE \u00b7 100mm INSULATION \u00b7 CONCRETE SLAB \u00b7 ${roofBuildUp.parapetHeightMm}mm PARAPET`
      : 'ROOF: CONCRETE SLAB \u00b7 WATERPROOFING \u00b7 INSULATION';

  const sectionKeynotes: KeynoteEntry[] = [
    { number: 1, text: 'EXTERNAL WALLS: CAVITY WALL \u2014 100mm BRICK / 100mm BLOCK / 100mm MINERAL WOOL INSULATION' },
    { number: 2, text: 'INTERNAL PARTITIONS: 100mm TIMBER STUD / 12.5mm FIRELINE PLASTERBOARD' },
    { number: 3, text: 'FLOOR: 200mm RC SLAB / 75mm SCREED / 25mm FINISH' },
    { number: 4, text: foundationNote },
    { number: 5, text: roofNote },
  ];

  const wallMidX = (leftX + rightX) / 2;
  const roofNoteY = sz(totalHeight) - 50;
  const cnNoteX = w - 220;
  const cnNoteStartY = h - 150;

  parts.push(renderKeynoteCallout(1, wallMidX, sz(totalHeight * 0.5), cnNoteX, cnNoteStartY, printMode, 'right'));
  parts.push(renderKeynoteCallout(2, wallMidX, sz(totalHeight * 0.35), cnNoteX + 20, cnNoteStartY + 14, printMode, 'right'));
  parts.push(renderKeynoteCallout(3, wallMidX, sz(totalHeight * 0.15), cnNoteX + 10, cnNoteStartY + 28, printMode, 'right'));
  parts.push(renderKeynoteCallout(4, leftX + 10, sz(-0.3), cnNoteX, cnNoteStartY + 42, printMode, 'right'));
  if (cad.floors.length > 0) {
    const roofAnchorX = rightX + 10;
    const roofAnchorY = sz(totalHeight + 0.3);
    parts.push(renderKeynoteCallout(5, roofAnchorX, roofAnchorY, cnNoteX + 30, roofNoteY, printMode, 'right'));
  }
  parts.push(...renderKeynoteSchedule(sectionKeynotes, cnNoteX - 10, cnNoteStartY - 24, printMode));

  // ── Drawing-set coordination ──
  const planSheet = DEFAULT_COORDINATOR.getSheetForView('plan');
  const planLabel = DEFAULT_COORDINATOR.getLabel('plan');
  const elevSheet = DEFAULT_COORDINATOR.getSheetForView('front');
  const elevLabel = DEFAULT_COORDINATOR.getLabel('front');

  parts.push(`<text x="8" y="${(h - 76).toFixed(0)}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">REFER TO ${planSheet} — ${planLabel} FOR PLAN LAYOUT</text>`);
  parts.push(`<text x="8" y="${(h - 66).toFixed(0)}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">REFER TO ${elevSheet} — ${elevLabel} FOR ELEVATION DETAILS</text>`);
  parts.push(`<text x="8" y="${(h - 56).toFixed(0)}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">SECTION ${label} ON SHEET ${DEFAULT_COORDINATOR.getSheetForView('section')}</text>`);

  const elevDir = axis === 'AA' ? 'right' : 'left';
  parts.push(...renderElevationBubble(
    axis === 'AA' ? 'E1' : 'E2',
    DEFAULT_COORDINATOR.getSheetForView('front'),
    w - 40, 50, elevDir, printMode,
  ));

  parts.push(...renderCrossSheetReference(
    planSheet, planLabel.toUpperCase(),
    w - 50, h - 170, printMode,
  ));

  parts.push(renderProvenanceNote(SECTION_DERIVED_PROVENANCE, 8, h - 14));

  if (titleMeta) parts.push(buildTitleBlock(w, svgH, titleMeta, printMode));

  parts.push('</svg>');
  return parts.join('');
}

function renderPitchedTrussRoof(
  parts: string[],
  leftX: number, rightX: number,
  roofZ: number, roofEavesY: number,
  hasInsulation: boolean,
  printMode: boolean,
  cutFill: string, cutStroke: string,
  textSub: string, projColor: string,
): void {
  const roofApexX = leftX + (rightX - leftX) / 2;
  const roofApexY = roofEavesY - 1.5 * SCALE;
  const trussColor = printMode ? '#64748b' : '#78716c';
  const insulLayer = printMode ? '#94a3b8' : '#57534e';

  parts.push(`<polyline points="${(leftX - 20).toFixed(1)},${(roofEavesY - 5).toFixed(1)} ${roofApexX.toFixed(1)},${(roofApexY - 5).toFixed(1)} ${(rightX + 20).toFixed(1)},${(roofEavesY - 5).toFixed(1)}" fill="none" stroke="${cutStroke}" stroke-width="${LW.PROFILE}"/>`);
  parts.push(`<polyline points="${(leftX - 18).toFixed(1)},${(roofEavesY - 3).toFixed(1)} ${roofApexX.toFixed(1)},${(roofApexY - 3).toFixed(1)} ${(rightX + 18).toFixed(1)},${(roofEavesY - 3).toFixed(1)}" fill="none" stroke="${projColor}" stroke-width="${LW.PROJECTION}" stroke-dasharray="2 2"/>`);

  if (hasInsulation) {
    parts.push(`<polyline points="${(leftX - 16).toFixed(1)},${(roofEavesY - 1).toFixed(1)} ${roofApexX.toFixed(1)},${(roofApexY - 1).toFixed(1)} ${(rightX + 16).toFixed(1)},${(roofEavesY - 1).toFixed(1)}" fill="none" stroke="${insulLayer}" stroke-width="${LW.PARTITION}" stroke-dasharray="4 2"/>`);
  }

  parts.push(`<polyline points="${(leftX - 15).toFixed(1)},${roofEavesY.toFixed(1)} ${roofApexX.toFixed(1)},${roofApexY.toFixed(1)} ${(rightX + 15).toFixed(1)},${roofEavesY.toFixed(1)}" fill="none" stroke="${trussColor}" stroke-width="${LW.PARTITION}"/>`);
  parts.push(`<line x1="${(leftX - 15).toFixed(1)}" y1="${roofEavesY.toFixed(1)}" x2="${(rightX + 15).toFixed(1)}" y2="${roofEavesY.toFixed(1)}" stroke="${trussColor}" stroke-width="${LW.PARTITION}"/>`);
  parts.push(`<line x1="${roofApexX.toFixed(1)}" y1="${roofEavesY.toFixed(1)}" x2="${roofApexX.toFixed(1)}" y2="${roofApexY.toFixed(1)}" stroke="${trussColor}" stroke-width="${LW.PARTITION}"/>`);

  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(roofEavesY - 4).toFixed(1)}" width="6" height="4" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);
  parts.push(`<rect x="${(rightX - 6).toFixed(1)}" y="${(roofEavesY - 4).toFixed(1)}" width="6" height="4" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);

  parts.push(`<text x="${roofApexX.toFixed(1)}" y="${(roofApexY - 24).toFixed(1)}" fill="${textSub}" font-size="7" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">CHROMADEK ROOFING</text>`);
  parts.push(`<text x="${roofApexX.toFixed(1)}" y="${(roofApexY - 16).toFixed(1)}" fill="${textSub}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">BREATHABLE MEMBRANE + 150mm INSULATION</text>`);
  parts.push(`<text x="${roofApexX.toFixed(1)}" y="${(roofApexY - 8).toFixed(1)}" fill="${textSub}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">TIMBER TRUSSES @ 600mm c/c \u00b7 CEILING LINING 12.5mm FIRELINE</text>`);
  parts.push(`<text x="${(rightX + 6).toFixed(1)}" y="${(roofEavesY - 2).toFixed(1)}" fill="${textSub}" font-size="10" font-family="Arial,Helvetica,sans-serif">Wall Plate +${roofZ.toFixed(2)}</text>`);
  parts.push(`<text x="${(rightX + 6).toFixed(1)}" y="${(roofApexY - 2).toFixed(1)}" fill="${textSub}" font-size="10" font-family="Arial,Helvetica,sans-serif">Apex +${(roofZ + 1.5).toFixed(2)}</text>`);
}

function renderFlatParapetRoof(
  parts: string[],
  leftX: number, rightX: number,
  roofZ: number, parapetH: number,
  buildUp: { parapetHeightMm: number; hasInsulation: boolean; hasMembrane: boolean; ceilingLiningMm: number },
  printMode: boolean,
  cutFill: string, cutStroke: string,
  textSub: string, projColor: string,
): void {
  const svgRoofY = roofZ * SCALE + PAD;
  const parapetTopY = svgRoofY - parapetH * SCALE;

  // Parapet upstand walls
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${parapetTopY.toFixed(1)}" width="6" height="${(svgRoofY - parapetTopY).toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);
  parts.push(`<rect x="${(rightX - 6).toFixed(1)}" y="${parapetTopY.toFixed(1)}" width="6" height="${(svgRoofY - parapetTopY).toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);

  // Roof slab
  const slabH = SLAB_T * SCALE;
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(svgRoofY - slabH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${slabH.toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="1.5"/>`);
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(svgRoofY - slabH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${slabH.toFixed(1)}" fill="url(#concrete-hatch)" opacity="${printMode ? 0.25 : 0.4}"/>`);

  if (buildUp.hasInsulation) {
    const insulH = 0.1 * SCALE;
    parts.push(`<rect x="${leftX.toFixed(1)}" y="${(svgRoofY - slabH - insulH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${insulH.toFixed(1)}" fill="${printMode ? '#e2e8f0' : '#334155'}" stroke="${projColor}" stroke-width="0.75"/>`);
    parts.push(`<rect x="${leftX.toFixed(1)}" y="${(svgRoofY - slabH - insulH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${insulH.toFixed(1)}" fill="url(#insulation-hatch)" opacity="0.3"/>`);
  }

  if (buildUp.hasMembrane) {
    parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(svgRoofY - slabH - (buildUp.hasInsulation ? 0.1 * SCALE : 0)).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(svgRoofY - slabH - (buildUp.hasInsulation ? 0.1 * SCALE : 0)).toFixed(1)}" stroke="${projColor}" stroke-width="2"/>`);
  }

  // Parapet capping
  parts.push(`<rect x="${(leftX - 2).toFixed(1)}" y="${(parapetTopY - 3).toFixed(1)}" width="10" height="3" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);
  parts.push(`<rect x="${(rightX - 8).toFixed(1)}" y="${(parapetTopY - 3).toFixed(1)}" width="10" height="3" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);

  parts.push(`<text x="${((leftX + rightX) / 2).toFixed(1)}" y="${(parapetTopY - 14).toFixed(1)}" fill="${textSub}" font-size="7" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">PVC WATERPROOF MEMBRANE</text>`);
  parts.push(`<text x="${((leftX + rightX) / 2).toFixed(1)}" y="${(parapetTopY - 6).toFixed(1)}" fill="${textSub}" font-size="6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">100mm INSULATION \u00b7 CONCRETE SLAB</text>`);
  parts.push(`<text x="${(rightX + 8).toFixed(1)}" y="${(parapetTopY + 6).toFixed(1)}" fill="${textSub}" font-size="8" font-family="Arial,Helvetica,sans-serif">Parapet +${(roofZ + parapetH).toFixed(2)}</text>`);
  parts.push(`<text x="${(rightX + 8).toFixed(1)}" y="${(svgRoofY - slabH + 14).toFixed(1)}" fill="${textSub}" font-size="8" font-family="Arial,Helvetica,sans-serif">Roof slab +${roofZ.toFixed(2)}</text>`);
}

function renderSlabEdgeRoof(
  parts: string[],
  leftX: number, rightX: number,
  roofZ: number,
  printMode: boolean,
  cutFill: string, cutStroke: string,
  textSub: string, projColor: string,
): void {
  const svgRoofY = roofZ * SCALE + PAD;
  const slabH = SLAB_T * SCALE;

  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(svgRoofY - slabH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${slabH.toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="1.5"/>`);
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(svgRoofY - slabH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${slabH.toFixed(1)}" fill="url(#concrete-hatch)" opacity="${printMode ? 0.25 : 0.4}"/>`);

  const insulH = 0.1 * SCALE;
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(svgRoofY - slabH - insulH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${insulH.toFixed(1)}" fill="${printMode ? '#e2e8f0' : '#334155'}" stroke="${projColor}" stroke-width="0.75"/>`);
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(svgRoofY - slabH - insulH).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(svgRoofY - slabH - insulH).toFixed(1)}" stroke="${projColor}" stroke-width="2"/>`);

  parts.push(`<rect x="${(leftX - 2).toFixed(1)}" y="${(svgRoofY - slabH - insulH - 3).toFixed(1)}" width="4" height="${(slabH + insulH + 3).toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);
  parts.push(`<rect x="${(rightX - 2).toFixed(1)}" y="${(svgRoofY - slabH - insulH - 3).toFixed(1)}" width="4" height="${(slabH + insulH + 3).toFixed(1)}" fill="${cutFill}" stroke="${cutStroke}" stroke-width="${LW.CUT}"/>`);

  parts.push(`<text x="${((leftX + rightX) / 2).toFixed(1)}" y="${(svgRoofY - slabH - insulH - 14).toFixed(1)}" fill="${textSub}" font-size="7" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">CONCRETE ROOF SLAB \u00b7 WATERPROOFING \u00b7 100mm INSULATION</text>`);
  parts.push(`<text x="${(rightX + 8).toFixed(1)}" y="${(svgRoofY - slabH + 14).toFixed(1)}" fill="${textSub}" font-size="8" font-family="Arial,Helvetica,sans-serif">Roof slab +${roofZ.toFixed(2)}</text>`);
}
