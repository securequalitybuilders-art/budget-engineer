import type { WindRose, FacadeExposure } from '@/domain/site';

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function computeWindExposure(
  facadeAngle: number,
  windRose: WindRose
): number {
  let exposure = 0;

  for (const sector of windRose.sectors) {
    const angleDiff = Math.abs(facadeAngle - sector.direction);
    const normalizedDiff = Math.min(angleDiff, 360 - angleDiff);
    const facadeFactor = Math.max(0, Math.cos(toRad(normalizedDiff)));
    exposure += sector.speed * facadeFactor * sector.frequency;
  }

  return Math.round(exposure * 100) / 100;
}

export function computeAllFacadeWindExposure(
  windRose: WindRose
): FacadeExposure[] {
  const facadeAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  return facadeAngles.map((angle, i) => ({
    angle,
    label: labels[i],
    annualKwhM2: 0,
    peakSunHours: 0,
    windExposure: computeWindExposure(angle, windRose),
  }));
}

export function computeWindProtection(
  buildingWidth: number,
  buildingHeight: number,
  windRose: WindRose
): number {
  let totalProtection = 0;
  let totalWeight = 0;

  for (const sector of windRose.sectors) {
    const frontalArea = buildingWidth * buildingHeight;
    const pressure = 0.5 * 1.225 * Math.pow(sector.speed, 2) * sector.frequency;
    totalProtection += pressure * frontalArea;
    totalWeight += sector.frequency;
  }

  return Math.round((totalProtection / (totalWeight || 1)) * 100) / 100;
}

export function createDefaultWindRose(): WindRose {
  return {
    sectors: [
      { direction: 0, speed: 4.5, frequency: 0.12 },
      { direction: 30, speed: 4.0, frequency: 0.08 },
      { direction: 60, speed: 3.5, frequency: 0.06 },
      { direction: 90, speed: 5.0, frequency: 0.14 },
      { direction: 120, speed: 4.5, frequency: 0.10 },
      { direction: 150, speed: 3.0, frequency: 0.05 },
      { direction: 180, speed: 5.5, frequency: 0.16 },
      { direction: 210, speed: 6.0, frequency: 0.12 },
      { direction: 240, speed: 4.0, frequency: 0.07 },
      { direction: 270, speed: 3.5, frequency: 0.04 },
      { direction: 300, speed: 4.0, frequency: 0.03 },
      { direction: 330, speed: 4.5, frequency: 0.03 },
    ],
  };
}
