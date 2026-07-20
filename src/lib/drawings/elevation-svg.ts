import { CadDocument, FaçadeOrientation, RoomProgramme } from '@/domain/ws6-types';
import { TitleBlockMeta, buildTitleBlock, TITLE_BLOCK_H } from './title-block';
import { renderProvenanceNote, renderEntourageTree, renderEntouragePerson, HATCH_PATTERNS } from './disciplines/svg-shared';
import { ELEVATION_DERIVED_PROVENANCE } from '@/domain/drawing-provenance';
import { LW } from './lineweights';
import { renderSectionHeightDims } from './dimension-engine';
import { renderLevelDatum, renderDatumColumn, renderOverallHeightNote, renderScaleNote } from './elevation-datums';
import { buildOpeningProfiles, renderOpeningElevation } from './opening-elevation-profile';
import { computeFaçadeComposition, mapRoomsToFrontage, getEntranceOpening, orientWall, roomFrontageType } from './frontage-mapper';
import { getTypologyRules, buildFaçadeArticulation } from './facade-composer';
import { getRoofType, renderRoofProfile } from './elevation-roof-profile';
import {
  renderColumnRhythm, renderBalconyProjection, renderBalconyStack,
  renderVerandahProjection, renderSymmetryCenterline, renderEntranceCanopy,
  renderMaterialZoneHatch, renderUpperFloorSetback, renderPodiumTransition,
  renderTerraceEdge, renderSideDifferentiation,
} from './facade-rhythm';
import { buildDeterministicSeed } from './deterministic-facade-variation';
import {
  getDepthCueConfig, renderOpeningSurround, renderPlinthWithDepth,
  renderSlabShadowLine, renderSlabEdgeProfile, renderCorniceCoping, renderWallFaceTransition,
} from './facade-depth';
import { renderKeynoteCallout, renderKeynoteSchedule, type KeynoteEntry } from './leader-notes';
import { renderElevationBubble, renderCrossSheetReference } from './elevation-reference-engine';
import { DEFAULT_COORDINATOR } from './sheet-coordination';

const SCALE = 28;
const PAD = 40;
const GROUND_DEPTH = 0.8;

function getFloorRole(floorIndex: number, totalFloors: number): 'ground' | 'typical' | 'top' | 'podium' {
  if (totalFloors <= 1) return 'ground';
  if (floorIndex === 0) return 'ground';
  if (floorIndex === totalFloors - 1) return 'top';
  if (totalFloors >= 4 && floorIndex === 1) return 'podium';
  return 'typical';
}

export function buildElevationSvg(cad: CadDocument, viewId: string, titleMeta?: TitleBlockMeta, _printMode = false): string {
  const printMode = _printMode ?? false;

  let orientation: FaçadeOrientation;
  let label: string;

  switch (viewId) {
    case 'front': orientation = 'front'; label = 'Front Elevation'; break;
    case 'rear': orientation = 'rear'; label = 'Rear Elevation'; break;
    case 'left': orientation = 'left'; label = 'Left Side Elevation'; break;
    case 'right': orientation = 'right'; label = 'Right Side Elevation'; break;
    default: orientation = 'front'; label = 'Front Elevation'; break;
  }

  const isFront = orientation === 'front';
  const isRear = orientation === 'rear';
  const isSide = orientation === 'left' || orientation === 'right';

  return buildElevationFromOrientation(cad, orientation, label, isFront, isRear, isSide, titleMeta, printMode);
}

function getTypography(topology: string): string {
  if (topology.includes('villa') || topology.includes('compact') || topology.includes('family')) return 'residential-house';
  if (topology.includes('apartment') || topology.includes('mixed-use')) return 'multi-storey';
  if (topology.includes('duplex')) return 'duplex';
  if (topology.includes('clinic') || topology.includes('school') || topology.includes('office')) return 'institutional';
  if (topology.includes('warehouse') || topology.includes('industrial')) return 'industrial';
  if (topology.includes('worship') || topology.includes('community')) return 'assembly';
  return 'residential-house';
}

