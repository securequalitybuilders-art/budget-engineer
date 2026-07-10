export interface Point2D {
  x: number;
  y: number;
}

export interface AdjacentBuilding {
  id: string;
  vertices: Point2D[];
  height: number;
  name: string;
}

export interface WindRoseSector {
  direction: number;
  speed: number;
  frequency: number;
}

export interface WindRose {
  sectors: WindRoseSector[];
}

export interface SiteContext {
  projectId: string;
  lat: number;
  lng: number;
  orientation: number;
  terrain: 'flat' | 'sloping' | 'steep';
  adjacentBuildings: AdjacentBuilding[];
  windRose: WindRose;
  createdAt: string;
  updatedAt: string;
}

export interface SunPosition {
  azimuth: number;
  elevation: number;
  time: Date;
}

export interface ShadowPolygon {
  vertices: Point2D[];
  color: string;
  opacity: number;
  time: Date;
}

export interface FacadeExposure {
  angle: number;
  label: string;
  annualKwhM2: number;
  peakSunHours: number;
  windExposure?: number;
}

export interface SiteAnalysisResult {
  orientation: number;
  optimalOrientation: number;
  solarExposure: FacadeExposure[];
  windExposure: FacadeExposure[];
  totalAnnualKwh: number;
  totalPeakSunHours: number;
}
