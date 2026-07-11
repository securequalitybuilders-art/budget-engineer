import { MaterialSystem } from '@/domain/ws6-types';

export interface PlumbingRates {
  coldWaterPipeM: number;
  hotWaterPipeM: number;
  wastePipeM: number;
  soilVentPipeM: number;
  valveEach: number;
  wcPanEach: number;
  basinEach: number;
  showerEach: number;
  sinkEach: number;
  floorDrainEach: number;
  inspectionChamberEach: number;
  geyserEach: number;
  waterTankEach: number;
  tankStandEach: number;
  labourPerPoint: number;
  testingCommission: number;
}

export interface ElectricalRates {
  conduitM: number;
  wiringM: number;
  socketEach: number;
  switchEach: number;
  lightPointEach: number;
  lightFittingEach: number;
  dbBoardEach: number;
  breakerEach: number;
  earthingEach: number;
  specialOutletEach: number;
  labourPerPoint: number;
  testingCommission: number;
}

export interface HvacRates {
  splitUnitEach: number;
  bracketEach: number;
  refrigerantLineM: number;
  condensateDrainM: number;
  extractFanEach: number;
  ductM2: number;
  diffuserEach: number;
  labourPerUnit: number;
  commissioning: number;
}

export interface FinishesRates {
  internalPlasterM2: number;
  externalPlasterM2: number;
  screedM2: number;
  floorTilesM2: number;
  wallTilesM2: number;
  ceilingM2: number;
  corniceM: number;
  primerM2: number;
  internalPaintM2: number;
  externalPaintM2: number;
  waterproofingM2: number;
  skirtingM: number;
  tilingLabourM2: number;
  paintingLabourM2: number;
}

export interface EarthworksRates {
  bulkExcavationM3: number;
  trenchExcavationM3: number;
  compactedFillM3: number;
  hardcoreM3: number;
}

export interface ConcreteRates {
  blindingM3: number;
  stripFootingM3: number;
  raftFoundationM3: number;
  groundSlabM3: number;
  reinforcedColumnM3: number;
  reinforcedBeamM3: number;
  reinforcedSlabM3: number;
  formworkM2: number;
  rebarTonne: number;
  concreteLabourM3: number;
}

export interface SteelRates {
  structuralSteelTonne: number;
  metalDeckingM2: number;
  steelLabourTonne: number;
}

export interface PrelimRates {
  siteEstablishment: number;
  siteCleanup: number;
  security: number;
  temporaryServices: number;
  survey: number;
  testing: number;
  asBuiltDocs: number;
}

export interface RateCard {
  id: string;
  region: string;
  currency: string;
  symbol: string;
  wall: Record<MaterialSystem, number>;
  beam: Record<MaterialSystem, number>;
  column: Record<MaterialSystem, number>;
  slab_m2: number;
  roof_m2: number;
  opening_each: number;
  object_each: number;
  footing_m3: number;
  rebar_tonne: number;
  excavation_m3: number;
  formwork_m2: number;
  finishes_m2: number;
  services_m2: number;
  contingency: number;
  fees: number;
  vat: number;
  plumbing: PlumbingRates;
  electrical: ElectricalRates;
  hvac: HvacRates;
  finishes: FinishesRates;
  earthworks: EarthworksRates;
  concrete: ConcreteRates;
  steel: SteelRates;
  prelims: PrelimRates;
}

