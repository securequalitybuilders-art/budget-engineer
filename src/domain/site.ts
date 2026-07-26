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

export interface ContourLine {
  elevation: number;
  vertices: Point2D[];
}

export interface TopographyData {
  contours: ContourLine[];
  slopeDeg: number;
  aspect: number;
  highPoint: number;
  lowPoint: number;
}

export interface AccessEdge {
  type: 'vehicle' | 'pedestrian' | 'service' | 'emergency';
  location: Point2D[];
  width: number;
}

export interface NoiseSource {
  type: 'road' | 'rail' | 'industrial' | 'commercial';
  location: Point2D[];
  levelDba: number;
}

export interface SiteContext {
  projectId: string;
  lat: number;
  lng: number;
  orientation: number;
  terrain: 'flat' | 'sloping' | 'steep';
  adjacentBuildings: AdjacentBuilding[];
  windRose: WindRose;
  topography?: TopographyData;
  accessEdges?: AccessEdge[];
  noiseSources?: NoiseSource[];
  plotBoundary?: Point2D[];
  setbacks?: { front: number; rear: number; sides: [number, number] };
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

export interface SunWindPathData {
  sunPositions: SunPosition[];
  windRose: WindRose;
  optimalOrientation: number;
  orientationScore: number;
}

export interface AccessNoiseData {
  accessEdges: AccessEdge[];
  noiseSources: NoiseSource[];
  recommendedBuffers: { source: string; distanceM: number }[];
}

export interface FigureGroundData {
  plotBoundary: Point2D[];
  buildingFootprint: Point2D[];
  adjacentFootprints: { vertices: Point2D[]; name: string }[];
  coveragePct: number;
  far: number;
}

export interface NaturalFeaturesData {
  contours: ContourLine[];
  highPoint: number;
  lowPoint: number;
  slopeDeg: number;
  aspect: number;
  vegetationZones?: { type: string; area: Point2D[] }[];
}

export interface PermeabilityTransportData {
  accessEdges: AccessEdge[];
  permeableAreas: Point2D[][];
  impermeablePct: number;
  transportNodes: { type: string; location: Point2D }[];
}

export interface ConceptUrbanContextData {
  orientation: number;
  optimalOrientation: number;
  densityContext: string;
  urbanGrain: string;
  conceptNotes: string[];
}

export type DiagramType =
  | 'sun-wind-path'
  | 'access-noise'
  | 'figure-ground'
  | 'natural-features'
  | 'permeability-transport'
  | 'concept-urban-context';

export interface SiteDiagram {
  type: DiagramType;
  label: string;
  svgContent: string;
  data: SunWindPathData | AccessNoiseData | FigureGroundData | NaturalFeaturesData | PermeabilityTransportData | ConceptUrbanContextData;
}
