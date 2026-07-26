import type {
  SiteContext, SunWindPathData, AccessNoiseData, FigureGroundData,
  NaturalFeaturesData, PermeabilityTransportData, ConceptUrbanContextData,
  SiteDiagram, ContourLine, Point2D
} from '@/domain/site';
import { computeSunPath } from './heliodon';
import { computeSiteAnalysis, orientationScore } from './siteAnalysis';

function polygonSvg(vertices: Point2D[], fill: string, stroke: string, strokeWidth = 1, opacity = 1): string {
  const pts = vertices.map(v => `${v.x},${v.y}`).join(' ');
  return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />`;
}

function lineSvg(p1: Point2D, p2: Point2D, stroke: string, width = 1, dash = ''): string {
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : '';
  return `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${stroke}" stroke-width="${width}"${dashAttr} />`;
}

function textSvg(x: number, y: number, label: string, size = 10, color = '#333'): string {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-family="sans-serif">${label}</text>`;
}

function arrowSvg(from: Point2D, to: Point2D, color: string, width = 1): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return '';
  const ux = dx / len;
  const uy = dy / len;
  const headSize = 6;
  const p1 = { x: to.x - headSize * ux + headSize * 0.4 * uy, y: to.y - headSize * uy - headSize * 0.4 * ux };
  const p2 = { x: to.x - headSize * ux - headSize * 0.4 * uy, y: to.y - headSize * uy + headSize * 0.4 * ux };
  return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" stroke-width="${width}" />` +
    `<polygon points="${to.x},${to.y} ${p1.x},${p1.y} ${p2.x},${p2.y}" fill="${color}" />`;
}

function generateSunWindPathDiagram(site: SiteContext): { svg: string; data: SunWindPathData } {
  const date = new Date();
  const sunPositions = computeSunPath(site.lat, site.lng, date);
  const analysis = computeSiteAnalysis(site);
  const score = orientationScore(site.orientation, analysis.optimalOrientation);

  const w = 400, h = 300, cx = 200, cy = 150, r = 100;
  let svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${w}" height="${h}" fill="#fafafa" rx="4" />`;

  svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ddd" stroke-width="1" />`;
  svg += `<circle cx="${cx}" cy="${cy}" r="2" fill="#666" />`;

  for (const pos of sunPositions) {
    const aRad = (pos.azimuth - 180) * Math.PI / 180;
    const radius = r * Math.max(0.05, pos.elevation / 90);
    const sx = cx + radius * Math.sin(aRad);
    const sy = cy + radius * Math.cos(aRad);
    svg += `<circle cx="${sx}" cy="${sy}" r="2" fill="#e6a817" opacity="0.6" />`;
  }

  for (const sector of site.windRose.sectors.slice(0, 8)) {
    const aRad = (sector.direction - 180) * Math.PI / 180;
    const len = r * Math.min(1, sector.speed / 10);
    const ex = cx + len * Math.sin(aRad);
    const ey = cy + len * Math.cos(aRad);
    svg += arrowSvg({ x: cx, y: cy }, { x: ex, y: ey }, '#3b82f6', 1.5);
  }

  const bestAnalysis = [...analysis.solarExposure].sort((a, b) => b.annualKwhM2 - a.annualKwhM2)[0];
  if (bestAnalysis) {
    const optRad = (bestAnalysis.angle - 180) * Math.PI / 180;
    const optEnd = { x: cx + r * 0.85 * Math.sin(optRad), y: cy + r * 0.85 * Math.cos(optRad) };
    const optStart = { x: cx + r * 0.65 * Math.sin(optRad), y: cy + r * 0.65 * Math.cos(optRad) };
    svg += arrowSvg(optStart, optEnd, '#22c55e', 2);
  }

  svg += textSvg(10, 16, 'Sun & Wind Path', 11, '#111');
  svg += textSvg(10, 32, `Optimal orientation: ${bestAnalysis?.angle ?? 0}°`, 9, '#666');
  svg += textSvg(10, 46, `Orientation score: ${score}/100`, 9, score >= 70 ? '#22c55e' : '#e6a817');
  svg += textSvg(260, 290, 'Sun path · Wind arrows · Optimal orientation', 8, '#999');
  svg += `</svg>`;

  return {
    svg,
    data: {
      sunPositions,
      windRose: site.windRose,
      optimalOrientation: analysis.optimalOrientation,
      orientationScore: score,
    }
  };
}