export const RATE_CARDS: Record<string, RateCard> = {
  zimbabwe: {
    id: 'zimbabwe', region: 'Zimbabwe (CWICR)', currency: 'USD', symbol: '$',
    wall: { concrete: 85, steel: 120, timber: 65 },
    beam: { concrete: 220, steel: 310, timber: 160 },
    column: { concrete: 450, steel: 620, timber: 300 },
    slab_m2: 110, roof_m2: 75, opening_each: 250, object_each: 120,
    footing_m3: 380, rebar_tonne: 1200,
    excavation_m3: 18, formwork_m2: 32,
    finishes_m2: 35, services_m2: 45,
    contingency: 0.05, fees: 0.07, vat: 0.15,
    plumbing: {
      coldWaterPipeM: 12, hotWaterPipeM: 15, wastePipeM: 18, soilVentPipeM: 22,
      valveEach: 25, wcPanEach: 180, basinEach: 120, showerEach: 250,
      sinkEach: 200, floorDrainEach: 35, inspectionChamberEach: 180,
      geyserEach: 450, waterTankEach: 350, tankStandEach: 120,
      labourPerPoint: 65, testingCommission: 150,
    },
    electrical: {
      conduitM: 8, wiringM: 6, socketEach: 25, switchEach: 18,
      lightPointEach: 35, lightFittingEach: 55, dbBoardEach: 280,
      breakerEach: 35, earthingEach: 120, specialOutletEach: 65,
      labourPerPoint: 45, testingCommission: 180,
    },
    hvac: {
      splitUnitEach: 850, bracketEach: 65, refrigerantLineM: 45,
      condensateDrainM: 18, extractFanEach: 180, ductM2: 55,
      diffuserEach: 65, labourPerUnit: 320, commissioning: 250,
    },
    finishes: {
      internalPlasterM2: 12, externalPlasterM2: 14, screedM2: 10,
      floorTilesM2: 28, wallTilesM2: 32, ceilingM2: 18,
      corniceM: 6, primerM2: 4, internalPaintM2: 8,
      externalPaintM2: 10, waterproofingM2: 15, skirtingM: 8,
      tilingLabourM2: 12, paintingLabourM2: 6,
    },
    earthworks: {
      bulkExcavationM3: 12, trenchExcavationM3: 18, compactedFillM3: 14,
      hardcoreM3: 28,
    },
    concrete: {
      blindingM3: 180, stripFootingM3: 320, raftFoundationM3: 380,
      groundSlabM3: 280, reinforcedColumnM3: 450, reinforcedBeamM3: 380,
      reinforcedSlabM3: 350, formworkM2: 32, rebarTonne: 1200,
      concreteLabourM3: 85,
    },
    steel: {
      structuralSteelTonne: 2800, metalDeckingM2: 45, steelLabourTonne: 650,
    },
    prelims: {
      siteEstablishment: 2500, siteCleanup: 1200, security: 800,
      temporaryServices: 1500, survey: 1200, testing: 1800, asBuiltDocs: 1500,
    },
  },
  southafrica: {
    id: 'southafrica', region: 'South Africa', currency: 'ZAR', symbol: 'R',
    wall: { concrete: 1550, steel: 2200, timber: 1180 },
    beam: { concrete: 4000, steel: 5650, timber: 2900 },
    column: { concrete: 8200, steel: 11300, timber: 5450 },
    slab_m2: 2000, roof_m2: 1360, opening_each: 4550, object_each: 2180,
    footing_m3: 6900, rebar_tonne: 21800,
    excavation_m3: 320, formwork_m2: 580,
    finishes_m2: 660, services_m2: 840,
    contingency: 0.05, fees: 0.08, vat: 0.15,
    plumbing: {
      coldWaterPipeM: 220, hotWaterPipeM: 280, wastePipeM: 330, soilVentPipeM: 400,
      valveEach: 460, wcPanEach: 3300, basinEach: 2200, showerEach: 4600,
      sinkEach: 3700, floorDrainEach: 650, inspectionChamberEach: 3300,
      geyserEach: 8200, waterTankEach: 6400, tankStandEach: 2200,
      labourPerPoint: 1200, testingCommission: 2700,
    },
    electrical: {
      conduitM: 150, wiringM: 110, socketEach: 460, switchEach: 330,
      lightPointEach: 640, lightFittingEach: 1000, dbBoardEach: 5100,
      breakerEach: 640, earthingEach: 2200, specialOutletEach: 1200,
      labourPerPoint: 820, testingCommission: 3300,
    },
    hvac: {
      splitUnitEach: 15500, bracketEach: 1200, refrigerantLineM: 820,
      condensateDrainM: 330, extractFanEach: 3300, ductM2: 1000,
      diffuserEach: 1200, labourPerUnit: 5800, commissioning: 4600,
    },
    finishes: {
      internalPlasterM2: 220, externalPlasterM2: 260, screedM2: 180,
      floorTilesM2: 510, wallTilesM2: 580, ceilingM2: 330,
      corniceM: 110, primerM2: 75, internalPaintM2: 150,
      externalPaintM2: 180, waterproofingM2: 280, skirtingM: 150,
      tilingLabourM2: 220, paintingLabourM2: 110,
    },
    earthworks: {
      bulkExcavationM3: 220, trenchExcavationM3: 330, compactedFillM3: 260,
      hardcoreM3: 510,
    },
    concrete: {
      blindingM3: 3300, stripFootingM3: 5800, raftFoundationM3: 6900,
      groundSlabM3: 5100, reinforcedColumnM3: 8200, reinforcedBeamM3: 6900,
      reinforcedSlabM3: 6400, formworkM2: 580, rebarTonne: 21800,
      concreteLabourM3: 1550,
    },
    steel: {
      structuralSteelTonne: 51000, metalDeckingM2: 820, steelLabourTonne: 11800,
    },
    prelims: {
      siteEstablishment: 46000, siteCleanup: 22000, security: 15000,
      temporaryServices: 27000, survey: 22000, testing: 33000, asBuiltDocs: 27000,
    },
  },
  kenya: {
    id: 'kenya', region: 'Kenya', currency: 'KES', symbol: 'KSh',
    wall: { concrete: 11000, steel: 15500, timber: 8400 },
    beam: { concrete: 28500, steel: 40100, timber: 20700 },
    column: { concrete: 58200, steel: 80200, timber: 38800 },
    slab_m2: 14200, roof_m2: 9700, opening_each: 32300, object_each: 15500,
    footing_m3: 49100, rebar_tonne: 155000,
    excavation_m3: 2300, formwork_m2: 4100,
    finishes_m2: 4800, services_m2: 6100,
    contingency: 0.06, fees: 0.07, vat: 0.16,
    plumbing: {
      coldWaterPipeM: 1600, hotWaterPipeM: 2000, wastePipeM: 2400, soilVentPipeM: 2900,
      valveEach: 3300, wcPanEach: 24000, basinEach: 16000, showerEach: 33000,
      sinkEach: 26000, floorDrainEach: 4600, inspectionChamberEach: 24000,
      geyserEach: 58000, waterTankEach: 46000, tankStandEach: 16000,
      labourPerPoint: 8500, testingCommission: 19000,
    },
    electrical: {
      conduitM: 1000, wiringM: 780, socketEach: 3300, switchEach: 2400,
      lightPointEach: 4600, lightFittingEach: 7200, dbBoardEach: 36000,
      breakerEach: 4600, earthingEach: 16000, specialOutletEach: 8500,
      labourPerPoint: 5800, testingCommission: 24000,
    },
    hvac: {
      splitUnitEach: 110000, bracketEach: 8500, refrigerantLineM: 5800,
      condensateDrainM: 2400, extractFanEach: 24000, ductM2: 7200,
      diffuserEach: 8500, labourPerUnit: 41000, commissioning: 33000,
    },
    finishes: {
      internalPlasterM2: 1550, externalPlasterM2: 1800, screedM2: 1300,
      floorTilesM2: 3600, wallTilesM2: 4100, ceilingM2: 2400,
      corniceM: 780, primerM2: 520, internalPaintM2: 1000,
      externalPaintM2: 1300, waterproofingM2: 2000, skirtingM: 1000,
      tilingLabourM2: 1550, paintingLabourM2: 780,
    },
    earthworks: {
      bulkExcavationM3: 1550, trenchExcavationM3: 2400, compactedFillM3: 1800,
      hardcoreM3: 3600,
    },
    concrete: {
      blindingM3: 23000, stripFootingM3: 41000, raftFoundationM3: 49000,
      groundSlabM3: 36000, reinforcedColumnM3: 58000, reinforcedBeamM3: 49000,
      reinforcedSlabM3: 45000, formworkM2: 4100, rebarTonne: 155000,
      concreteLabourM3: 11000,
    },
    steel: {
      structuralSteelTonne: 360000, metalDeckingM2: 5800, steelLabourTonne: 84000,
    },
    prelims: {
      siteEstablishment: 320000, siteCleanup: 155000, security: 100000,
      temporaryServices: 190000, survey: 155000, testing: 240000, asBuiltDocs: 190000,
    },
  },
  global: {
    id: 'global', region: 'Global (USD baseline)', currency: 'USD', symbol: '$',
    wall: { concrete: 95, steel: 135, timber: 72 },
    beam: { concrete: 245, steel: 345, timber: 178 },
    column: { concrete: 500, steel: 690, timber: 334 },
    slab_m2: 122, roof_m2: 83, opening_each: 278, object_each: 134,
    footing_m3: 422, rebar_tonne: 1335,
    excavation_m3: 20, formwork_m2: 35,
    finishes_m2: 40, services_m2: 50,
    contingency: 0.05, fees: 0.07, vat: 0.10,
    plumbing: {
      coldWaterPipeM: 14, hotWaterPipeM: 17, wastePipeM: 20, soilVentPipeM: 25,
      valveEach: 28, wcPanEach: 200, basinEach: 135, showerEach: 280,
      sinkEach: 220, floorDrainEach: 40, inspectionChamberEach: 200,
      geyserEach: 500, waterTankEach: 390, tankStandEach: 135,
      labourPerPoint: 72, testingCommission: 170,
    },
    electrical: {
      conduitM: 9, wiringM: 7, socketEach: 28, switchEach: 20,
      lightPointEach: 40, lightFittingEach: 60, dbBoardEach: 310,
      breakerEach: 40, earthingEach: 135, specialOutletEach: 72,
      labourPerPoint: 50, testingCommission: 200,
    },
    hvac: {
      splitUnitEach: 950, bracketEach: 72, refrigerantLineM: 50,
      condensateDrainM: 20, extractFanEach: 200, ductM2: 60,
      diffuserEach: 72, labourPerUnit: 360, commissioning: 280,
    },
    finishes: {
      internalPlasterM2: 14, externalPlasterM2: 16, screedM2: 11,
      floorTilesM2: 31, wallTilesM2: 36, ceilingM2: 20,
      corniceM: 7, primerM2: 5, internalPaintM2: 9,
      externalPaintM2: 11, waterproofingM2: 17, skirtingM: 9,
      tilingLabourM2: 14, paintingLabourM2: 7,
    },
    earthworks: {
      bulkExcavationM3: 14, trenchExcavationM3: 20, compactedFillM3: 16,
      hardcoreM3: 31,
    },
    concrete: {
      blindingM3: 200, stripFootingM3: 360, raftFoundationM3: 420,
      groundSlabM3: 310, reinforcedColumnM3: 500, reinforcedBeamM3: 420,
      reinforcedSlabM3: 390, formworkM2: 35, rebarTonne: 1335,
      concreteLabourM3: 95,
    },
    steel: {
      structuralSteelTonne: 3100, metalDeckingM2: 50, steelLabourTonne: 720,
    },
    prelims: {
      siteEstablishment: 2800, siteCleanup: 1350, security: 900,
      temporaryServices: 1700, survey: 1350, testing: 2000, asBuiltDocs: 1700,
    },
  },
};

export const DEFAULT_RATE_CARD = RATE_CARDS.zimbabwe;

export function cloneRateCard(card: RateCard): RateCard {
  return {
    ...card,
    wall: { ...card.wall },
    beam: { ...card.beam },
    column: { ...card.column },
  };
}
