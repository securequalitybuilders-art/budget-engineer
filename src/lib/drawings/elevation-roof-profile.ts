import { LW } from './lineweights';

type RoofType = 'pitched' | 'parapet' | 'slab-edge' | 'stepped';

interface RoofRenderInput {
  roofType: RoofType;
  leftX: number;
  rightX: number;
  roofZ: number;
  totalHeight: number;
  roofPitch: number;
  sz: (z: number) => number;
  printMode: boolean;
  fasciaDepthPx: number;
  eavesDepthPx: number;
  parapetType: string;
}

export function getRoofType(parapetType: string, typology: string): RoofType {
  if (parapetType === 'stepped') return 'stepped';
  if (parapetType === 'flat') {
    if (typology.includes('apartment') || typology.includes('mixed-use')) return 'slab-edge';
    return 'parapet';
  }
  return 'pitched';
}

export function renderRoofProfile(input: RoofRenderInput): string[] {
  const parts: string[] = [];
  const {
    roofType, leftX, rightX, roofZ, roofPitch,
    sz, printMode, fasciaDepthPx, eavesDepthPx,
  } = input;

  const roofFill = printMode ? '#cbd5e1' : '#1e293b';
  const roofStroke = printMode ? '#64748b' : '#94a3b8';
  const trimColor = printMode ? '#64748b' : '#cbd5e1';
  const parCol = printMode ? '#475569' : '#78716c';

  switch (roofType) {
    case 'pitched':
      parts.push(...renderPitchedRoof(leftX, rightX, roofZ, roofPitch, sz, roofFill, roofStroke, trimColor, fasciaDepthPx, eavesDepthPx, printMode));
      break;
    case 'parapet':
      parts.push(...renderParapetRoof(leftX, rightX, roofZ, sz, roofFill, roofStroke, trimColor, parCol, printMode));
      break;
    case 'slab-edge':
      parts.push(...renderSlabEdgeRoof(leftX, rightX, roofZ, sz, roofFill, roofStroke, trimColor, printMode));
      break;
    case 'stepped':
      parts.push(...renderSteppedRoof(leftX, rightX, roofZ, roofPitch, sz, roofFill, roofStroke, trimColor, parCol, fasciaDepthPx, printMode));
      break;
  }

  return parts;
}