function generateAccessNoiseDiagram(site: SiteContext): { svg: string; data: AccessNoiseData } {
  const edges = site.accessEdges ?? [];
  const noise = site.noiseSources ?? [];
  const w = 400, h = 300;
  let svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${w}" height="${h}" fill="#fafafa" rx="4" />`;

  const cx = 200, cy = 150, plotR = 80;
  svg += `<circle cx="${cx}" cy="${cy}" r="${plotR}" fill="none" stroke="#ddd" stroke-width="1" stroke-dasharray="4,4" />`;
  svg += `<circle cx="${cx}" cy="${cy}" r="3" fill="#666" />`;
  svg += textSvg(cx - 12, cy + plotR + 16, 'SITE', 9, '#999');

  const edgeColors: Record<string, string> = { vehicle: '#f59e0b', pedestrian: '#22c55e', service: '#8b5cf6', emergency: '#ef4444' };
  const edgeLabels: Record<string, string> = { vehicle: 'V', pedestrian: 'P', service: 'S', emergency: 'E' };
  const edgeAngles = [0, 60, 120, 180, 240, 300];

  for (const edge of edges) {
    const idx = edges.indexOf(edge);
    const angle = edgeAngles[idx % edgeAngles.length];
    const aRad = angle * Math.PI / 180;
    const sx = cx + plotR * Math.cos(aRad);
    const sy = cy + plotR * Math.sin(aRad);
    const ex = cx + (plotR + 30) * Math.cos(aRad);
    const ey = cy + (plotR + 30) * Math.sin(aRad);
    svg += lineSvg({ x: sx, y: sy }, { x: ex, y: ey }, edgeColors[edge.type] ?? '#999', 3);
    svg += textSvg(ex + 5, ey + 4, edgeLabels[edge.type] ?? '?', 9, edgeColors[edge.type] ?? '#999');
  }

  const noiseColors: Record<string, string> = { road: '#ef4444', rail: '#f97316', industrial: '#a855f7', commercial: '#f59e0b' };
  const noiseLabels: Record<string, string> = { road: 'R', rail: 'L', industrial: 'I', commercial: 'C' };
  const noiseAngles = [30, 90, 150, 210];

  for (const src of noise) {
    const idx = noise.indexOf(src);
    const angle = noiseAngles[idx % noiseAngles.length];
    const aRad = angle * Math.PI / 180;
    const dist = plotR + 20 + (src.levelDba / 100) * 40;
    const nx = cx + dist * Math.cos(aRad);
    const ny = cy + dist * Math.sin(aRad);
    svg += `<circle cx="${nx}" cy="${ny}" r="${10 + src.levelDba / 10}" fill="${noiseColors[src.type] ?? '#999'}" opacity="0.15" />`;
    svg += textSvg(nx + 12, ny + 4, `${noiseLabels[src.type] ?? '?'} ${src.levelDba}dB`, 9, noiseColors[src.type] ?? '#999');
  }

  const buffers: { source: string; distanceM: number }[] = edges.map(e => ({ source: e.type, distanceM: e.type === 'vehicle' ? 15 : 5 }));
  noise.forEach(n => buffers.push({ source: n.type, distanceM: n.type === 'road' ? 20 : 10 }));

  svg += textSvg(10, 16, 'Access & Noise', 11, '#111');
  svg += textSvg(10, 32, `Access: ${edges.map(e => e.type).join(', ') || 'none'}`, 9, '#666');
  svg += textSvg(10, 46, `Noise: ${noise.map(n => `${n.type} ${n.levelDba}dB`).join(', ') || 'none'}`, 9, '#666');
  svg += textSvg(260, 290, 'V=Vehicle P=Ped S=Service E=Emerg R=Road L=Rail', 7, '#999');
  svg += `</svg>`;

  return {
    svg,
    data: {
      accessEdges: edges,
      noiseSources: noise,
      recommendedBuffers: buffers,
    }
  };
}

