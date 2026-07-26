import type { SunPosition } from '@/domain/site';

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function julianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function solarDeclination(jd: number): number {
  const n = jd - 2451545.0;
  const meanObliquity = 23.439291 - 0.0130042 * (n / 36525);
  const eclipticLongitude = (280.46 + 0.9856474 * n) % 360;
  const anomaly = (357.528 + 0.9856003 * n) % 360;
  const equationOfCenter = 1.915 * Math.sin(toRad(anomaly)) + 0.02 * Math.sin(toRad(2 * anomaly));
  const eclipticLongitudeSun = (eclipticLongitude + equationOfCenter) % 360;
  const sinDeclination = Math.sin(toRad(meanObliquity)) * Math.sin(toRad(eclipticLongitudeSun));
  return toDeg(Math.asin(sinDeclination));
}

function equationOfTime(jd: number): number {
  const n = jd - 2451545.0;
  const anomaly = (357.528 + 0.9856003 * n) % 360;
  const center = 1.915 * Math.sin(toRad(anomaly)) + 0.02 * Math.sin(toRad(2 * anomaly));
  const eclipticLongitude = (280.46 + 0.9856474 * n + center) % 360;
  const ra = toDeg(Math.atan2(Math.cos(toRad(23.439291)) * Math.sin(toRad(eclipticLongitude)), Math.cos(toRad(eclipticLongitude))));
  const lm = (280.46 + 0.9856474 * n) % 360;
  return (lm - ra) / 15;
}

export function computeSunPosition(
  lat: number,
  lng: number,
  date: Date,
  hour: number
): SunPosition {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const jd = julianDay(year, month, day);
  const eot = equationOfTime(jd);
  const declination = solarDeclination(jd);

  const solarHour = hour + lng / 15 + eot;
  const hourAngle = 15 * (solarHour - 12);

  const latRad = toRad(lat);
  const decRad = toRad(declination);
  const haRad = toRad(hourAngle);

  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const elevation = toDeg(Math.asin(Math.max(-1, Math.min(1, sinAlt))));

  const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * Math.cos(toRad(elevation)));
  let azimuth = toDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  if (hourAngle > 0) azimuth = 360 - azimuth;

  const time = new Date(date);
  time.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);

  return { azimuth, elevation, time };
}

export function computeSunPath(
  lat: number,
  lng: number,
  date: Date
): SunPosition[] {
  const positions: SunPosition[] = [];
  for (let h = 4; h <= 20; h += 0.5) {
    const pos = computeSunPosition(lat, lng, date, h);
    if (pos.elevation > 0) {
      positions.push(pos);
    }
  }
  return positions;
}

export function computeAnnualExposure(
  lat: number,
  facadeAngle: number
): { annualKwhM2: number; peakSunHours: number } {
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const year = 2026;

  let totalKwh = 0;
  let peakHours = 0;

  for (let m = 0; m < 12; m++) {
    for (let d = 1; d <= monthDays[m]; d++) {
      const date = new Date(year, m, d);
      const path = computeSunPath(lat, 0, date);

      for (const pos of path) {
        const angleDiff = Math.abs(pos.azimuth - facadeAngle);
        const facadeFactor = Math.max(0, Math.cos(toRad(Math.min(angleDiff, 360 - angleDiff))));
        const elevationFactor = pos.elevation / 90;
        const irradiance = 1000 * facadeFactor * elevationFactor;
        const hourlyKwh = (irradiance * 0.5) / 1000;
        totalKwh += hourlyKwh;

        if (pos.elevation > 15 && facadeFactor > 0.5) {
          peakHours += 0.5;
        }
      }
    }
  }

  return {
    annualKwhM2: Math.round(totalKwh * 100) / 100,
    peakSunHours: Math.round(peakHours * 100) / 100,
  };
}
