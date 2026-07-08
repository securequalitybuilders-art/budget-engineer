import { BimModel } from '../domain/bim';
import { BOQ, BOQLineItem } from '../domain/boq';

export function generateBoqFromBim(bim: BimModel, docName: string): BOQ {
  const rates = { wall_m2: 85, slab_m2: 110, roof_m2: 75, opening_each: 250, object_each: 120 };
  const items: BOQLineItem[] = [];

  const walls = bim.elements.filter(e => e.type === 'wall');
  const totalWallArea = walls.reduce((acc, e) => acc + e.area, 0);
  items.push({
    id: 'boq-item-walls',
    category: 'Walls',
    description: 'Load-bearing & Partition Wall Construction',
    quantity: parseFloat(totalWallArea.toFixed(2)),
    unit: 'm2',
    unitRate: rates.wall_m2,
    total: parseFloat((totalWallArea * rates.wall_m2).toFixed(2)),
    linkedBimIds: walls.map(w => w.id)
  });

  const slabs = bim.elements.filter(e => e.type === 'slab');
  const totalSlabArea = slabs.reduce((acc, e) => acc + e.area, 0);
  items.push({
    id: 'boq-item-slabs',
    category: 'Slabs',
    description: 'Reinforced Concrete Floor Slabs & Foundations',
    quantity: parseFloat(totalSlabArea.toFixed(2)),
    unit: 'm2',
    unitRate: rates.slab_m2,
    total: parseFloat((totalSlabArea * rates.slab_m2).toFixed(2)),
    linkedBimIds: slabs.map(s => s.id)
  });

  const roofs = bim.elements.filter(e => e.type === 'roof');
  const totalRoofArea = roofs.reduce((acc, e) => acc + e.area, 0);
  items.push({
    id: 'boq-item-roof',
    category: 'Roof',
    description: 'Flat Roof Waterproofing & Thermal Insulation',
    quantity: parseFloat(totalRoofArea.toFixed(2)),
    unit: 'm2',
    unitRate: rates.roof_m2,
    total: parseFloat((totalRoofArea * rates.roof_m2).toFixed(2)),
    linkedBimIds: roofs.map(r => r.id)
  });

  // Stage 28: Parametric BIM Opening Families with Dynamic Cost Takeoff Markups
  const openings = bim.elements.filter(e => e.type === 'opening');
  let totalOpeningsCost = 0;
  for (const o of openings) {
    const props = o.metadata?.properties || {};
    let rate = o.metadata?.ifcClass === 'IfcWindow' ? 220 : 250;
    if (props.glazingRatio && parseFloat(props.glazingRatio) > 0.4) rate += 120;
    if (props.hardwareStyle === 'panic_bar') rate += 180;
    if (props.hardwareStyle === 'lever_modern') rate += 45;
    if (props.glazingType === 'Acoustic Laminated') rate += 140;
    if (props.glazingType === 'Tinted Low-E') rate += 80;
    if (props.mullionCount && parseInt(props.mullionCount) > 1) rate += 60;
    totalOpeningsCost += rate;
  }
  const avgOpeningRate = openings.length > 0 ? totalOpeningsCost / openings.length : rates.opening_each;

  items.push({
    id: 'boq-item-openings',
    category: 'Openings',
    description: 'Parametric Architectural Doors & Glazed Windows',
    quantity: openings.length,
    unit: 'each',
    unitRate: parseFloat(avgOpeningRate.toFixed(2)),
    total: parseFloat(totalOpeningsCost.toFixed(2)),
    linkedBimIds: openings.map(o => o.id)
  });

  const regBlocks = bim.elements.filter(e => e.type === 'block' && e.metadata?.ifcClass !== 'IfcColumnStandardCase');
  items.push({
    id: 'boq-item-objects',
    category: 'Objects',
    description: 'Fixtures, Furniture & MEP Components',
    quantity: regBlocks.length,
    unit: 'each',
    unitRate: rates.object_each,
    total: regBlocks.length * rates.object_each,
    linkedBimIds: regBlocks.map(b => b.id)
  });

  // Stage 30: Automated Structural Columns & Pad Footings
  const structCols = bim.elements.filter(e => e.type === 'block' && e.metadata?.ifcClass === 'IfcColumnStandardCase');
  if (structCols.length > 0) {
    items.push({
      id: 'boq-item-columns',
      category: 'Slabs',
      description: 'Reinforced Concrete Structural Columns & Pad Footings',
      quantity: structCols.length,
      unit: 'each',
      unitRate: 450.00,
      total: structCols.length * 450.00,
      linkedBimIds: structCols.map(c => c.id)
    });
  }

  // Stage 33: Automated MEP Services Points Takeoff
  const mepZones = bim.elements.filter(e => e.type === 'roomZone' && e.metadata?.properties?.mepEnabled === true);
  if (mepZones.length > 0) {
    let ep = 0, lp = 0, pp = 0;
    for (const z of mepZones) {
      const prog = (z.program || '').toLowerCase();
      const area = z.area || 10;
      if (prog.includes('kitchen')) { ep += 8; lp += 4; pp += 3; }
      else if (prog.includes('bath') || prog.includes('wc')) { ep += 2; lp += 2; pp += 5; }
      else if (prog.includes('bed')) { ep += 4; lp += Math.ceil(area / 8); }
      else { ep += 6; lp += Math.ceil(area / 6); }
    }
    const totElec = ep + lp;
    if (totElec > 0) {
      items.push({
        id: 'boq-item-mep-elec',
        category: 'Objects',
        description: 'MEP Electrical Outlets, Switches & LED Lighting Distribution',
        quantity: totElec,
        unit: 'each',
        unitRate: 65.00,
        total: totElec * 65.00,
        linkedBimIds: mepZones.map(z => z.id)
      });
    }
    if (pp > 0) {
      items.push({
        id: 'boq-item-mep-plumb',
        category: 'Objects',
        description: 'MEP Plumbing Hot/Cold Water Supply & Drainage Points',
        quantity: pp,
        unit: 'each',
        unitRate: 180.00,
        total: pp * 180.00,
        linkedBimIds: mepZones.map(z => z.id)
      });
    }
  }

  const subtotal = parseFloat(items.reduce((acc, i) => acc + i.total, 0).toFixed(2));
  const contingency = parseFloat((subtotal * 0.05).toFixed(2));
  const professionalFees = parseFloat((subtotal * 0.07).toFixed(2));
  const vat = parseFloat(((subtotal + contingency + professionalFees) * 0.15).toFixed(2));
  const grandTotal = parseFloat((subtotal + contingency + professionalFees + vat).toFixed(2));

  return {
    id: `boq-${bim.projectId}`,
    projectId: bim.projectId,
    currency: 'USD',
    items,
    summary: { subtotal, contingency, professionalFees, vat, grandTotal }
  };
}
