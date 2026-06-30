import { MaterialSystem } from '@/domain/ws6-types';

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
  contingency: number;
  fees: number;
  vat: number;
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
    contingency: 0.05, fees: 0.07, vat: 0.15,
  },
  southafrica: {
    id: 'southafrica', region: 'South Africa', currency: 'ZAR', symbol: 'R',
    wall: { concrete: 1550, steel: 2200, timber: 1180 },
    beam: { concrete: 4000, steel: 5650, timber: 2900 },
    column: { concrete: 8200, steel: 11300, timber: 5450 },
    slab_m2: 2000, roof_m2: 1360, opening_each: 4550, object_each: 2180,
    footing_m3: 6900, rebar_tonne: 21800,
    excavation_m3: 320, formwork_m2: 580,
    contingency: 0.05, fees: 0.08, vat: 0.15,
  },
  kenya: {
    id: 'kenya', region: 'Kenya', currency: 'KES', symbol: 'KSh',
    wall: { concrete: 11000, steel: 15500, timber: 8400 },
    beam: { concrete: 28500, steel: 40100, timber: 20700 },
    column: { concrete: 58200, steel: 80200, timber: 38800 },
    slab_m2: 14200, roof_m2: 9700, opening_each: 32300, object_each: 15500,
    footing_m3: 49100, rebar_tonne: 155000,
    excavation_m3: 2300, formwork_m2: 4100,
    contingency: 0.06, fees: 0.07, vat: 0.16,
  },
  global: {
    id: 'global', region: 'Global (USD baseline)', currency: 'USD', symbol: '$',
    wall: { concrete: 95, steel: 135, timber: 72 },
    beam: { concrete: 245, steel: 345, timber: 178 },
    column: { concrete: 500, steel: 690, timber: 334 },
    slab_m2: 122, roof_m2: 83, opening_each: 278, object_each: 134,
    footing_m3: 422, rebar_tonne: 1335,
    excavation_m3: 20, formwork_m2: 35,
    contingency: 0.05, fees: 0.07, vat: 0.10,
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