function buildElevationFromOrientation(
  cad: CadDocument,
  orientation: FaçadeOrientation,
  label: string,
  isFront: boolean,
  isRear: boolean,
  isSide: boolean,
  titleMeta?: TitleBlockMeta,
  printMode = false,
): string {
  const comp = computeFaçadeComposition(cad, orientation);
  const frontages = mapRoomsToFrontage(cad);
  const entrance = isFront ? getEntranceOpening(cad) : null;
  const entranceForSide = isSide ? getEntranceOpening(cad) : null;
  const profiles = buildOpeningProfiles(cad, orientation);
  const typology = cad.roomProgramme ? inferTypology(cad.roomProgramme) : 'family house';
  const rules = getTypologyRules(typology);
  const buildingClass = getTypography(typology);

  const bWidth = comp.width || 1;
  const totalHeight = comp.totalHeight || 6;
  const roofPitch = 1.5;

  const w = bWidth * SCALE + PAD * 2;
  const h = (totalHeight + roofPitch + GROUND_DEPTH) * SCALE + PAD * 2;

  const sx = (coord: number) => (coord - comp.buildingEdgeLeft) * SCALE + PAD;
  const sz = (z: number) => h - PAD - GROUND_DEPTH * SCALE - z * SCALE;

  const svgH = h + (titleMeta ? TITLE_BLOCK_H : 0);

  const bg = printMode ? '#ffffff' : '#0b1220';
  const groundFill = 'earth-hatch';
  const groundStroke = printMode ? '#0f172a' : '#cbd5e1';
  const textMain = printMode ? '#0f172a' : '#e2e8f0';
  const textSub = printMode ? '#475569' : '#94a3b8';
  const projColor = printMode ? '#94a3b8' : '#475569';

  const art = buildFaçadeArticulation(comp, rules, sx);
  const depthCfg = getDepthCueConfig(typology);

  // Deterministic seed for repeatable façade variation
  const deterministicSeed = buildDeterministicSeed(cad.id, cad.projectId, '0', orientation, typology, 'all');

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(svgH)}" viewBox="0 0 ${w} ${svgH}">`);
  parts.push(`<defs>${HATCH_PATTERNS}</defs>`);
  parts.push(`<rect width="${w}" height="${svgH}" fill="${bg}"/>`);

  const groundY = sz(0);
  const extLine = 30;

  // Ground line
  parts.push(`<line x1="-${extLine}" y1="${groundY.toFixed(1)}" x2="${(w + extLine).toFixed(1)}" y2="${groundY.toFixed(1)}" stroke="${groundStroke}" stroke-width="${LW.MAJOR}" stroke-linecap="butt"/>`);
  parts.push(`<rect x="0" y="${groundY.toFixed(1)}" width="${w}" height="${(svgH - groundY).toFixed(1)}" fill="url(#${groundFill})" opacity="${printMode ? 0.3 : 0.5}"/>`);
  parts.push(`<rect x="0" y="${groundY.toFixed(1)}" width="${w}" height="${(svgH - groundY).toFixed(1)}" fill="${printMode ? '#f8fafc' : '#0b1220'}" opacity="${printMode ? 0.3 : 0.4}"/>`);
  parts.push(...renderLevelDatum(0, 'GL', 20, groundY, true, printMode));

  // Plinth line at base with depth cues
  if (art.hasPlinth && rules.plinthHeight > 0) {
    const plinthY = sz(0);
    const plinthH = rules.plinthHeight * SCALE;
    parts.push(...renderPlinthWithDepth(
      PAD, PAD + bWidth * SCALE, plinthY, plinthH,
      depthCfg.plinthThicknessPx, printMode, typology,
    ));
    parts.push(`<text x="${PAD.toFixed(1)}" y="${(plinthY - plinthH - 4).toFixed(1)}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">PLINTH · ${(rules.plinthHeight * 100).toFixed(0)}mm</text>`);
  }

  const totalFloors = cad.floors.length;

  // Room-to-façade data for this view
  const frontageOnThisView = frontages.filter(f => f.façadeOrientation === orientation);

  // Per-floor rendering with floor-role awareness
  for (let fi = 0; fi < totalFloors; fi++) {
    const floor = cad.floors[fi];
    const baseZ = floor.elevation;
    const topZ = floor.elevation + floor.height;
    const floorRole = getFloorRole(fi, totalFloors);

    const floorSegments = comp.segments.filter(s => s.floorId === floor.id);
    if (floorSegments.length === 0) continue;

    const fCoords = floorSegments.flatMap(s => [s.start, s.end]);
    const fMin = Math.min(...fCoords.map(p => orientation === 'front' || orientation === 'rear' ? p.x : p.y));
    const fMax = Math.max(...fCoords.map(p => orientation === 'front' || orientation === 'rear' ? p.x : p.y));

    const leftX = sx(fMin);
    const rightX = sx(fMax);
    const wallH = ((topZ - baseZ) * SCALE);

    // Render wall with opacity based on floor role
    const wallOpacity = floorRole === 'podium' || floorRole === 'ground' ? 0.9 : 0.8;
    parts.push(renderWallElevation(leftX, rightX, topZ, baseZ, sz, wallH, printMode, isFront, isRear, isSide, typology, wallOpacity));

    // Course lines — vary by floor role
    const courseSpacing = isFront ? 8 : (isSide ? 12 : 10);
    const courseOpacity = isFront ? 1 : (isSide ? 0.5 : 0.7);
    const floorCourseMod = floorRole === 'podium' ? 1.3 : (floorRole === 'top' ? 0.7 : 1);
    for (let cy = sz(topZ + 0.1); cy < sz(baseZ) - 2; cy += courseSpacing * floorCourseMod) {
      parts.push(`<line x1="${leftX.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${projColor}" stroke-width="${LW.HATCH}" opacity="${printMode ? 0.5 * courseOpacity : 0.3 * courseOpacity}"/>`);
    }

    // FFL datum
    parts.push(`<line x1="${(rightX + 2).toFixed(1)}" y1="${sz(topZ).toFixed(1)}" x2="${(w - 20).toFixed(1)}" y2="${sz(topZ).toFixed(1)}" stroke="${projColor}" stroke-width="${LW.REFERENCE}" stroke-dasharray="4 4"/>`);
    parts.push(`<text x="${(rightX + 6).toFixed(1)}" y="${(sz(topZ) - 2).toFixed(1)}" fill="${textSub}" font-size="10" font-family="Arial,Helvetica,sans-serif">FFL +${topZ.toFixed(2)}</text>`);

    // Floor role annotation
    if (totalFloors > 1) {
      const roleLabel = floorRole === 'ground' ? 'GROUND'
        : floorRole === 'podium' ? 'PODIUM'
        : floorRole === 'top' ? 'TOP FLOOR'
        : 'TYPICAL FLOOR';
      parts.push(`<text x="${(rightX + 6).toFixed(1)}" y="${(sz(topZ) - 12).toFixed(1)}" fill="${projColor}" font-size="5" font-style="italic" font-family="Arial,Helvetica,sans-serif">${roleLabel}</text>`);
    }

    // Slab shadow line at each floor level
    if (fi > 0 || floorRole === 'ground') {
      parts.push(...renderSlabShadowLine(
        leftX, rightX, sz(baseZ),
        depthCfg.slabShadowOffsetPx, printMode,
        floorRole === 'podium',
      ));
      // Slab edge profile at each floor
      parts.push(...renderSlabEdgeProfile(
        leftX, rightX, sz(baseZ + 0.15),
        4, printMode,
      ));
    }

    // Material zone transition at each floor
    if (rules.materialZones.length > 0) {
      for (const zone of rules.materialZones) {
        const zoneTopZ = baseZ + zone.from;
        const zoneBotZ = baseZ + zone.to;
        if (zoneTopZ >= baseZ && zoneTopZ <= topZ) {
          parts.push(...renderWallFaceTransition(
            leftX, rightX, sz(zoneTopZ),
            depthCfg.wallFaceTransitionOffsetPx, printMode,
          ));
        }
        if (zoneBotZ >= baseZ && zoneBotZ <= topZ) {
          parts.push(...renderWallFaceTransition(
            leftX, rightX, sz(zoneBotZ),
            depthCfg.wallFaceTransitionOffsetPx, printMode,
          ));
        }
      }
    }

    // Upper-floor setback (for mixed-use/industrial typologies)
    parts.push(...renderUpperFloorSetback(
      fi, totalFloors, leftX, rightX, sz(topZ), printMode, typology,
    ));

    // Podium transition line
    const podiumTopFloor = totalFloors >= 4 ? 1 : -1;
    parts.push(...renderPodiumTransition(
      fi, podiumTopFloor, leftX, rightX, sz(topZ), printMode,
    ));

    // Balcony projection with deterministic seed and floor-aware stacking
    if (isFront || isRear) {
      if (totalFloors > 1 && fi > 0) {
        parts.push(...renderBalconyStack(
          fi, totalFloors, sz(topZ), leftX, rightX,
          isFront ? rules.balconyLikelihood : rules.balconyLikelihood * 0.3,
          printMode, deterministicSeed,
        ));
      } else {
        parts.push(...renderBalconyProjection(
          sz(baseZ), sz(topZ),
          leftX, rightX,
          isFront ? rules.balconyLikelihood : rules.balconyLikelihood * 0.3,
          printMode, deterministicSeed, fi,
        ));
      }
    }

    // Terrace edge on top floor for residential typologies
    if (isFront && floorRole === 'top' && (typology.includes('villa') || typology.includes('apartment'))) {
      parts.push(...renderTerraceEdge(leftX, rightX, sz(topZ), printMode));
    }

    // Verandah/porch projection — ground floor only, for villa/worship typologies
    if (isFront && floor.elevation === 0) {
      parts.push(...renderVerandahProjection(
        groundY, sz(baseZ),
        leftX, rightX,
        typology,
        printMode,
      ));
    }

    // Openings with elevation profiles and depth cues
    for (const o of cad.openings.filter((o) => o.floorId === floor.id)) {
      const host = cad.walls.find((wl) => wl.id === o.wallId);
      if (!host) continue;

      const isHorizontal = Math.abs(host.start.y - host.end.y) < 0.1;
      const isVertical = Math.abs(host.start.x - host.end.x) < 0.1;

      const wallOrient = orientWall(host);
      const isOnThisView = (
        (isFront && wallOrient === 'front') ||
        (isRear && wallOrient === 'rear') ||
        (orientation === 'left' && wallOrient === 'left') ||
        (orientation === 'right' && wallOrient === 'right')
      );

      const isOnPerpendicular = (isFront || isRear)
        ? isVertical
        : isHorizontal;

      if (!isOnThisView && !isOnPerpendicular) continue;

      const len = Math.hypot(host.end.x - host.start.x, host.end.y - host.start.y);
      if (len < 0.01) continue;
      const t = o.offset / len;
      const oh = (orientation === 'front' || orientation === 'rear')
        ? host.start.x + (host.end.x - host.start.x) * t
        : host.start.y + (host.end.y - host.start.y) * t;

      const profile = profiles.find(p => p.openingId === o.id);
      const sill = profile?.sillHeight ?? o.sillHeight ?? (o.kind === 'door' ? 0 : 0.9);
      const head = profile?.headHeight ?? o.headHeight ?? (o.kind === 'door' ? 2.1 : (sill + 1.2));

      const opX = sx(oh) - (o.width * SCALE / 2);
      const opY = sz(baseZ + head);
      const opW = o.width * SCALE;
      const opH = (head - sill) * SCALE;
      const sillY = sz(baseZ + sill + (head - sill));
      const headY = sz(baseZ + head);

      if (profile && isOnThisView) {
        parts.push(...renderOpeningElevation(profile, opX, opY, opW, opH, sillY, headY, printMode));
      } else {
        parts.push(renderBasicOpening(opX, opY, opW, opH, o.kind === 'window', sill, head, printMode));
      }

      // Depth cues for visible openings
      if (isOnThisView) {
        const openingFrontage = frontageOnThisView.length > 0
          ? frontageOnThisView[0].programme
          : undefined;
        const fType = openingFrontage
          ? roomFrontageType(openingFrontage as RoomProgramme)
          : undefined;
        parts.push(...renderOpeningSurround(
          opX, opY, opW, opH, headY, sillY,
          depthCfg, printMode,
          fType === 'public' ? 'public' : undefined,
        ));
      }
    }
  }

  // Roof
  const roofZ = totalHeight;
  const leftEavesX = PAD - 15;
  const rightEavesX = PAD + bWidth * SCALE + 15;
  const roofType = getRoofType(rules.parapetType, typology);

  const roofProfileParts = renderRoofProfile({
    roofType,
    leftX: leftEavesX,
    rightX: rightEavesX,
    roofZ,
    totalHeight,
    roofPitch,
    sz,
    printMode,
    fasciaDepthPx: rules.fasciaDepthMm,
    eavesDepthPx: rules.eavesDepthMm,
    parapetType: rules.parapetType,
  });
  parts.push(...roofProfileParts);

  // Cornice / coping depth cue at roof line
  const roofTopY = sz(roofZ + (roofType === 'pitched' ? roofPitch : 0));
  if (art.parapetType !== 'none') {
    parts.push(...renderCorniceCoping(
      PAD, PAD + bWidth * SCALE, roofTopY,
      depthCfg.corniceDepthPx, depthCfg.copingDepthPx,
      printMode, art.parapetType,
    ));
  }

  // Column/pilaster rhythm
  const roofY = sz(roofZ + (roofType === 'pitched' ? roofPitch : 0));
  const colRhythmParts = renderColumnRhythm(
    PAD, PAD + bWidth * SCALE,
    groundY, roofY,
    rules.columnRhythmSpacing,
    printMode,
  );
  parts.push(...colRhythmParts);

  // Symmetry centerline for high-symmetry typologies
  if (rules.symmetryWeight >= 0.8) {
    parts.push(...renderSymmetryCenterline(
      PAD, PAD + bWidth * SCALE,
      groundY - 30, roofY + 20,
      printMode,
    ));
  }

  // Material zone rendering
  if (rules.materialZones.length > 0) {
    for (const zone of rules.materialZones) {
      parts.push(...renderMaterialZoneHatch(
        zone, PAD, PAD + bWidth * SCALE, sz, printMode,
      ));
    }
  }

  // Entrance marker & canopy on front elevation
  if (isFront && entrance) {
    const ex = sx(entrance.x);
    parts.push(...renderEntranceCanopy(ex, groundY, rules.entranceEmphasis, printMode));
    parts.push(...renderLevelDatum(0, 'THRESHOLD', ex + 30, groundY + 2, false, printMode));
    const walkColor = printMode ? '#cbd5e1' : '#334155';
    parts.push(`<line x1="${(ex - 20).toFixed(1)}" y1="${(groundY + 5).toFixed(1)}" x2="${(ex + 20).toFixed(1)}" y2="${(groundY + 5).toFixed(1)}" stroke="${walkColor}" stroke-width="${LW.HATCH}" stroke-dasharray="3 3" opacity="0.4"/>`);
  }

  // Rear elevation — service/utility frontage differentiation
  if (isRear) {
    const utilY = h - 60;
    parts.push(`<text x="${(w / 2).toFixed(1)}" y="${utilY.toFixed(1)}" fill="${projColor}" font-size="7" font-style="italic" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">REAR ELEVATION — SERVICE / UTILITY FRONTAGE</text>`);
    parts.push(`<text x="${(w / 2).toFixed(1)}" y="${(utilY + 10).toFixed(1)}" fill="${projColor}" font-size="6" font-style="italic" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">TYPICAL SERVICE ACCESS · UTILITY ZONE</text>`);

    // Rear-specific upper floor label for multi-storey
    if (totalFloors > 1) {
      parts.push(`<text x="${(w / 2).toFixed(1)}" y="${(utilY + 22).toFixed(1)}" fill="${projColor}" font-size="6" font-style="italic" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${totalFloors} STOREYS · SERVICE CORE</text>`);
    }
  }

  // Side elevation — orientation-differentiated (left vs right)
  if (isSide) {
    const isLeft = orientation === 'left';
    const sideLabel = isLeft ? 'LEFT SIDE' : 'RIGHT SIDE';
    const utilY = h - 60;

    const depth = comp.width;
    const totalServiceRooms = frontageOnThisView.filter(f =>
      ['Kitchen', 'Laundry', 'Bathroom', 'Store Room', 'Garage', 'Utility Room'].includes(f.programme)
    ).length;
    const totalPublicRooms = frontageOnThisView.filter(f =>
      ['Living Room', 'Reception', 'Lobby', 'Family Room', 'Lounge', 'Open Plan', 'Dining Room'].includes(f.programme)
    ).length;
    const serviceSide: 'left' | 'right' = totalServiceRooms > totalPublicRooms ? 'right' : 'left';
    const isServiceSide = (isLeft && serviceSide === 'left') || (!isLeft && serviceSide === 'right');

    // Orientation-aware side differentiation note
    const sideOrient: 'left' | 'right' = orientation === 'left' ? 'left' : 'right';
    parts.push(...renderSideDifferentiation(
      PAD, PAD + bWidth * SCALE,
      groundY - 30, utilY,
      sideOrient, printMode, serviceSide,
    ));

    parts.push(`<text x="${(w / 2).toFixed(1)}" y="${(utilY - 10).toFixed(1)}" fill="${projColor}" font-size="7" font-style="italic" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">BUILDING DEPTH: ${depth.toFixed(1)}m</text>`);
    parts.push(`<text x="${(w / 2).toFixed(1)}" y="${utilY.toFixed(1)}" fill="${projColor}" font-size="7" font-style="italic" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${sideLabel} ELEVATION — ${isServiceSide ? 'SERVICE / ACCESS SIDE' : 'GARDEN / PRIVATE SIDE'}</text>`);

    if (totalFloors > 1) {
      parts.push(`<text x="${(w / 2).toFixed(1)}" y="${(utilY + 12).toFixed(1)}" fill="${projColor}" font-size="6" font-style="italic" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${totalFloors} STOREYS · FLOOR-TO-FLOOR ${(totalHeight / totalFloors).toFixed(1)}m</text>`);
    }

    // Opening count differentiation per side
    const openingsOnThisSide = cad.openings.filter(o => {
      const host = cad.walls.find(w => w.id === o.wallId);
      if (!host) return false;
      const wallOrient = orientWall(host);
      return wallOrient === orientation;
    });
    const openingCountInfo = openingsOnThisSide.length > 0
      ? `${openingsOnThisSide.length} OPENINGS · ${openingsOnThisSide.filter(o => o.kind === 'window').length} WINDOWS · ${openingsOnThisSide.filter(o => o.kind === 'door').length} DOORS`
      : '';
    if (openingCountInfo) {
      parts.push(`<text x="${(w / 2).toFixed(1)}" y="${(utilY + 24).toFixed(1)}" fill="${projColor}" font-size="5" font-style="italic" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${openingCountInfo}</text>`);
    }

    // Different wall texture for service vs garden side
    if (isServiceSide) {
      const markerXLeft = PAD + 10;
      const markerY = groundY - 15;
      parts.push(`<rect x="${markerXLeft.toFixed(1)}" y="${markerY.toFixed(1)}" width="6" height="6" fill="${printMode ? '#cbd5e1' : '#334155'}" stroke="${projColor}" stroke-width="${LW.HATCH}" opacity="0.5"/>`);
      parts.push(`<text x="${(markerXLeft + 10).toFixed(1)}" y="${(markerY + 5).toFixed(1)}" fill="${projColor}" font-size="5" font-family="Arial,Helvetica,sans-serif">SV</text>`);
      // Service side has fewer openings — show solid wall panel marker
      if (openingsOnThisSide.length <= 1) {
        parts.push(`<rect x="${(PAD + bWidth * SCALE * 0.1).toFixed(1)}" y="${(groundY - 12).toFixed(1)}" width="${(bWidth * SCALE * 0.15).toFixed(1)}" height="6" fill="${printMode ? '#e2e8f0' : '#334155'}" stroke="${projColor}" stroke-width="0.5" opacity="0.3"/>`);
        parts.push(`<text x="${(PAD + bWidth * SCALE * 0.18).toFixed(1)}" y="${(groundY - 8).toFixed(1)}" fill="${projColor}" font-size="4" font-family="Arial,Helvetica,sans-serif">BLIND WALL</text>`);
      }
    } else {
      const markerXLeft = PAD + 10;
      const markerY = groundY - 15;
      parts.push(`<rect x="${markerXLeft.toFixed(1)}" y="${markerY.toFixed(1)}" width="6" height="6" fill="none" stroke="${projColor}" stroke-width="${LW.HATCH}" opacity="0.5"/>`);
      parts.push(`<text x="${(markerXLeft + 10).toFixed(1)}" y="${(markerY + 5).toFixed(1)}" fill="${projColor}" font-size="5" font-family="Arial,Helvetica,sans-serif">GV</text>`);
    }

    // Room-specific side annotation
    if (frontageOnThisView.length > 0) {
      const uniqueRooms = [...new Set(frontageOnThisView.map(f => f.roomName))];
      const roomAnnotation = uniqueRooms.length > 3
        ? uniqueRooms.slice(0, 3).join(' · ') + ' ...'
        : uniqueRooms.join(' · ');
      parts.push(`<text x="${(w / 2).toFixed(1)}" y="${(utilY + 36).toFixed(1)}" fill="${projColor}" font-size="5" font-style="italic" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">ROOMS: ${roomAnnotation}</text>`);
    }

    // Shaft/stair marker if stair block exists on this side
    const stairOnSide = cad.blocks.find(b => {
      if (b.kind !== 'stair') return false;
      const stairWalls = cad.walls.filter(w => {
        if (w.floorId !== b.floorId) return false;
        const wOrient = orientWall(w);
        return wOrient === orientation;
      });
      return stairWalls.length > 0;
    });
    if (stairOnSide) {
      const stairX = PAD + bWidth * SCALE * 0.5;
      const stairY = groundY - 40;
      parts.push(`<rect x="${(stairX - 6).toFixed(1)}" y="${stairY.toFixed(1)}" width="12" height="8" fill="none" stroke="${projColor}" stroke-width="${LW.REFERENCE}" stroke-dasharray="3 2" opacity="0.5"/>`);
      parts.push(`<text x="${stairX.toFixed(1)}" y="${(stairY - 3).toFixed(1)}" fill="${projColor}" font-size="5" font-style="italic" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">SHAFT</text>`);
    }

    if (entranceForSide) {
      const ex = sx(entranceForSide.x);
      parts.push(...renderEntranceCanopy(ex, groundY, 'moderate', printMode));
    }

    const bwColor = printMode ? '#cbd5e1' : '#334155';
    parts.push(`<line x1="0" y1="${groundY.toFixed(1)}" x2="${PAD.toFixed(1)}" y2="${groundY.toFixed(1)}" stroke="${bwColor}" stroke-width="${LW.HATCH}" stroke-dasharray="8 4" opacity="0.3"/>`);

    if (buildingClass !== 'residential-house') {
      parts.push(`<rect x="${(PAD - 5).toFixed(1)}" y="${(groundY - 20).toFixed(1)}" width="5" height="20" fill="none" stroke="${bwColor}" stroke-width="${LW.REFERENCE}" stroke-dasharray="2 2" opacity="0.3"/>`);
    }

    parts.push(`<line x1="${PAD.toFixed(1)}" y1="${groundY.toFixed(1)}" x2="${PAD.toFixed(1)}" y2="${(groundY + 20).toFixed(1)}" stroke="${projColor}" stroke-width="${LW.REFERENCE}" opacity="0.3"/>`);
    parts.push(`<line x1="${(PAD + bWidth * SCALE).toFixed(1)}" y1="${groundY.toFixed(1)}" x2="${(PAD + bWidth * SCALE).toFixed(1)}" y2="${(groundY + 20).toFixed(1)}" stroke="${projColor}" stroke-width="${LW.REFERENCE}" opacity="0.3"/>`);
  }

  // Room-to-façade annotations
  if (frontageOnThisView.length > 0) {
    const uniqueRooms = [...new Set(frontageOnThisView.map(f => f.roomName))];
    const roomLabelY = h - 10;
    parts.push(`<text x="${PAD.toFixed(1)}" y="${roomLabelY.toFixed(1)}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">Rooms: ${uniqueRooms.join(' · ')}</text>`);

    const frontageTypes = [...new Set(frontageOnThisView.map(f => {
      if (['Living Room', 'Reception', 'Lobby', 'Family Room', 'Lounge', 'Open Plan', 'Dining Room'].includes(f.programme)) return 'PUBLIC';
      if (['Kitchen', 'Laundry', 'Bathroom', 'Store Room', 'Garage'].includes(f.programme)) return 'SERVICE';
      return 'PRIVATE';
    }))];
    if (frontageTypes.length > 0) {
      parts.push(`<text x="${PAD.toFixed(1)}" y="${(roomLabelY + 10).toFixed(1)}" fill="${projColor}" font-size="5" font-style="italic" font-family="Arial,Helvetica,sans-serif">Frontage: ${frontageTypes.join(' / ')}</text>`);
    }
  }

  // Title
  parts.push(`<text x="${(w / 2).toFixed(1)}" y="16" fill="${textMain}" font-size="13" font-weight="700" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${label}</text>`);
  parts.push(renderScaleNote('1:100', w / 2, 30, printMode));

  // Typology annotation
  parts.push(`<text x="${(w / 2).toFixed(1)}" y="40" fill="${projColor}" font-size="6" font-style="italic" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${typology} · ${buildingClass.replace('-', ' ').toUpperCase()} · ${totalFloors} STOREY${totalFloors > 1 ? 'S' : ''}</text>`);

  // Elevation height dimensions
  const elevLevels = cad.floors.map(f => ({ z: f.elevation + f.height, label: f.name }));
  const glLevel = { z: 0, label: 'GL' };
  elevLevels.unshift(glLevel);
  const apexZ = roofType === 'pitched' || roofType === 'stepped'
    ? totalHeight + roofPitch
    : totalHeight;
  elevLevels.push({ z: apexZ, label: 'Roof Top' });
  parts.push(renderSectionHeightDims(elevLevels, 40, { py: (p) => sz(p.y), w, h }, printMode));

  // Datum column on right
  const datumLevels = cad.floors.flatMap(f => [
    { elevation: f.elevation, label: `${f.name} FL`, isGround: f.elevation === 0 },
  ]);
  parts.push(...renderDatumColumn(datumLevels, w - 60, sz, printMode));

  // Leader-linked construction notes with keynotes
  const keynoteList: KeynoteEntry[] = [
    { number: 1, text: 'EXTERNAL WALL: BRICKWORK / BLOCKWORK CAVITY · 100mm MINERAL WOOL INSULATION' },
    { number: 2, text: roofType === 'parapet' || roofType === 'slab-edge' ? 'ROOF: PVC MEMBRANE · INSULATED · BALLASTED' : 'ROOF: CHROMADEK ON TIMBER TRUSSES @ 600c/c · 150mm INSULATION' },
    { number: 3, text: 'WINDOWS: ALUMINIUM DOUBLE-GLAZED · REVEAL 100mm · THERMAL BREAK' },
    { number: 4, text: 'EXTERNAL FINISH: PAINTED RENDER / FACE BRICKWORK / STONE CLADDING' },
    { number: 5, text: 'FOUNDATION: RC STRIP · 600W×250D · T12@150 · 50mm BLINDING' },
  ];

  if (isFront) {
    const anchorY = sz(totalHeight * 0.6);
    parts.push(renderKeynoteCallout(1, PAD + 20, anchorY, w - 120, h - 120, printMode, 'right'));
    parts.push(renderKeynoteCallout(2, PAD + bWidth * SCALE - 20, sz(totalHeight * 0.8), w - 20, h - 106, printMode, 'right'));
    parts.push(renderKeynoteCallout(3, PAD + bWidth * SCALE * 0.3, sz(totalHeight * 0.4), w - 80, h - 92, printMode, 'right'));
    parts.push(renderKeynoteCallout(4, PAD + bWidth * SCALE * 0.6, sz(totalHeight * 0.3), w - 100, h - 78, printMode, 'right'));
    parts.push(renderKeynoteCallout(5, PAD + bWidth * SCALE * 0.5, sz(totalHeight * 0.1), w - 60, h - 64, printMode, 'right'));
    parts.push(...renderKeynoteSchedule(keynoteList, w - 230, h - 148, printMode));
  } else if (isSide) {
    const anchorY = sz(totalHeight * 0.5);
    parts.push(renderKeynoteCallout(1, PAD + 10, anchorY, w - 100, h - 80, printMode, 'right'));
    parts.push(renderKeynoteCallout(3, PAD + bWidth * SCALE * 0.5, anchorY, w - 60, h - 64, printMode, 'right'));
    const sideKeynotes: KeynoteEntry[] = [
      { number: 1, text: 'WALL: 230mm BRICK/BLOCK CAVITY · 100mm INSULATION' },
      { number: 3, text: 'OPENINGS: ALUMINIUM · DOUBLE GLAZED · THERMAL BREAK' },
    ];
    parts.push(...renderKeynoteSchedule(sideKeynotes, w - 180, h - 110, printMode));
  } else {
    parts.push(...renderGenericConstructionNotes(w, h, roofType, textSub, projColor, printMode));
  }

  // Elevation reference bubbles — using sheet coordination
  const sectionSheetRef = DEFAULT_COORDINATOR.getSheetForView('section');
  const sectionLabel = DEFAULT_COORDINATOR.getLabel('section');

  if (isFront) {
    const elevRef = DEFAULT_COORDINATOR.coordsForElevation('front');
    parts.push(...renderElevationBubble(
      elevRef?.drawingNumber ?? 'E1',
      elevRef?.sheetNumber ?? 'A-301',
      w - 40, 50, 'right', printMode,
    ));
  }
  if (isSide) {
    const dir = orientation === 'left' ? 'left' : 'right';
    const elevOrient = orientation === 'left' ? 'left' : 'right';
    const elevRef = DEFAULT_COORDINATOR.coordsForElevation(elevOrient);
    parts.push(...renderElevationBubble(
      elevRef?.drawingNumber ?? (orientation === 'left' ? 'E3' : 'E4'),
      elevRef?.sheetNumber ?? 'A-303',
      w - 40, 50, dir, printMode,
    ));
  }
  if (isRear) {
    const elevRef = DEFAULT_COORDINATOR.coordsForElevation('rear');
    parts.push(...renderElevationBubble(
      elevRef?.drawingNumber ?? 'E2',
      elevRef?.sheetNumber ?? 'A-302',
      w - 40, 50, 'right', printMode,
    ));
  }

  // Cross-sheet reference to sections
  parts.push(...renderCrossSheetReference(
    sectionSheetRef, sectionLabel.toUpperCase(),
    w - 50, h - 170, printMode,
  ));

  // Overall height note
  parts.push(renderOverallHeightNote(totalHeight, cad.floors.length, w - 8, h - 50, printMode));

  // Entourage — vary by orientation and storeys
  if (isFront) {
    const treeY = groundY + 5;
    parts.push(renderEntourageTree(40, treeY, 1.6, printMode));
    parts.push(renderEntourageTree(w - 50, treeY, 1.3, printMode));
    parts.push(renderEntourageTree(110, treeY, 1.1, printMode));
    parts.push(renderEntourageTree(w - 110, treeY, 0.9, printMode));
    parts.push(renderEntouragePerson(190, sz(0), 1.4, printMode));
    parts.push(renderEntouragePerson(w - 160, sz(0), 1.2, printMode));
    parts.push(renderEntouragePerson(300, sz(0), 1.0, printMode));
    parts.push(renderEntouragePerson(w - 280, sz(0), 1.1, printMode));
  } else if (isRear) {
    const treeY = groundY + 5;
    parts.push(renderEntourageTree(40, treeY, 1.0, printMode));
    parts.push(renderEntourageTree(w - 50, treeY, 0.8, printMode));
  } else if (isSide) {
    const treeY = groundY + 5;
    parts.push(renderEntourageTree(50, treeY, 1.2, printMode));
    parts.push(renderEntourageTree(w - 60, treeY, 1.0, printMode));
    parts.push(renderEntouragePerson(250, sz(0), 1.2, printMode));
  }

  // Height reference line
  parts.push(`<line x1="40" y1="${sz(roofZ).toFixed(1)}" x2="40" y2="${(groundY - 10).toFixed(1)}" stroke="${projColor}" stroke-width="${LW.REFERENCE}" stroke-dasharray="4 4"/>`);
  parts.push(`<text x="38" y="${(groundY - 14).toFixed(1)}" fill="${textSub}" font-size="7" text-anchor="end" font-family="Arial,Helvetica,sans-serif">HT ${totalHeight.toFixed(2)}m</text>`);

  parts.push(renderProvenanceNote(ELEVATION_DERIVED_PROVENANCE, 8, h - 14));

  if (titleMeta) parts.push(buildTitleBlock(w, svgH, titleMeta, printMode));

  parts.push('</svg>');
  return parts.join('');
}