function renderPitchedRoof(
  leftX: number, rightX: number,
  roofZ: number, roofPitch: number,
  sz: (z: number) => number,
  roofFill: string, roofStroke: string, trimColor: string,
  fasciaDepthPx: number,
  eavesDepthPx: number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const apexX = (leftX + rightX) / 2;
  const apexY = sz(roofZ + roofPitch);
  const eavesY = sz(roofZ);
  const overhang = 20;
  const lEave = leftX - overhang;
  const rEave = rightX + overhang;
  const eaveThk = Math.max(eavesDepthPx / 2, 3);
  const fasciaH = Math.max(fasciaDepthPx, 8);

  // Main roof sheeting plane
  parts.push(`<polygon points="${lEave.toFixed(1)},${eavesY.toFixed(1)} ${apexX.toFixed(1)},${(apexY - 3).toFixed(1)} ${rEave.toFixed(1)},${eavesY.toFixed(1)}" fill="${roofFill}" stroke="${roofStroke}" stroke-width="${LW.PROFILE}"/>`);

  // Roof sheeting profile lines (corrugation indication)
  const sheetCount = Math.max(4, Math.floor((rEave - lEave) / 12));
  for (let i = 1; i < sheetCount; i++) {
    const t = i / sheetCount;
    const rx = lEave + (rEave - lEave) * t;
    const ry = apexY + (1 - t * 2) * (roofPitch * 28 * 0.5);
    parts.push(`<line x1="${rx.toFixed(1)}" y1="${(ry - 1).toFixed(1)}" x2="${rx.toFixed(1)}" y2="${(ry + 1).toFixed(1)}" stroke="${roofStroke}" stroke-width="0.35" opacity="0.3"/>`);
  }

  // Inner roof build-up line
  parts.push(`<polyline points="${(lEave - 3).toFixed(1)},${(eavesY - 2).toFixed(1)} ${apexX.toFixed(1)},${(apexY - 6).toFixed(1)} ${(rEave + 3).toFixed(1)},${(eavesY - 2).toFixed(1)}" fill="none" stroke="${roofStroke}" stroke-width="${LW.PARTITION}"/>`);

  // Thermal insulation layer
  parts.push(`<polyline points="${(lEave - 2).toFixed(1)},${(eavesY - 3).toFixed(1)} ${apexX.toFixed(1)},${(apexY - 7).toFixed(1)} ${(rEave + 2).toFixed(1)},${(eavesY - 3).toFixed(1)}" fill="none" stroke="${printMode ? '#94a3b8' : '#57534e'}" stroke-width="${LW.HATCH}" stroke-dasharray="3 2" opacity="0.5"/>`);

  // Fascia board — thicker, with shadow line
  const fasciaPts = `${lEave.toFixed(1)},${eavesY.toFixed(1)} ${lEave.toFixed(1)},${(eavesY - fasciaH).toFixed(1)} ${apexX.toFixed(1)},${(apexY - fasciaH).toFixed(1)} ${rEave.toFixed(1)},${(eavesY - fasciaH).toFixed(1)} ${rEave.toFixed(1)},${eavesY.toFixed(1)}`;
  parts.push(`<polyline points="${fasciaPts}" fill="none" stroke="${trimColor}" stroke-width="${LW.PROJECTION}"/>`);
  parts.push(`<polyline points="${(lEave + 1).toFixed(1)},${(eavesY - fasciaH + 1).toFixed(1)} ${(lEave + 1).toFixed(1)},${(eavesY - 1).toFixed(1)} ${apexX.toFixed(1)},${(apexY - fasciaH + 1).toFixed(1)} ${(rEave - 1).toFixed(1)},${(eavesY - 1).toFixed(1)} ${(rEave - 1).toFixed(1)},${(eavesY - fasciaH + 1).toFixed(1)}" fill="none" stroke="${trimColor}" stroke-width="0.5" opacity="0.4"/>`);

  // Eave / soffit projection
  parts.push(`<line x1="${(lEave - 5).toFixed(1)}" y1="${(eavesY - 2).toFixed(1)}" x2="${lEave.toFixed(1)}" y2="${(eavesY - 2).toFixed(1)}" stroke="${trimColor}" stroke-width="${LW.HATCH}"/>`);
  parts.push(`<line x1="${rEave.toFixed(1)}" y1="${(eavesY - 2).toFixed(1)}" x2="${(rEave + 5).toFixed(1)}" y2="${(eavesY - 2).toFixed(1)}" stroke="${trimColor}" stroke-width="${LW.HATCH}"/>`);

  // Eave thickness
  parts.push(`<rect x="${(lEave - 3).toFixed(1)}" y="${(eavesY - eaveThk).toFixed(1)}" width="3" height="${eaveThk.toFixed(1)}" fill="${roofFill}" stroke="${trimColor}" stroke-width="${LW.HATCH}"/>`);
  parts.push(`<rect x="${rEave.toFixed(1)}" y="${(eavesY - eaveThk).toFixed(1)}" width="3" height="${eaveThk.toFixed(1)}" fill="${roofFill}" stroke="${trimColor}" stroke-width="${LW.HATCH}"/>`);

  // Ridge tile / ridge roll
  parts.push(`<rect x="${(apexX - 8).toFixed(1)}" y="${(apexY - 10).toFixed(1)}" width="16" height="6" fill="${roofFill}" stroke="${trimColor}" stroke-width="${LW.PARTITION}" rx="2"/>`);
  parts.push(`<rect x="${(apexX - 6).toFixed(1)}" y="${(apexY - 12).toFixed(1)}" width="12" height="2" fill="${trimColor}" rx="1"/>`);

  // Ridge tile underlayment
  parts.push(`<polyline points="${(apexX - 6).toFixed(1)},${(apexY - 8).toFixed(1)} ${(apexX + 6).toFixed(1)},${(apexY - 8).toFixed(1)} ${(apexX + 6).toFixed(1)},${(apexY - 4).toFixed(1)} ${(apexX - 6).toFixed(1)},${(apexY - 4).toFixed(1)}" fill="none" stroke="${trimColor}" stroke-width="${LW.PARTITION}"/>`);

  // Gutter profile at both eaves
  const gutterH = 4;
  const gutterW = 3;
  parts.push(`<rect x="${(lEave - 1).toFixed(1)}" y="${(eavesY - gutterH).toFixed(1)}" width="${gutterW.toFixed(1)}" height="${gutterH.toFixed(1)}" fill="${roofFill}" stroke="${trimColor}" stroke-width="0.75"/>`);
  parts.push(`<rect x="${(rEave - 2).toFixed(1)}" y="${(eavesY - gutterH).toFixed(1)}" width="${gutterW.toFixed(1)}" height="${gutterH.toFixed(1)}" fill="${roofFill}" stroke="${trimColor}" stroke-width="0.75"/>`);
  // Gutter outlet/downpipe hint
  const downpipeX = lEave + 30;
  parts.push(`<line x1="${downpipeX.toFixed(1)}" y1="${(eavesY - gutterH).toFixed(1)}" x2="${downpipeX.toFixed(1)}" y2="${(eavesY + 4).toFixed(1)}" stroke="${trimColor}" stroke-width="1" opacity="0.5"/>`);

  // Barge board / fly rafter at gable ends
  const bargeCol = printMode ? '#64748b' : '#cbd5e1';
  parts.push(`<line x1="${(lEave - 2).toFixed(1)}" y1="${(eavesY - fasciaH + 2).toFixed(1)}" x2="${(apexX - 2).toFixed(1)}" y2="${(apexY - fasciaH + 2).toFixed(1)}" stroke="${bargeCol}" stroke-width="1.5" opacity="0.7"/>`);
  parts.push(`<line x1="${(rEave + 2).toFixed(1)}" y1="${(eavesY - fasciaH + 2).toFixed(1)}" x2="${(apexX + 2).toFixed(1)}" y2="${(apexY - fasciaH + 2).toFixed(1)}" stroke="${bargeCol}" stroke-width="1.5" opacity="0.7"/>`);

  // Roof annotation
  const textCol = printMode ? '#475569' : '#94a3b8';
  parts.push(`<text x="${apexX.toFixed(1)}" y="${(apexY - 20).toFixed(1)}" fill="${textCol}" font-size="7" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">PITCHED ROOF · CHROMADEK ON TIMBER TRUSSES</text>`);
  parts.push(`<text x="${apexX.toFixed(1)}" y="${(apexY - 14).toFixed(1)}" fill="${textCol}" font-size="5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">FASCIA ${fasciaDepthPx}mm · EAVE ${eavesDepthPx}mm · GUTTER 100mm</text>`);

  return parts;
}

