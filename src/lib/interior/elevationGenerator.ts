import type { InteriorProject, WetAreaElevationData, KitchenElevationData, WardrobeElevationData } from '@/domain/interior';

export function generateWetAreaElevation(project: InteriorProject, roomId: string): WetAreaElevationData | null {
  const room = project.rooms.find(r => r.roomId === roomId);
  if (!room) return null;

  const walls = [
    { wallIndex: 0, wallLabel: 'A', fixtures: [] as { fixtureId: string; x: number; y: number; name: string }[], finish: room.finishSpec.wallFinish, waterproofing: true },
    { wallIndex: 1, wallLabel: 'B', fixtures: [] as { fixtureId: string; x: number; y: number; name: string }[], finish: room.finishSpec.wallFinish, waterproofing: true },
    { wallIndex: 2, wallLabel: 'C', fixtures: [] as { fixtureId: string; x: number; y: number; name: string }[], finish: room.finishSpec.wallFinish, waterproofing: false },
    { wallIndex: 3, wallLabel: 'D', fixtures: [] as { fixtureId: string; x: number; y: number; name: string }[], finish: room.finishSpec.wallFinish, waterproofing: false },
  ];

  const roomFixtures = project.fixtures.filter(f => f.roomId === roomId);
  for (const fixture of roomFixtures) {
    const wallIdx = Math.floor(fixture.position.x / (room.dimensions.width || 1)) % 4;
    if (walls[wallIdx]) {
      walls[wallIdx].fixtures.push({
        fixtureId: fixture.fixtureTypeId,
        x: fixture.position.x,
        y: fixture.position.y,
        name: fixture.fixtureTypeId,
      });
    }
  }

  return {
    roomId: room.roomId,
    roomName: room.name,
    walls,
  };
}

export function generateKitchenElevation(project: InteriorProject, roomId: string): KitchenElevationData | null {
  const room = project.rooms.find(r => r.roomId === roomId);
  if (!room) return null;

  const walls = [
    { wallIndex: 0, wallLabel: 'A', units: [] as { x: number; y: number; width: number; height: number; type: string; name: string }[], appliances: [] as { x: number; y: number; width: number; height: number; name: string }[], backsplash: 'tile', countertop: 'granite' },
    { wallIndex: 1, wallLabel: 'B', units: [], appliances: [], backsplash: 'tile', countertop: 'granite' },
  ];

  walls[0].units.push({ x: 0, y: 0, width: 600, height: 900, type: 'base', name: 'Base unit' });
  walls[0].units.push({ x: 600, y: 0, width: 600, height: 900, type: 'base', name: 'Base unit' });
  walls[0].units.push({ x: 0, y: 900, width: 600, height: 600, type: 'wall', name: 'Wall unit' });
  walls[0].appliances.push({ x: 1200, y: 0, width: 600, height: 900, name: 'Cooker' });

  return {
    roomId: room.roomId,
    roomName: room.name,
    walls,
  };
}

export function generateWardrobeElevation(project: InteriorProject, roomId: string): WardrobeElevationData | null {
  const room = project.rooms.find(r => r.roomId === roomId);
  if (!room) return null;

  const wardrobeJoinery = project.joinery.filter(
    j => j.roomId === roomId && project.joineryDefs.find(d => d.id === j.joineryDefId)?.joineryType === 'wardrobe'
  );

  if (wardrobeJoinery.length === 0) return null;

  const wardrobes = wardrobeJoinery.map(j => ({
    width: j.width,
    height: j.height,
    depth: 600,
    doorStyle: 'sliding',
    interiorConfig: 'hanging + shelving',
    material: 'timber',
    finish: 'melamine',
  }));

  return {
    roomId: room.roomId,
    roomName: room.name,
    wardrobes,
  };
}

