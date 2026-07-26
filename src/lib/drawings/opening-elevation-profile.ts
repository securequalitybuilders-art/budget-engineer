import type { CadDocument, OpeningElevationProfile } from '@/domain/ws6-types';
import { mapRoomsToFrontage, getEntranceOpening } from './frontage-mapper';
import { LW } from './lineweights';

function inferDoorKind(typeName?: string): 'sliding' | 'hinged' | 'folding' | 'pocket' | 'bi-fold' {
  if (!typeName) return 'hinged';
  const t = typeName.toLowerCase();
  if (t.includes('sliding')) return 'sliding';
  if (t.includes('bi-fold') || t.includes('folding')) return 'bi-fold';
  if (t.includes('pocket')) return 'pocket';
  return 'hinged';
}

function needsMullion(width: number, kind: 'door' | 'window'): boolean {
  if (kind === 'door') return width > 1.8;
  return width > 2.4;
}

function mullionCount(width: number, kind: 'door' | 'window'): number {
  if (kind === 'door') return width > 2.4 ? 2 : (width > 1.8 ? 1 : 0);
  return width > 3.6 ? 3 : (width > 2.4 ? 2 : 1);
}

export function buildOpeningProfiles(cad: CadDocument, _viewId: string): OpeningElevationProfile[] {
  const entrance = getEntranceOpening(cad);
  const frontages = mapRoomsToFrontage(cad);

  function getRoomBehind(wallId: string): string | null {
    const fm = frontages.find(f => {
      const ws = f.wallSegment;
      const wall = cad.walls.find(w => w.id === wallId);
      if (!wall) return false;
      return ws.start.x === wall.start.x && ws.start.y === wall.start.y;
    });
    return fm?.roomName ?? null;
  }

  return cad.openings.map(o => {
    const width = o.width;
    const kind = o.kind;
    const doorKind = kind === 'door' ? inferDoorKind(o.metadata.typeName) : undefined;
    const hasMul = needsMullion(width, kind);
    const mulCount = hasMul ? mullionCount(width, kind) : 0;
    const sill = o.sillHeight ?? (kind === 'door' ? 0 : 0.9);
    const head = o.headHeight ?? (kind === 'door' ? 2.1 : (sill + 1.2));

    return {
      openingId: o.id,
      kind,
      width,
      height: o.height ?? (head - sill),
      sillHeight: sill,
      headHeight: head,
      frameDepthMm: kind === 'door' ? 60 : 50,
      hasMullion: hasMul,
      mullionCount: mulCount,
      ...(doorKind ? { doorSubtype: { kind: doorKind } } : {}),
      roomBehind: getRoomBehind(o.wallId),
      isEntrance: entrance?.openingId === o.id,
    };
  });
}