function renderParapetRoof(
  leftX: number, rightX: number,
  roofZ: number,
  sz: (z: number) => number,
  roofFill: string, roofStroke: string, trimColor: string,
  _parCol: string,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const parH = 18;
  const parThk = 6;
  const parY = sz(roofZ);

  // Main flat roof slab
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(parY - parH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${parH.toFixed(1)}" fill="${roofFill}" stroke="${roofStroke}" stroke-width="${LW.PROFILE}"/>`);

  // Roof build-up layers
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(parY - parH + 3).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(parY - parH + 3).toFixed(1)}" stroke="${roofStroke}" stroke-width="${LW.HATCH}" stroke-dasharray="2 2"/>`);
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(parY - parH + 6).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(parY - parH + 6).toFixed(1)}" stroke="${roofStroke}" stroke-width="0.35" stroke-dasharray="4 2" opacity="0.5"/>`);
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(parY - parH + 9).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(parY - parH + 9).toFixed(1)}" stroke="${roofStroke}" stroke-width="0.35" stroke-dasharray="2 4" opacity="0.4"/>`);

  // Left parapet with increased detail
  parts.push(`<rect x="${(leftX - parThk).toFixed(1)}" y="${(parY - parH - 10).toFixed(1)}" width="${parThk.toFixed(1)}" height="${(parH + 10).toFixed(1)}" fill="${roofFill}" stroke="${trimColor}" stroke-width="${LW.PARTITION}"/>`);
  parts.push(`<rect x="${(leftX - parThk + 1).toFixed(1)}" y="${(parY - parH - 8).toFixed(1)}" width="2" height="${(parH + 6).toFixed(1)}" fill="none" stroke="${trimColor}" stroke-width="0.35" opacity="0.4"/>`);

  // Right parapet
  parts.push(`<rect x="${rightX.toFixed(1)}" y="${(parY - parH - 10).toFixed(1)}" width="${parThk.toFixed(1)}" height="${(parH + 10).toFixed(1)}" fill="${roofFill}" stroke="${trimColor}" stroke-width="${LW.PARTITION}"/>`);
  parts.push(`<rect x="${(rightX + parThk - 3).toFixed(1)}" y="${(parY - parH - 8).toFixed(1)}" width="2" height="${(parH + 6).toFixed(1)}" fill="none" stroke="${trimColor}" stroke-width="0.35" opacity="0.4"/>`);

  // Parapet coping caps with drip
  parts.push(`<rect x="${(leftX - parThk - 3).toFixed(1)}" y="${(parY - parH - 14).toFixed(1)}" width="${(parThk + 6).toFixed(1)}" height="4" fill="${trimColor}" rx="1"/>`);
  parts.push(`<rect x="${(rightX - 3).toFixed(1)}" y="${(parY - parH - 14).toFixed(1)}" width="${(parThk + 6).toFixed(1)}" height="4" fill="${trimColor}" rx="1"/>`);

  // Coping drip groove
  parts.push(`<line x1="${(leftX - parThk - 1).toFixed(1)}" y1="${(parY - parH - 10).toFixed(1)}" x2="${(leftX - parThk - 1).toFixed(1)}" y2="${(parY - parH - 8).toFixed(1)}" stroke="${trimColor}" stroke-width="0.5"/>`);
  parts.push(`<line x1="${(rightX + parThk + 1).toFixed(1)}" y1="${(parY - parH - 10).toFixed(1)}" x2="${(rightX + parThk + 1).toFixed(1)}" y2="${(parY - parH - 8).toFixed(1)}" stroke="${trimColor}" stroke-width="0.5"/>`);

  // Fall/drainage indication
  parts.push(`<polyline points="${leftX.toFixed(1)},${(parY - parH).toFixed(1)} ${(rightX).toFixed(1)},${(parY - parH + 3).toFixed(1)}" fill="none" stroke="${roofStroke}" stroke-width="${LW.HATCH}" stroke-dasharray="6 3"/>`);

  // Annotation
  const textCol = printMode ? '#475569' : '#94a3b8';
  const midX = (leftX + rightX) / 2;
  parts.push(`<text x="${midX.toFixed(1)}" y="${(parY - parH - 20).toFixed(1)}" fill="${textCol}" font-size="7" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">FLAT ROOF · PARAPET · SINGLE-PLY MEMBRANE</text>`);
  parts.push(`<text x="${midX.toFixed(1)}" y="${(parY - parH - 14).toFixed(1)}" fill="${textCol}" font-size="5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">PARAPET H=600mm · COPING · FALL 1:60</text>`);

  return parts;
}