function generateFigureGroundDiagram(site: SiteContext): { svg: string; data: FigureGroundData } {
  const plotBoundary = site.plotBoundary ?? [
    { x: 50, y: 30 }, { x: 350, y: 30 }, { x: 350, y: 270 }, { x: 50, y: 270 }
  ];
  const buildingFootprint = [
    { x: 100, y: 60 }, { x: 300, y: 60 }, { x: 300, y: 240 }, { x: 100, y: 240 }
  ];

  const adjacent = site.adjacentBuildings.map(b => ({
    vertices: b.vertices.map(v => ({ x: v.x * 2 + 150, y: v.y * 2 + 100 })),
    name: b.name
  }));

  const plotArea = polygonArea(plotBoundary);
  const bldgArea = polygonArea(buildingFootprint);
  const coveragePct = plotArea > 0 ? Math.round((bldgArea / plotArea) * 1000) / 10 : 0;
  const far = plotArea > 0 ? Math.round((bldgArea * 1) / plotArea * 100) / 100 : 0;

  const w = 400, h = 300;
  let svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${w}" height="${h}" fill="#fafafa" rx="4" />`;

  svg += polygonSvg(plotBoundary, 'rgba(200,200,200,0.3)', '#999', 1);
  svg += polygonSvg(buildingFootprint, 'rgba(34,197,94,0.4)', '#22c55e', 2);

  for (const b of adjacent) {
    if (b.vertices.length >= 3) {
      svg += polygonSvg(b.vertices, 'rgba(148,163,184,0.3)', '#94a3b8', 1);
      const cx = b.vertices.reduce((s, v) => s + v.x, 0) / b.vertices.length;
      const cy = b.vertices.reduce((s, v) => s + v.y, 0) / b.vertices.length;
      svg += textSvg(cx - 10, cy + 3, b.name.substring(0, 6), 7, '#666');
    }
  }

  svg += textSvg(10, 16, 'Figure-Ground', 11, '#111');
  svg += textSvg(10, 32, `Coverage: ${coveragePct}%  FAR: ${far}`, 9, '#666');
  svg += textSvg(10, 46, `Adjacent: ${adjacent.length} buildings`, 9, '#666');
  svg += textSvg(260, 290, 'Green = building · Grey = context · Dashed = plot', 8, '#999');
  svg += `</svg>`;

  return {
    svg,
    data: {
      plotBoundary,
      buildingFootprint,
      adjacentFootprints: adjacent,
      coveragePct,
      far,
    }
  };
}

function generateNaturalFeaturesDiagram(site: SiteContext): { svg: string; data: NaturalFeaturesData } {
  const topo = site.topography;
  const contours: ContourLine[] = topo?.contours ?? [];
  const w = 400, h = 300;
  let svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${w}" height="${h}" fill="#fafafa" rx="4" />`;

  const cx = 200;

  if (contours.length > 0) {
    for (const c of contours) {
      if (c.vertices.length >= 2) {
        const pts = c.vertices.map(v => {
          const px = 50 + (v.x / 100) * 300;
          const py = 30 + (v.y / 100) * 240;
          return `${px},${py}`;
        }).join(' ');
        svg += `<polyline points="${pts}" fill="none" stroke="#d97706" stroke-width="0.8" opacity="0.6" />`;
        const mid = c.vertices[Math.floor(c.vertices.length / 2)];
        if (mid) {
          const mx = 50 + (mid.x / 100) * 300;
          const my = 30 + (mid.y / 100) * 240;
          svg += textSvg(mx + 3, my, `${c.elevation}m`, 8, '#92400e');
        }
      }
    }
  } else {
    for (let i = 0; i < 5; i++) {
      const y = 50 + i * 50;
      svg += `<ellipse cx="${cx}" cy="${y + 20}" rx="${120 - i * 15}" ry="${12}" fill="none" stroke="#d97706" stroke-width="0.6" opacity="0.5" />`;
      svg += textSvg(cx + 120 - i * 15 - 35, y + 23, `${(5 - i) * 2}m`, 8, '#92400e');
    }
  }

  const slopeInfo = topo ? `${topo.slopeDeg}° ${topo.slopeDeg < 5 ? 'gentle' : topo.slopeDeg < 15 ? 'moderate' : 'steep'}` : 'N/A';
  const highInfo = topo ? `${topo.highPoint}m` : 'N/A';
  const lowInfo = topo ? `${topo.lowPoint}m` : 'N/A';

  svg += textSvg(10, 16, 'Natural Features', 11, '#111');
  svg += textSvg(10, 32, `Slope: ${slopeInfo}`, 9, '#666');
  svg += textSvg(10, 46, `High: ${highInfo}  Low: ${lowInfo}`, 9, '#666');
  svg += textSvg(10, 60, `Terrain: ${site.terrain}`, 9, '#666');
  svg += textSvg(260, 290, 'Contours at 2m intervals with elevation labels', 8, '#999');
  svg += `</svg>`;

  return {
    svg,
    data: {
      contours,
      highPoint: topo?.highPoint ?? 0,
      lowPoint: topo?.lowPoint ?? 0,
      slopeDeg: topo?.slopeDeg ?? 0,
      aspect: topo?.aspect ?? 0,
    }
  };
}

