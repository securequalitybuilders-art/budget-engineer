// Computes percentage-share analytics for BOQ category totals so cross-project
// comparison goes beyond absolute totals/deltas and exposes how each project's
// cost is *distributed* across categories (composition), independent of scale.

export type CategoryShareRow = {
  category: string;
  leftTotal: number;
  rightTotal: number;
  leftShare: number; // 0-100 % of left project total
  rightShare: number; // 0-100 % of right project total
  shareDelta: number; // rightShare - leftShare (percentage points)
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
    return {
      category,
      leftTotal,
      rightTotal,
      leftShare,
      rightShare,
      shareDelta: rightShare - leftShare,
    };
  });

  // Largest absolute composition shift first — most decision-relevant.
  rows.sort((a, b) => Math.abs(b.shareDelta) - Math.abs(a.shareDelta));

  return { rows, leftGrandTotal, rightGrandTotal };
}