function renderSlabEdgeRoof(
  leftX: number, rightX: number,
  roofZ: number,
  sz: (z: number) => number,
  roofFill: string, roofStroke: string, trimColor: string,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const slabThk = 14;
  const slabY = sz(roofZ);

  // Exposed slab edge — thicker
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(slabY - slabThk).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${slabThk.toFixed(1)}" fill="${roofFill}" stroke="${roofStroke}" stroke-width="${LW.PROFILE}"/>`);
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(slabY - slabThk).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${slabThk.toFixed(1)}" fill="url(#concrete-hatch)" opacity="${printMode ? 0.25 : 0.4}"/>`);

  // Slab edge formwork line
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(slabY - slabThk + 3).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(slabY - slabThk + 3).toFixed(1)}" stroke="${roofStroke}" stroke-width="${LW.HATCH}" opacity="${printMode ? 0.3 : 0.2}"/>`);
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(slabY - 4).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(slabY - 4).toFixed(1)}" stroke="${roofStroke}" stroke-width="${LW.HATCH}" stroke-dasharray="2 2"/>`);

  // Waterproof upstand
  const upstandH = 8;
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(slabY - slabThk - upstandH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="${upstandH.toFixed(1)}" fill="${trimColor}" stroke="none" opacity="0.7"/>`);
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(slabY - slabThk - upstandH).toFixed(1)}" width="${(rightX - leftX).toFixed(1)}" height="2" fill="${printMode ? '#e2e8f0' : '#cbd5e1'}" stroke="none"/>`);

  // Parapet upstand / guardrail posts
  const postSpacing = 40;
  for (let x = leftX + 10; x < rightX; x += postSpacing) {
    parts.push(`<line x1="${x.toFixed(1)}" y1="${(slabY - slabThk - upstandH).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(slabY - slabThk - upstandH - 8).toFixed(1)}" stroke="${trimColor}" stroke-width="${LW.PARTITION}"/>`);
  }

  // Handrail top
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${(slabY - slabThk - upstandH - 8).toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${(slabY - slabThk - upstandH - 8).toFixed(1)}" stroke="${trimColor}" stroke-width="${LW.PROJECTION}"/>`);

  // Annotation
  const textCol = printMode ? '#475569' : '#94a3b8';
  const midX = (leftX + rightX) / 2;
  parts.push(`<text x="${midX.toFixed(1)}" y="${(slabY - slabThk - upstandH - 16).toFixed(1)}" fill="${textCol}" font-size="7" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">RC SLAB EDGE · PARAPET UPSTAND · WATERPROOFING</text>`);
  parts.push(`<text x="${midX.toFixed(1)}" y="${(slabY - slabThk - upstandH - 10).toFixed(1)}" fill="${textCol}" font-size="5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">200mm RC SLAB · 150mm UPSTAND · GALV HANDRAIL</text>`);

  return parts;
}