function generatePermeabilityTransportDiagram(site: SiteContext): { svg: string; data: PermeabilityTransportData } {
  const edges = site.accessEdges ?? [];
  const w = 400, h = 300;
  const cx = 200, cy = 150, plotR = 80;
  let svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${w}" height="${h}" fill="#fafafa" rx="4" />`;

  svg += `<circle cx="${cx}" cy="${cy}" r="${plotR}" fill="rgba(59,130,246,0.08)" stroke="#3b82f6" stroke-width="1" stroke-dasharray="4,4" />`;

  const permeableAreas = [
    [{ x: 100, y: 50 }, { x: 160, y: 50 }, { x: 160, y: 100 }, { x: 100, y: 100 }],
    [{ x: 250, y: 200 }, { x: 310, y: 200 }, { x: 310, y: 250 }, { x: 250, y: 250 }],
  ];

  for (const area of permeableAreas) {
    svg += polygonSvg(area, 'rgba(34,197,94,0.2)', '#22c55e', 1);
  }

  const impermeableArea = [{ x: 120, y: 130 }, { x: 200, y: 110 }, { x: 260, y: 150 }, { x: 190, y: 180 }];
  svg += polygonSvg(impermeableArea, 'rgba(239,68,68,0.15)', '#ef4444', 1);

  const transportNodes = [
    { type: 'bus', location: { x: 50, y: 120 } },
    { type: 'taxi', location: { x: 340, y: 80 } },
  ];

  const nodeColors: Record<string, string> = { bus: '#f59e0b', taxi: '#8b5cf6', train: '#3b82f6' };
  for (const node of transportNodes) {
    svg += `<circle cx="${node.location.x}" cy="${node.location.y}" r="6" fill="${nodeColors[node.type] ?? '#999'}" opacity="0.7" />`;
    svg += textSvg(node.location.x + 8, node.location.y + 4, node.type, 8, nodeColors[node.type] ?? '#999');
  }

  for (const edge of edges) {
    if (edge.type === 'vehicle') {
      const angle = edges.indexOf(edge) * 60;
      const aRad = angle * Math.PI / 180;
      const sx = cx + plotR * Math.cos(aRad);
      const sy = cy + plotR * Math.sin(aRad);
      const ex = cx + (plotR + 40) * Math.cos(aRad);
      const ey = cy + (plotR + 40) * Math.sin(aRad);
      svg += lineSvg({ x: sx, y: sy }, { x: ex, y: ey }, '#f59e0b', 3, '4,3');
    }
  }

  const impermeablePct = 65;

  svg += textSvg(10, 16, 'Permeability & Transport', 11, '#111');
  svg += textSvg(10, 32, `Impermeable surface: ${impermeablePct}%`, 9, '#666');
  svg += textSvg(10, 46, `Transport nodes: ${transportNodes.map(n => n.type).join(', ')}`, 9, '#666');
  svg += textSvg(10, 60, `Access routes: ${edges.length}`, 9, '#666');
  svg += textSvg(210, 290, 'Green=permeable Red=impermeable Bus/Taxi=brown/purple', 8, '#999');
  svg += `</svg>`;

  return {
    svg,
    data: {
      accessEdges: edges,
      permeableAreas: permeableAreas.map(a => a.map(v => ({ x: v.x, y: v.y }))),
      impermeablePct,
      transportNodes,
    }
  };
}

