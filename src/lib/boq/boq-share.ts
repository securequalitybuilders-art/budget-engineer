export type CategoryShareRow = {
  category: string;
  leftTotal: number;
  rightTotal: number;
  leftShare: number;
  rightShare: number;
  shareDelta: number;
};

export type BoqShareComparison = {
  rows: CategoryShareRow[];
  leftGrandTotal: number;
  rightGrandTotal: number;
};

function sum(totals: Record<string, number>): number {
  return Object.values(totals).reduce((acc, v) => acc + v, 0);
}

export function compareBoqShares(left: Record<string, number>, right: Record<string, number>): BoqShareComparison {
  const leftGrandTotal = sum(left);
  const rightGrandTotal = sum(right);
  const categories = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort();

  const rows: CategoryShareRow[] = categories.map((category) => {
    const leftTotal = left[category] ?? 0;
    const rightTotal = right[category] ?? 0;
    const leftShare = leftGrandTotal > 0 ? (leftTotal / leftGrandTotal) * 100 : 0;
    const rightShare = rightGrandTotal > 0 ? (rightTotal / rightGrandTotal) * 100 : 0;
    return { category, leftTotal, rightTotal, leftShare, rightShare, shareDelta: rightShare - leftShare };
  });

  rows.sort((a, b) => Math.abs(b.shareDelta) - Math.abs(a.shareDelta));
  return { rows, leftGrandTotal, rightGrandTotal };
}
