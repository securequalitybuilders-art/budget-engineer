import {
  BimModel, BOQ, BoqCategory, BoqLineItem, MaterialSystem,
} from '../domain/types';
import {
  RebarSpec, DEFAULT_REBAR_SPEC, rebarTonnage, describeSpec,
} from '../lib/rebarSpec';
import { RateCard, DEFAULT_RATE_CARD } from '../lib/rateCard';
import { FootingSchedule, footingRebarTonnage, footingExcavationFormwork } from '../lib/footingSizer';

const round2 = (n: number) => Math.round(n * 100) / 100;

function add(map: Map<string, BoqLineItem>, key: string, item: BoqLineItem) {
  const existing = map.get(key);
  if (existing) {
    existing.quantity = round2(existing.quantity + item.quantity);
    existing.total = round2(existing.quantity * existing.rate);
  } else {
    map.set(key, item);
  }
}

export function generateBoqFromBim(
  bim: BimModel,
  rateCard: RateCard = DEFAULT_RATE_CARD,
  rebarSpec: RebarSpec = DEFAULT_REBAR_SPEC,
  footingSchedule?: FootingSchedule,
): BOQ {
  const map = new Map<string, BoqLineItem>();
  const mat = (m?: MaterialSystem): MaterialSystem => m ?? 'concrete';
  const label = (m: MaterialSystem) => m.charAt(0).toUpperCase() + m.slice(1);

  let totalSlabArea = 0;

  for (const el of bim.elements) {
    switch (el.type) {
      case 'wall': {
        const m = mat(el.metadata.material);
        const area = el.area ?? 0;
        const rate = rateCard.wall[m];
        add(map, `wall-${m}`, {
          id: `boq-wall-${m}`, category: 'Walls',
          description: `${label(m)} wall construction`, unit: 'm²',
          quantity: round2(area), rate, total: round2(area * rate),
        });
        break;
      }
      case 'beam': {
        const m = mat(el.metadata.material);
        const len = el.length ?? 0;
        const rate = rateCard.beam[m];
        add(map, `beam-${m}`, {
          id: `boq-beam-${m}`, category: 'Beams',
          description: `${label(m)} structural beam`, unit: 'm',
          quantity: round2(len), rate, total: round2(len * rate),
        });
        break;
      }
      case 'slab': {
        const area = el.area ?? 0;
        totalSlabArea += area;
        add(map, 'slab', {
          id: 'boq-slab', category: 'Slabs',
          description: 'Reinforced concrete floor slab', unit: 'm²',
          quantity: round2(area), rate: rateCard.slab_m2, total: round2(area * rateCard.slab_m2),
        });
        break;
      }
      case 'roof': {
        const area = el.area ?? 0;
        add(map, 'roof', {
          id: 'boq-roof', category: 'Roof',
          description: 'Roof construction & covering', unit: 'm²',
          quantity: round2(area), rate: rateCard.roof_m2, total: round2(area * rateCard.roof_m2),
        });
        break;
      }
      case 'opening': {
        add(map, 'opening', {
          id: 'boq-opening', category: 'Openings',
          description: 'Door / window assembly', unit: 'each',
          quantity: 1, rate: rateCard.opening_each, total: rateCard.opening_each,
        });
        break;
      }
      case 'block': {
        const cat = el.metadata.category as BoqCategory;
        if (el.metadata.ifcClass === 'IfcColumn' || el.cadId.startsWith('col-')) {
          const m = mat(el.metadata.material);
          const rate = rateCard.column[m];
          add(map, `column-${m}`, {
            id: `boq-column-${m}`, category: 'Columns',
            description: `${label(m)} column & pad`, unit: 'each',
            quantity: 1, rate, total: rate,
          });
        } else if (el.metadata.ifcClass === 'IfcFooting' || el.cadId.startsWith('foot-')) {
          const vol = el.width * el.depth * 0.4; // 0.4m thick pad
          add(map, 'footing', {
            id: 'boq-footing', category: 'Footings',
            description: 'RC pad footing (30 MPa)', unit: 'm³',
            quantity: round2(vol), rate: rateCard.footing_m3, total: round2(vol * rateCard.footing_m3),
          });
        } else if (cat !== 'Beams' && cat !== 'Columns' && cat !== 'Footings') {
          add(map, 'object', {
            id: 'boq-object', category: 'Objects',
            description: 'Fixtures & fittings', unit: 'each',
            quantity: 1, rate: rateCard.object_each, total: rateCard.object_each,
          });
        }
        break;
      }
      default:
        break;
    }
  }

  // sized pad footings (Stage 45 → Stage 46): use the load/soil-sized schedule
  // as the source of truth for foundation concrete when provided.
  if (footingSchedule && footingSchedule.totalVolumeM3 > 0) {
    const vol = footingSchedule.totalVolumeM3;
    const f0 = footingSchedule.footings[0];
    const desc = f0
      ? `RC pad footings ${f0.sideM}×${f0.sideM}×${f0.thicknessM} m on ${footingSchedule.soil.label} (${footingSchedule.soil.bearingKpa} kPa)`
      : 'RC pad footings (30 MPa)';
    // overwrite any per-block footing estimate with the sized total
    map.set('footing', {
      id: 'boq-footing', category: 'Footings',
      description: desc, unit: 'm³',
      quantity: round2(vol), rate: rateCard.footing_m3, total: round2(vol * rateCard.footing_m3),
    });

    // footing reinforcement (Stage 49): two-way bottom mat per pad, parametric spec
    const footRebar = footingRebarTonnage(footingSchedule, rebarSpec);
    if (footRebar > 0) {
      map.set('footing-rebar', {
        id: 'boq-footing-rebar', category: 'Reinforcement',
        description: `Footing reinforcement ${describeSpec(rebarSpec)} (bottom mat)`, unit: 'tonne',
        quantity: round2(footRebar), rate: rateCard.rebar_tonne, total: round2(footRebar * rateCard.rebar_tonne),
      });
    }

    // excavation & formwork (Stage 52)
    const { excavationM3, formworkM2 } = footingExcavationFormwork(footingSchedule);
    if (excavationM3 > 0) {
      map.set('excavation', {
        id: 'boq-excavation', category: 'Excavation',
        description: 'Bulk & pit excavation for foundations (incl. working space)', unit: 'm³',
        quantity: round2(excavationM3), rate: rateCard.excavation_m3, total: round2(excavationM3 * rateCard.excavation_m3),
      });
    }
    if (formworkM2 > 0) {
      map.set('formwork', {
        id: 'boq-formwork', category: 'Formwork',
        description: 'Formwork to footing sides', unit: 'm²',
        quantity: round2(formworkM2), rate: rateCard.formwork_m2, total: round2(formworkM2 * rateCard.formwork_m2),
      });
    }
  }

  // slab reinforcement takeoff (Stage 39, parametric via Stage 42 spec override)
  if (totalSlabArea > 0) {
    const tonnes = rebarTonnage(totalSlabArea, rebarSpec);
    add(map, 'rebar', {
      id: 'boq-rebar', category: 'Reinforcement',
      description: `Slab reinforcement ${describeSpec(rebarSpec)}`, unit: 'tonne',
      quantity: round2(tonnes), rate: rateCard.rebar_tonne, total: round2(tonnes * rateCard.rebar_tonne),
    });
  }

  const items = Array.from(map.values()).sort((a, b) => a.category.localeCompare(b.category));
  const subtotal = round2(items.reduce((s, i) => s + i.total, 0));
  const contingency = round2(subtotal * rateCard.contingency);
  const fees = round2(subtotal * rateCard.fees);
  const vat = round2((subtotal + contingency + fees) * rateCard.vat);
  const grandTotal = round2(subtotal + contingency + fees + vat);

  return {
    id: `boq-${bim.projectId}`,
    projectId: bim.projectId,
    currency: rateCard.currency,
    items,
    summary: { subtotal, contingency, fees, vat, grandTotal },
  };
}