function generateConceptUrbanContextDiagram(site: SiteContext): { svg: string; data: ConceptUrbanContextData } {
  const analysis = computeSiteAnalysis(site);
  const bestAngle = analysis.optimalOrientation;
  const w = 400, h = 300;
  const cx = 200, cy = 140, r = 90;

  let svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${w}" height="${h}" fill="#fafafa" rx="4" />`;

  svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(59,130,246,0.05)" stroke="#3b82f6" stroke-width="0.5" />`;

  const sunAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  for (let i = 0; i < sunAngles.length; i++) {
    const aRad = (sunAngles[i] - 180) * Math.PI / 180;
    const lx = cx + (r + 15) * Math.sin(aRad);
    const ly = cy + (r + 15) * Math.cos(aRad);
    svg += textSvg(lx - 5, ly + 4, labels[i], 8, '#94a3b8');
    svg += `<line x1="${cx + (r - 10) * Math.sin(aRad)}" y1="${cy + (r - 10) * Math.cos(aRad)}" ` +
      `x2="${cx + r * Math.sin(aRad)}" y2="${cy + r * Math.cos(aRad)}" stroke="#e2e8f0" stroke-width="0.5" />`;
  }

  if (bestAngle !== undefined) {
    const optRad = (bestAngle - 180) * Math.PI / 180;
    const optEnd = { x: cx + r * 0.8 * Math.sin(optRad), y: cy + r * 0.8 * Math.cos(optRad) };
    const optStart = { x: cx + r * 0.3 * Math.sin(optRad), y: cy + r * 0.3 * Math.cos(optRad) };
    svg += arrowSvg(optStart, optEnd, '#22c55e', 2);
  }

  svg += `<rect x="${cx - 12}" y="${cy - 12}" width="24" height="24" fill="rgba(34,197,94,0.3)" stroke="#22c55e" stroke-width="1.5" rx="2" />`;

  const conceptNotes = [
    `Orient primary glazing ${bestAngle}° for solar optimization`,
    site.terrain === 'sloping' ? 'Step foundation down-slope for cut/fill balance' : 'Flat site allows orthogonal grid',
    site.adjacentBuildings.length > 0 ? `${site.adjacentBuildings.length} adjacent structures inform massing` : 'Open context — massing driven by programme',
  ];

  const contextValue = site.adjacentBuildings.length > 3 ? 'dense urban' : site.adjacentBuildings.length > 0 ? 'suburban infill' : 'greenfield';

  svg += textSvg(10, 16, 'Concept & Urban Context', 11, '#111');
  svg += textSvg(10, 32, `Context: ${contextValue}`, 9, '#666');
  svg += textSvg(10, 46, `Optimal axis: ${bestAngle}°  Score: ${orientationScore(site.orientation, bestAngle)}/100`, 9, '#666');
  svg += textSvg(10, 60, conceptNotes[0], 9, '#3b82f6');
  svg += textSvg(10, 74, conceptNotes[1], 9, '#666');
  svg += textSvg(10, 88, conceptNotes[2], 9, '#666');
  svg += textSvg(220, 290, 'Green arrow = optimal solar axis · Context analysis shown', 8, '#999');
  svg += `</svg>`;

  return {
    svg,
    data: {
      orientation: site.orientation,
      optimalOrientation: bestAngle,
      densityContext: contextValue,
      urbanGrain: contextValue,
      conceptNotes,
    }
  };
}

function polygonArea(vertices: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

export function generateAllSiteDiagrams(site: SiteContext): SiteDiagram[] {
  const sunWind = generateSunWindPathDiagram(site);
  const accessNoise = generateAccessNoiseDiagram(site);
  const figureGround = generateFigureGroundDiagram(site);
  const naturalFeatures = generateNaturalFeaturesDiagram(site);
  const permeability = generatePermeabilityTransportDiagram(site);
  const concept = generateConceptUrbanContextDiagram(site);

  const diagrams: SiteDiagram[] = [
    { type: 'sun-wind-path', label: 'Sun & Wind Path', svgContent: sunWind.svg, data: sunWind.data },
    { type: 'access-noise', label: 'Access & Noise', svgContent: accessNoise.svg, data: accessNoise.data },
    { type: 'figure-ground', label: 'Figure-Ground', svgContent: figureGround.svg, data: figureGround.data },
    { type: 'natural-features', label: 'Natural Features', svgContent: naturalFeatures.svg, data: naturalFeatures.data },
    { type: 'permeability-transport', label: 'Permeability & Transport', svgContent: permeability.svg, data: permeability.data },
    { type: 'concept-urban-context', label: 'Concept & Urban Context', svgContent: concept.svg, data: concept.data },
  ];

  return diagrams;
}
