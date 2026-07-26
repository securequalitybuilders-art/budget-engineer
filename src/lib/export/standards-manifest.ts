import type { BimModel } from '../../domain/bim';
import type { BOQ } from '../boq/boq-types';

export type StandardsManifest = {
  schema: string;
  ifcMapping: string[];
  cobieMapping: string[];
  boqMapping: string[];
};

export function buildStandardsManifest(bim: BimModel, boq: BOQ): StandardsManifest {
  const ifcClasses = Array.from(new Set(bim.elements.map((e) => e.ifcClass))).sort();
  return {
    schema: 'Dzenhare-Standards-Manifest-0.1',
    ifcMapping: ifcClasses,
    cobieMapping: ['Space.Name', 'Space.Category', 'Component.Name', 'Component.TypeName'],
    boqMapping: Array.from(new Set(boq.items.map((i) => `${i.category}:${i.unit}`))).sort(),
  };
}
