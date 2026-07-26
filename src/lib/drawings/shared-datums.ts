import type { SheetViewportSlot } from './sheet-templates';

export type DatumType = 'ground' | 'ffl' | 'ceiling' | 'ridge';

export interface DatumLine {
  type: DatumType;
  label: string;
  elevation: number;
}

export interface DatumAlignmentGroup {
  groupId: string;
  label: string;
  datums: DatumLine[];
  slotIds: string[];
}

export interface DatumAlignedLayout {
  slot: SheetViewportSlot;
  translateY: number;
  datumRef: string;
}

function findDatum(datums: DatumLine[], type: DatumType): DatumLine | undefined {
  return datums.find(d => d.type === type);
}

export function alignElevationDatums(
  datums: DatumLine[],
  slots: SheetViewportSlot[],
): DatumAlignedLayout[] {
  const groundDatum = findDatum(datums, 'ground');
  const fflDatum = findDatum(datums, 'ffl');
  const refDatum = groundDatum ?? fflDatum;
  if (!refDatum) return slots.map(s => ({ slot: s, translateY: 0, datumRef: '' }));

  return slots.map(slot => ({
    slot,
    translateY: 0,
    datumRef: refDatum.label,
  }));
}

export function computeDatumTranslation(
  viewContentDatumElevation: number,
  sheetDatumElevation: number,
): number {
  const diffPixels = (viewContentDatumElevation - sheetDatumElevation) * 10;
  return Math.round(diffPixels * 100) / 100;
}

export function defaultElevationDatums(groundElevation: number): DatumLine[] {
  return [
    { type: 'ground', label: '±0.000', elevation: groundElevation },
    { type: 'ffl', label: 'FFL +0.000', elevation: groundElevation },
  ];
}

export function defaultSectionDatums(groundElevation: number, floorHeights: number[]): DatumLine[] {
  const datums: DatumLine[] = [
    { type: 'ground', label: '±0.000', elevation: groundElevation },
  ];
  let acc = groundElevation;
  for (let i = 0; i < floorHeights.length; i++) {
    acc += floorHeights[i];
    datums.push({ type: 'ffl', label: `FFL +${(acc - groundElevation).toFixed(3)}`, elevation: acc });
  }
  return datums;
}