function renderSteppedRoof(
  leftX: number, rightX: number,
  roofZ: number, roofPitch: number,
  sz: (z: number) => number,
  roofFill: string, roofStroke: string, trimColor: string,
  _parCol: string,
  _fasciaDepthPx: number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const midX = (leftX + rightX) / 2;
  const baseY = sz(roofZ);
  const stepW = (rightX - leftX) * 0.15;

  // Stepped profile: central raised section with lower side wings
  const cL = midX - stepW * 1.8;
  const cR = midX + stepW * 1.8;
  const wingY = sz(roofZ + roofPitch * 0.35);

  // Left wing with parapet
  parts.push(`<polygon points="${leftX.toFixed(1)},${baseY.toFixed(1)} ${cL.toFixed(1)},${baseY.toFixed(1)} ${cL.toFixed(1)},${wingY.toFixed(1)} ${leftX.toFixed(1)},${wingY.toFixed(1)}" fill="${roofFill}" stroke="${roofStroke}" stroke-width="${LW.PROFILE}"/>`);
  parts.push(`<line x1="${leftX.toFixed(1)}" y1="${wingY.toFixed(1)}" x2="${cL.toFixed(1)}" y2="${wingY.toFixed(1)}" stroke="${trimColor}" stroke-width="${LW.PARTITION}"/>`);

  // Right wing
  parts.push(`<polygon points="${cR.toFixed(1)},${baseY.toFixed(1)} ${rightX.toFixed(1)},${baseY.toFixed(1)} ${rightX.toFixed(1)},${wingY.toFixed(1)} ${cR.toFixed(1)},${wingY.toFixed(1)}" fill="${roofFill}" stroke="${roofStroke}" stroke-width="${LW.PROFILE}"/>`);
  parts.push(`<line x1="${cR.toFixed(1)}" y1="${wingY.toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${wingY.toFixed(1)}" stroke="${trimColor}" stroke-width="${LW.PARTITION}"/>`);

  // Central raised section taller
  const topY = sz(roofZ + roofPitch);
  parts.push(`<polygon points="${cL.toFixed(1)},${wingY.toFixed(1)} ${cR.toFixed(1)},${wingY.toFixed(1)} ${cR.toFixed(1)},${topY.toFixed(1)} ${cL.toFixed(1)},${topY.toFixed(1)}" fill="${roofFill}" stroke="${roofStroke}" stroke-width="${LW.PROFILE}"/>`);

  // Central section coping with decorative profile
  parts.push(`<rect x="${(cL - 4).toFixed(1)}" y="${(topY - 4).toFixed(1)}" width="${(cR - cL + 8).toFixed(1)}" height="4" fill="${trimColor}" rx="1"/>`);
  parts.push(`<rect x="${(cL - 2).toFixed(1)}" y="${(topY - 6).toFixed(1)}" width="${(cR - cL + 4).toFixed(1)}" height="2" fill="${trimColor}" rx="1"/>`);

  // Cross / steeple motif on central raised section for worship
  const motifY = sz(roofZ + roofPitch + 0.3);
  parts.push(`<line x1="${midX.toFixed(1)}" y1="${(topY - 6).toFixed(1)}" x2="${midX.toFixed(1)}" y2="${motifY.toFixed(1)}" stroke="${trimColor}" stroke-width="${LW.PROFILE}" opacity="0.7"/>`);
  parts.push(`<line x1="${(midX - 4).toFixed(1)}" y1="${(motifY - 4).toFixed(1)}" x2="${(midX + 4).toFixed(1)}" y2="${(motifY - 4).toFixed(1)}" stroke="${trimColor}" stroke-width="${LW.PARTITION}" opacity="0.7"/>`);

  // Wing parapet caps with coping
  parts.push(`<rect x="${leftX.toFixed(1)}" y="${(wingY - 3).toFixed(1)}" width="${(cL - leftX).toFixed(1)}" height="3" fill="${trimColor}" rx="1"/>`);
  parts.push(`<rect x="${cR.toFixed(1)}" y="${(wingY - 3).toFixed(1)}" width="${(rightX - cR).toFixed(1)}" height="3" fill="${trimColor}" rx="1"/>`);

  // Annotation
  const textCol = printMode ? '#475569' : '#94a3b8';
  parts.push(`<text x="${midX.toFixed(1)}" y="${(topY - 14).toFixed(1)}" fill="${textCol}" font-size="7" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">STEPPED PARAPET · WORSHIP / COMMUNITY ROOF</text>`);
  parts.push(`<text x="${midX.toFixed(1)}" y="${(topY - 8).toFixed(1)}" fill="${textCol}" font-size="5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">CENTRAL TOWER · PARAPET WITH COPING</text>`);

  return parts;
}
