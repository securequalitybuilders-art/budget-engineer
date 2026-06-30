import type { PortfolioMetric } from './portfolio-metrics';

export type CrossProjectMetric = {
  leftProjectId: string;
  rightProjectId: string;
  leftCount: number;
  rightCount: number;
  leftAverageGrandTotal: number;
  rightAverageGrandTotal: number;
};

export function buildCrossProjectMetric(
  leftProjectId: string,
  rightProjectId: string,
  leftPortfolio: PortfolioMetric[],
  rightPortfolio: PortfolioMetric[],
): CrossProjectMetric {
  const avg = (items: PortfolioMetric[]) => items.length ? items.reduce((s, i) => s + i.grandTotal, 0) / items.length : 0;
  return {
    leftProjectId,
    rightProjectId,
    leftCount: leftPortfolio.length,
    rightCount: rightPortfolio.length,
    leftAverageGrandTotal: avg(leftPortfolio),
    rightAverageGrandTotal: avg(rightPortfolio),
  };
}