export function renderOpeningElevation(
  profile: OpeningElevationProfile,
  opX: number,
  opY: number,
  opW: number,
  opH: number,
  sillY: number,
  headY: number,
  printMode: boolean,
): string[] {
  const parts: string[] = [];
  const openingFill = printMode ? '#0b1220' : '#0b1220';
  const wallStroke = printMode ? '#0f172a' : '#334155';
  const projColor = printMode ? '#94a3b8' : '#475569';
  const glassFill = printMode ? '#f1f5f9' : '#1e293b';
  const trimColor = printMode ? '#64748b' : '#cbd5e1';
  const textSub = printMode ? '#475569' : '#94a3b8';
  const shadowCol = printMode ? '#475569' : '#0a0f1a';

  const frame = profile.frameDepthMm;
  const framePx = Math.max(frame / 10, 3);

  parts.push(`<rect x="${opX.toFixed(1)}" y="${opY.toFixed(1)}" width="${opW.toFixed(1)}" height="${opH.toFixed(1)}" fill="${openingFill}" stroke="${wallStroke}" stroke-width="1.5"/>`);

  // Opening inner shadow for depth
  parts.push(`<line x1="${opX.toFixed(1)}" y1="${opY.toFixed(1)}" x2="${(opX + opW).toFixed(1)}" y2="${opY.toFixed(1)}" stroke="${shadowCol}" stroke-width="2" opacity="0.3"/>`);
  parts.push(`<line x1="${opX.toFixed(1)}" y1="${opY.toFixed(1)}" x2="${opX.toFixed(1)}" y2="${(opY + opH).toFixed(1)}" stroke="${shadowCol}" stroke-width="2" opacity="0.3"/>`);
  parts.push(`<line x1="${(opX + opW).toFixed(1)}" y1="${opY.toFixed(1)}" x2="${(opX + opW).toFixed(1)}" y2="${(opY + opH).toFixed(1)}" stroke="${shadowCol}" stroke-width="0.75" opacity="0.2"/>`);

  if (profile.kind === 'window') {
    const innerW = opW - framePx * 2;
    const innerH = opH - framePx * 2;
    parts.push(`<rect x="${(opX + framePx).toFixed(1)}" y="${(opY + framePx).toFixed(1)}" width="${innerW.toFixed(1)}" height="${innerH.toFixed(1)}" fill="${glassFill}" stroke="${projColor}" stroke-width="0.75"/>`);
    // Glass gradient overlay for depth
    if (!printMode) {
      parts.push(`<rect x="${(opX + framePx).toFixed(1)}" y="${(opY + framePx).toFixed(1)}" width="${innerW.toFixed(1)}" height="${innerH.toFixed(1)}" fill="url(#glass-gradient)" opacity="0.5"/>`);
    }

    // Mullion profile with depth shadow
    if (profile.hasMullion) {
      const count = profile.mullionCount;
      for (let i = 1; i <= count; i++) {
        const mx = opX + (opW * i) / (count + 1);
        parts.push(`<line x1="${mx.toFixed(1)}" y1="${(opY + framePx).toFixed(1)}" x2="${mx.toFixed(1)}" y2="${(opY + opH - framePx).toFixed(1)}" stroke="${projColor}" stroke-width="1.5"/>`);
        parts.push(`<line x1="${(mx + 1).toFixed(1)}" y1="${(opY + framePx + 2).toFixed(1)}" x2="${(mx + 1).toFixed(1)}" y2="${(opY + opH - framePx - 2).toFixed(1)}" stroke="${shadowCol}" stroke-width="0.5" opacity="0.3"/>`);
      }
    }

    // Sash lines
    if (innerH > 30) {
      const sashY1 = opY + opH * 0.45;
      const sashY2 = opY + opH * 0.9;
      parts.push(`<line x1="${(opX + framePx + 1).toFixed(1)}" y1="${sashY1.toFixed(1)}" x2="${(opX + opW - framePx - 1).toFixed(1)}" y2="${sashY1.toFixed(1)}" stroke="${projColor}" stroke-width="0.75" opacity="0.5"/>`);
      parts.push(`<line x1="${(opX + framePx + 1).toFixed(1)}" y1="${sashY2.toFixed(1)}" x2="${(opX + opW - framePx - 1).toFixed(1)}" y2="${sashY2.toFixed(1)}" stroke="${projColor}" stroke-width="0.75" opacity="0.5"/>`);
    }

    if (innerH > 40) {
      parts.push(`<line x1="${(opX + framePx).toFixed(1)}" y1="${(opY + opH * 0.33).toFixed(1)}" x2="${(opX + opW - framePx).toFixed(1)}" y2="${(opY + opH * 0.33).toFixed(1)}" stroke="${projColor}" stroke-width="0.75"/>`);
    }

    // Frame reveal with depth fill
    const reveal = 3;
    const revealFill = printMode ? '#f1f5f9' : '#0f172a';
    parts.push(`<rect x="${(opX - reveal).toFixed(1)}" y="${opY.toFixed(1)}" width="${reveal.toFixed(1)}" height="${opH.toFixed(1)}" fill="${revealFill}" stroke="${projColor}" stroke-width="${LW.HATCH}"/>`);
    parts.push(`<rect x="${(opX + opW).toFixed(1)}" y="${opY.toFixed(1)}" width="${reveal.toFixed(1)}" height="${opH.toFixed(1)}" fill="${revealFill}" stroke="${projColor}" stroke-width="${LW.HATCH}"/>`);
    parts.push(`<rect x="${opX.toFixed(1)}" y="${(opY - 4).toFixed(1)}" width="${opW.toFixed(1)}" height="4" fill="${projColor}" stroke="none"/>`);
    parts.push(`<rect x="${opX.toFixed(1)}" y="${(opY + opH).toFixed(1)}" width="${opW.toFixed(1)}" height="4" fill="${projColor}" stroke="none"/>`);

    // Lintel shadow
    parts.push(`<line x1="${opX.toFixed(1)}" y1="${(headY - 3).toFixed(1)}" x2="${(opX + opW).toFixed(1)}" y2="${(headY - 3).toFixed(1)}" stroke="${shadowCol}" stroke-width="0.5" opacity="0.3"/>`);

    parts.push(`<text x="${(opX + opW + 5).toFixed(1)}" y="${(sillY + 8).toFixed(1)}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">SILL +${profile.sillHeight.toFixed(2)}</text>`);
    parts.push(`<text x="${(opX + opW + 5).toFixed(1)}" y="${(headY - 6).toFixed(1)}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">HD +${profile.headHeight.toFixed(2)}</text>`);
  } else {
    const doorSubtype = profile.doorSubtype?.kind ?? 'hinged';
    const frameD = Math.max(framePx, 4);

    if (doorSubtype === 'sliding') {
      const panelFill = printMode ? '#f1f5f9' : '#1e293b';
      parts.push(`<rect x="${(opX + frameD).toFixed(1)}" y="${(opY + frameD).toFixed(1)}" width="${(opW - frameD * 2).toFixed(1)}" height="${(opH - frameD).toFixed(1)}" fill="${panelFill}" stroke="${projColor}" stroke-width="1.5"/>`);
      // Sliding door frame shadow
      parts.push(`<line x1="${(opX + frameD + 1).toFixed(1)}" y1="${(opY + frameD + 1).toFixed(1)}" x2="${(opX + frameD + 1).toFixed(1)}" y2="${(opY + opH - frameD).toFixed(1)}" stroke="${shadowCol}" stroke-width="0.5" opacity="0.3"/>`);
      parts.push(`<rect x="${(opX + opW - 14).toFixed(1)}" y="${(opY + opH * 0.45).toFixed(1)}" width="4" height="${(opH * 0.15).toFixed(1)}" fill="${trimColor}" rx="1"/>`);
      parts.push(`<line x1="${(opX + opW - 18).toFixed(1)}" y1="${(opY + opH * 0.45 + 4).toFixed(1)}" x2="${(opX + 14).toFixed(1)}" y2="${(opY + opH * 0.45 + 4).toFixed(1)}" stroke="${projColor}" stroke-width="0.5" stroke-dasharray="2 2"/>`);
    } else if (doorSubtype === 'bi-fold') {
      const panelW = opW / 4;
      for (let i = 0; i < 4; i++) {
        const px = opX + i * panelW;
        parts.push(`<rect x="${px.toFixed(1)}" y="${(opY + frameD).toFixed(1)}" width="${(panelW - 2).toFixed(1)}" height="${(opH - frameD).toFixed(1)}" fill="${printMode ? '#e2e8f0' : '#1e293b'}" stroke="${projColor}" stroke-width="0.75"/>`);
      }
    } else {
      const panelFill = printMode ? '#e2e8f0' : '#1e293b';
      parts.push(`<rect x="${(opX + frameD).toFixed(1)}" y="${(opY + frameD).toFixed(1)}" width="${(opW - frameD * 2).toFixed(1)}" height="${(opH - frameD).toFixed(1)}" fill="${panelFill}" stroke="${projColor}" stroke-width="1.5"/>`);

      // Door panel stile-and-rail pattern
      if (opW > 20 && opH > 30) {
        const insetX = 8;
        const insetY = 10;
        const pw = opW - frameD * 2 - insetX * 2;
        parts.push(`<rect x="${(opX + frameD + insetX).toFixed(1)}" y="${(opY + frameD + insetY).toFixed(1)}" width="${pw.toFixed(1)}" height="${(opH * 0.3).toFixed(1)}" fill="none" stroke="${projColor}" stroke-width="0.75"/>`);
        const botPanelY = opY + frameD + (opH - frameD) * 0.55;
        parts.push(`<rect x="${(opX + frameD + insetX).toFixed(1)}" y="${botPanelY.toFixed(1)}" width="${pw.toFixed(1)}" height="${((opH - frameD) * 0.3).toFixed(1)}" fill="none" stroke="${projColor}" stroke-width="0.75"/>`);
        // Mid rail
        parts.push(`<line x1="${(opX + frameD + insetX).toFixed(1)}" y1="${(opY + frameD + insetY + opH * 0.3 + 4).toFixed(1)}" x2="${(opX + opW - frameD - insetX).toFixed(1)}" y2="${(opY + frameD + insetY + opH * 0.3 + 4).toFixed(1)}" stroke="${projColor}" stroke-width="0.5" opacity="0.5"/>`);

        if (profile.isEntrance) {
          // Handle on entrance door
          const handleX = opX + opW * 0.82;
          const handleY = opY + opH * 0.5;
          parts.push(`<rect x="${(handleX - 1).toFixed(1)}" y="${(handleY - 8).toFixed(1)}" width="2.5" height="16" fill="${trimColor}" rx="1.5" opacity="0.9"/>`);
          parts.push(`<rect x="${(handleX + 1).toFixed(1)}" y="${(handleY - 2).toFixed(1)}" width="7" height="3.5" fill="${trimColor}" rx="1.5" opacity="0.9"/>`);
        }
      }
    }

    if (profile.isEntrance) {
      parts.push(`<text x="${(opX + opW + 5).toFixed(1)}" y="${(opY + 14).toFixed(1)}" fill="${textSub}" font-size="7" font-style="italic" font-family="Arial,Helvetica,sans-serif">ENTRY</text>`);
    }
    // Head annotation
    parts.push(`<text x="${(opX + opW + 5).toFixed(1)}" y="${(opY + 8).toFixed(1)}" fill="${textSub}" font-size="6" font-family="Arial,Helvetica,sans-serif">HD +${profile.headHeight.toFixed(2)}</text>`);

    // Door frame shadow line
    parts.push(`<line x1="${(opX + frameD + 1).toFixed(1)}" y1="${(opY + frameD + 1).toFixed(1)}" x2="${(opX + frameD + 1).toFixed(1)}" y2="${(opY + opH - 2).toFixed(1)}" stroke="${shadowCol}" stroke-width="0.5" opacity="0.3"/>`);
  }

  if (profile.roomBehind) {
    parts.push(`<text x="${(opX + opW / 2).toFixed(1)}" y="${(opY + opH + 16).toFixed(1)}" fill="${textSub}" font-size="5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${profile.roomBehind}</text>`);
  }

  return parts;
}
