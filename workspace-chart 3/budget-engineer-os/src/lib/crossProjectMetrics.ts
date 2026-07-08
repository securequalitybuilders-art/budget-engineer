import type { ProjectRecord } from '../domain/project';
import type { PortfolioMetric } from './portfolioMetrics';

export type CrossProjectMetric = {
  leftProjectId: string;
  rightProjectId: string;
  leftCount: number;
  rightCount: number;
  leftAverageGrandTotal: number;
  rightAverageGrandTotal: number;
};

export function buildCrossProjectMetric(
  leftProject: ProjectRecord,
  rightProject: ProjectRecord,
  leftPortfolio: PortfolioMetric[],
  rightPortfolio: PortfolioMetric[],
): CrossProjectMetric {
  const avg = (items: PortfolioMetric[]) => items.length ? items.reduce((s, i) => s + i.grandTotal, 0) / items.length : 0;
  return {
    leftProjectId: leftProject.id,
    rightProjectId: rightProject.id,
    leftCount: leftPortfolio.length,
    rightCount: rightPortfolio.length,
    leftAverageGrandTotal: avg(leftPortfolio),
    rightAverageGrandTotal: avg(rightPortfolio),
  };
}