function renderWallElevation(
  leftX: number, rightX: number,
  topZ: number, baseZ: number,
  sz: (z: number) => number,
  wallH: number,
  printMode: boolean,
  isFront: boolean,
  _isRear: boolean,
  isSide: boolean,
  _typology: string,
  opacityOverride?: number,
): string {
  const wallFill = printMode ? '#e2e8f0' : '#0f172a';
  const wallStroke = printMode ? '#0f172a' : '#334155';
  const opacity = opacityOverride ?? (isFront ? 0.9 : 0.85);
  const hatchOpacity = printMode ? 0.12 : (isFront ? 0.22 : 0.16);

  const parts: string[] = [];

  parts.push(`<rect x="${leftX.toFixed(1)}" y="${sz(topZ).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${wallH.toFixed(1)}" fill="${wallFill}" stroke="${wallStroke}" stroke-width="${LW.PROFILE}" opacity="${opacity}"/>`);
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${sz(topZ).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${wallH.toFixed(1)}" fill="url(#brick-hatch)" opacity="${hatchOpacity}"/>`);

  // Wall thickness depth cue at edges
  if (isFront || isSide) {
    const edgeColor = printMode ? '#475569' : '#1e293b';
    parts.push(`<line x1="${leftX.toFixed(1)}" y1="${sz(topZ).toFixed(1)}" x2="${leftX.toFixed(1)}" y2="${sz(topZ - (topZ - baseZ) * 0.95).toFixed(1)}" stroke="${edgeColor}" stroke-width="1.5" opacity="0.3"/>`);
    parts.push(`<line x1="${rightX.toFixed(1)}" y1="${sz(topZ).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${sz(topZ - (topZ - baseZ) * 0.95).toFixed(1)}" stroke="${edgeColor}" stroke-width="1.5" opacity="0.3"/>`);
  }

  return parts.join('');
}

function renderBasicOpening(
  opX: number, opY: number, opW: number, opH: number,
  isWindow: boolean, _sill: number, _head: number,
  printMode: boolean,
): string {
  const openingFill = printMode ? '#0b1220' : '#0b1220';
  const wallStroke = printMode ? '#0f172a' : '#334155';
  const projColor = printMode ? '#94a3b8' : '#475569';
  const glassFill = printMode ? '#f1f5f9' : '#1e293b';

  const parts: string[] = [];
  parts.push(`<rect x="${opX.toFixed(1)}" y="${opY.toFixed(1)}" width="${opW.toFixed(1)}" height="${opH.toFixed(1)}" fill="${openingFill}" stroke="${wallStroke}" stroke-width="${LW.PROJECTION}"/>`);

  if (isWindow) {
    const frameD = 4;
    const innerW = opW - frameD * 2;
    const innerH = opH - frameD * 2;
    parts.push(`<rect x="${(opX + frameD).toFixed(1)}" y="${(opY + frameD).toFixed(1)}" width="${innerW.toFixed(1)}" height="${innerH.toFixed(1)}" fill="${glassFill}" stroke="${projColor}" stroke-width="${LW.HATCH}"/>`);
  } else {
    const frameD = 3;
    parts.push(`<rect x="${(opX + frameD).toFixed(1)}" y="${(opY + frameD).toFixed(1)}" width="${(opW - frameD * 2).toFixed(1)}" height="${(opH - frameD).toFixed(1)}" fill="${printMode ? '#e2e8f0' : '#1e293b'}" stroke="${projColor}" stroke-width="${LW.PROJECTION}"/>`);
  }

  return parts.join('');
}

function renderGenericConstructionNotes(
  w: number, h: number,
  roofType: string,
  textSub: string,
  _projColor: string,
  _printMode: boolean,
): string[] {
  const parts: string[] = [];
  const col = textSub;
  const roofText = roofType === 'parapet' || roofType === 'slab-edge' ? 'FLAT ROOF' : 'PITCHED ROOF';
  parts.push(`<text x="${(w - 8).toFixed(0)}" y="${(h - 100).toFixed(0)}" fill="${col}" font-size="7" text-anchor="end" font-family="Arial,Helvetica,sans-serif">WALL: 230mm BRICK/BLOCK CAVITY</text>`);
  parts.push(`<text x="${(w - 8).toFixed(0)}" y="${(h - 90).toFixed(0)}" fill="${col}" font-size="7" text-anchor="end" font-family="Arial,Helvetica,sans-serif">ROOF: ${roofText}</text>`);
  parts.push(`<text x="${(w - 8).toFixed(0)}" y="${(h - 80).toFixed(0)}" fill="${col}" font-size="7" text-anchor="end" font-family="Arial,Helvetica,sans-serif">OPENINGS: ALUMINIUM · DOUBLE GLAZED</text>`);
  return parts;
}

function inferTypology(programme: Record<string, string>): string {
  const rooms = Object.values(programme);
  const roomSet = new Set(rooms.map(r => r.toLowerCase()));

  if (roomSet.has('consultation room') || roomSet.has('treatment room')) return 'clinic';
  if (roomSet.has('classroom') || roomSet.has('assembly hall')) return 'school';
  if (roomSet.has('warehouse') || roomSet.has('workshop')) return 'warehouse/industrial';
  if (roomSet.has('sanctuary') || roomSet.has('prayer hall')) return 'worship/community hall';

  if (Object.keys(programme).length >= 12) return 'mixed-use building';
  if (Object.keys(programme).length >= 8) return 'apartment block';

  const hasBedrooms = roomSet.has('bedroom 1') || roomSet.has('bedroom 2') || roomSet.has('bedroom 3');
  const hasLiving = roomSet.has('living room');
  const hasKitchen = roomSet.has('kitchen');

  if (hasBedrooms && hasLiving && hasKitchen) {
    if (Object.keys(programme).length <= 4) return 'compact house';
    if (Object.keys(programme).length <= 7) return 'family house';
    return 'villa';
  }

  return 'family house';
}
