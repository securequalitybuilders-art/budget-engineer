import type {
  PilotObservation,
  PilotSeverity,
  PilotStatus,
  PilotDomain,
} from './pilotFeedbackModel';
import { SEVERITY_ORDER } from './pilotFeedbackModel';

export function isUnresolved(status: PilotStatus): boolean {
  return status === 'new' || status === 'under-review' || status === 'action-planned';
}

export function isOpen(status: PilotStatus): boolean {
  return isUnresolved(status) || status === 'deferred';
}

export function isResolved(status: PilotStatus): boolean {
  return status === 'resolved' || status === 'accepted-limitation';
}

export function isBlocker(severity: PilotSeverity): boolean {
  return severity === 'blocker';
}

export function isBlocking(obs: PilotObservation): boolean {
  return obs.severity === 'blocker' && isUnresolved(obs.status);
}

export function filterBySeverity(
  observations: PilotObservation[],
  severity: PilotSeverity | 'all'
): PilotObservation[] {
  if (severity === 'all') return observations;
  return observations.filter(o => o.severity === severity);
}

export function filterByDomain(
  observations: PilotObservation[],
  domain: PilotDomain | 'all'
): PilotObservation[] {
  if (domain === 'all') return observations;
  return observations.filter(o => o.domain === domain);
}

export function filterByStatus(
  observations: PilotObservation[],
  status: PilotStatus | 'all'
): PilotObservation[] {
  if (status === 'all') return observations;
  return observations.filter(o => o.status === status);
}

export function sortBySeverity(observations: PilotObservation[]): PilotObservation[] {
  return [...observations].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );
}

export function getUnresolvedBlockers(observations: PilotObservation[]): PilotObservation[] {
  return observations.filter(isBlocking);
}

export function countBySeverity(observations: PilotObservation[]): Record<PilotSeverity, number> {
  const counts: Record<PilotSeverity, number> = {
    blocker: 0, major: 0, minor: 0, observation: 0, enhancement: 0,
  };
  for (const o of observations) {
    counts[o.severity]++;
  }
  return counts;
}

export function countByDomain(observations: PilotObservation[]): Record<PilotDomain, number> {
  const domains: PilotDomain[] = [
    'geometry-generation', 'drawings-package', 'boq-procurement',
    'delivery-lifecycle', 'validation-reporting', 'deployment-evaluation-ux',
  ];
  const counts: Record<string, number> = {};
  for (const d of domains) counts[d] = 0;
  for (const o of observations) {
    counts[o.domain]++;
  }
  return counts as Record<PilotDomain, number>;
}

export function countByStatus(observations: PilotObservation[]): Record<PilotStatus, number> {
  const statuses: PilotStatus[] = [
    'new', 'under-review', 'action-planned', 'resolved', 'accepted-limitation', 'deferred',
  ];
  const counts: Record<string, number> = {};
  for (const s of statuses) counts[s] = 0;
  for (const o of observations) {
    counts[o.status]++;
  }
  return counts as Record<PilotStatus, number>;
}

export function getDomainConcentration(
  observations: PilotObservation[]
): { domain: PilotDomain; count: number; pct: number }[] {
  const total = observations.length;
  if (total === 0) return [];
  const byDomain = countByDomain(observations);
  return (Object.entries(byDomain) as [PilotDomain, number][])
    .map(([domain, count]) => ({ domain, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

export function getOpenVsResolvedCount(
  observations: PilotObservation[]
): { open: number; resolved: number; total: number } {
  const total = observations.length;
  const resolved = observations.filter(o => isResolved(o.status)).length;
  return { open: total - resolved, resolved, total };
}
