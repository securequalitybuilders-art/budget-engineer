import type { Provider } from '@/domain/marketplace';

const OTD_WEIGHT = 0.4;
const DEFECT_WEIGHT = 0.35;
const LEAD_WEIGHT = 0.25;

export function supplierScore(p: Provider): { score: number; onTime: number; quality: number; lead: number } {
  const onTime = Math.min(100, Math.max(60, 60 + (p.rating - 3) * 10 + p.completedProjects));
  const quality = Math.min(100, Math.max(60, 60 + (p.rating - 3) * 12));
  const lead = Math.min(100, Math.max(60, 70 - (p.rating - 3) * 5));
  const score = Math.round(OTD_WEIGHT * onTime + DEFECT_WEIGHT * quality + LEAD_WEIGHT * lead);
  return { score, onTime, quality, lead };
}
