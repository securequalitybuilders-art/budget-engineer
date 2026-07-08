import { BOQ } from '../domain/boq';

export interface BoqShareShift {
  category: string;
  leftShare: number; // percentage 0-100
  rightShare: number; // percentage 0-100
  shift: number; // rightShare - leftShare
}

export function compareBoqShares(leftBoq?: BOQ, rightBoq?: BOQ): BoqShareShift[] {
  const cats = ['Walls', 'Slabs', 'Roof', 'Openings', 'Objects'];
  const lTotal = leftBoq?.summary?.subtotal || 1;
  const rTotal = rightBoq?.summary?.subtotal || 1;

  const shifts: BoqShareShift[] = cats.map(cat => {
    const lSum = leftBoq?.items.filter(i => i.category === cat).reduce((acc, i) => acc + i.total, 0) || 0;
    const rSum = rightBoq?.items.filter(i => i.category === cat).reduce((acc, i) => acc + i.total, 0) || 0;
    const leftShare = (lSum / lTotal) * 100;
    const rightShare = (rSum / rTotal) * 100;
    return {
      category: cat,
      leftShare,
      rightShare,
      shift: rightShare - leftShare
    };
  });

  return shifts.sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift));
}