export function generateElevationSvg(data: WetAreaElevationData | KitchenElevationData | WardrobeElevationData, width = 400, height = 300): string {
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${width}" height="${height}" fill="#fafafa" rx="4" />`;

  const ww = width - 60;
  const wh = height - 80;
  const ox = 30, oy = 40;

  svg += `<rect x="${ox}" y="${oy}" width="${ww}" height="${wh}" fill="white" stroke="#ddd" stroke-width="1" />`;

  if ('walls' in data) {
    const wall = data.walls[0];
    if (wall) {
      if ('fixtures' in wall && Array.isArray(wall.fixtures)) {
        for (const fixture of wall.fixtures) {
          const fx = ox + 20 + (fixture.x % 10) * ((ww - 40) / 10);
          const fy = oy + 30 + (fixture.y % 5) * ((wh - 60) / 5);
          svg += `<rect x="${fx}" y="${fy}" width="24" height="24" fill="#e6e6e6" stroke="#999" stroke-width="1" rx="2" />`;
          svg += `<text x="${fx + 12}" y="${fy + 36}" text-anchor="middle" font-size="7" fill="#666" font-family="sans-serif">${fixture.name.substring(0, 6)}</text>`;
        }
      }
      if ('units' in wall && Array.isArray(wall.units)) {
        for (const unit of wall.units) {
          const ux = ox + (unit.x / 2000) * ww;
          const uy = oy + wh - (unit.height / 2400) * wh;
          const uw = Math.max(10, (unit.width / 2000) * ww);
          const uh = Math.max(10, (unit.height / 2400) * wh);
          svg += `<rect x="${ux}" y="${uy}" width="${uw}" height="${uh}" fill="#e3d5c8" stroke="#8b7355" stroke-width="1" rx="1" />`;
          svg += `<text x="${ux + uw / 2}" y="${uy + uh / 2 + 2}" text-anchor="middle" font-size="6" fill="#555" font-family="sans-serif">${unit.name.substring(0, 8)}</text>`;
        }
      }
      if ('appliances' in wall && Array.isArray(wall.appliances)) {
        for (const app of wall.appliances) {
          const ax = ox + (app.x / 2000) * ww;
          const ay = oy + wh - (app.height / 2400) * wh;
          const aw = Math.max(10, (app.width / 2000) * ww);
          const ah = Math.max(10, (app.height / 2400) * wh);
          svg += `<rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" fill="#d4d4d4" stroke="#666" stroke-width="1" rx="1" />`;
          svg += `<text x="${ax + aw / 2}" y="${ay + ah / 2 + 2}" text-anchor="middle" font-size="6" fill="#333" font-family="sans-serif">${app.name.substring(0, 8)}</text>`;
        }
      }
    }
  }

  if ('wardrobes' in data && Array.isArray(data.wardrobes)) {
    let xOff = ox + 20;
    for (const w of data.wardrobes) {
      const ww2 = Math.max(40, (w.width / 3000) * (width - 80));
      svg += `<rect x="${xOff}" y="${oy + 20}" width="${ww2}" height="${wh - 40}" fill="#f5f0e8" stroke="#8b7355" stroke-width="1.5" rx="2" />`;
      svg += `<line x1="${xOff + ww2 * 0.3}" y1="${oy + 20}" x2="${xOff + ww2 * 0.3}" y2="${oy + wh - 20}" stroke="#8b7355" stroke-width="0.5" />`;
      svg += `<line x1="${xOff + ww2 * 0.7}" y1="${oy + 20}" x2="${xOff + ww2 * 0.7}" y2="${oy + wh - 20}" stroke="#8b7355" stroke-width="0.5" />`;
      svg += `<text x="${xOff + ww2 / 2}" y="${oy + wh - 5}" text-anchor="middle" font-size="7" fill="#666" font-family="sans-serif">${w.doorStyle} ${w.width}×${w.height}</text>`;
      xOff += ww2 + 15;
    }
  }

  svg += `<text x="${width / 2}" y="14" text-anchor="middle" font-size="11" font-weight="bold" fill="#111" font-family="sans-serif">Elevation</text>`;
  svg += `<text x="${width / 2}" y="${height - 5}" text-anchor="middle" font-size="7" fill="#999" font-family="sans-serif">Scale: Not to scale · For reference only</text>`;
  svg += '</svg>';
  return svg;
}
