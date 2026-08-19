/**
 * P3 Digital Twin engine.
 * Geo-tagged project timeline snapshots with verification reports
 * (ai-vision / drone / manual) and milestone progress tracking.
 */
import type { DigitalTwinTimelineEntry, VerificationReport } from '@/domain/sitehawk';

export interface TwinSnapshotInput {
  projectId: string;
  milestoneId?: string | null;
  geoLat: number;
  geoLng: number;
  note: string;
  progressPct: number;
  now?: Date;
}

/** Geo-tag a timeline snapshot (6-decimal clamp, rejects non-finite coords). */
export function createTwinSnapshot(input: TwinSnapshotInput): DigitalTwinTimelineEntry | null {
  if (!Number.isFinite(input.geoLat) || !Number.isFinite(input.geoLng)) return null;
  const now = input.now ?? new Date();
  const clamp = (v: number) => Math.round(v * 1e6) / 1e6;
  return {
    id: `dt-${input.projectId}-${now.getTime()}`,
    projectId: input.projectId,
    milestoneId: input.milestoneId ?? null,
    capturedAt: now.toISOString(),
    geoLat: clamp(input.geoLat),
    geoLng: clamp(input.geoLng),
    note: input.note,
    progressPct: Math.min(100, Math.max(0, input.progressPct)),
    status: 'pending',
  };
}

export interface VerifyInput {
  projectId: string;
  milestoneId?: string | null;
  method: VerificationReport['method'];
  verdict: VerificationReport['verdict'];
  confidence: number;
  details: string;
  now?: Date;
}

/** Verification report; a verified snapshot drives the escrow gate (P4). */
export function createVerificationReport(input: VerifyInput): VerificationReport {
  const now = input.now ?? new Date();
  return {
    id: `vr-${input.projectId}-${now.getTime()}`,
    projectId: input.projectId,
    milestoneId: input.milestoneId ?? null,
    method: input.method,
    verdict: input.verdict,
    confidence: Math.min(100, Math.max(0, input.confidence)),
    details: input.details,
    createdAt: now.toISOString(),
  };
}

export interface TwinState {
  snapshots: DigitalTwinTimelineEntry[];
  reports: VerificationReport[];
}

export function twinSummary(state: TwinState): {
  snapshots: number;
  verified: number;
  avgConfidence: number;
  latestProgressPct: number;
} {
  const verified = state.reports.filter((r) => r.verdict === 'pass').length;
  const avgConfidence = state.reports.length
    ? Math.round(state.reports.reduce((s, r) => s + r.confidence, 0) / state.reports.length)
    : 0;
  const latestProgressPct = state.snapshots.length
    ? state.snapshots[state.snapshots.length - 1].progressPct
    : 0;
  return { snapshots: state.snapshots.length, verified, avgConfidence, latestProgressPct };
}

/** Progress progression for the 3 canonical milestones (35/40/25 split). */
export function milestoneProgressFor(split: Array<{ name: string; pct: number }>, state: TwinState): Array<{ name: string; pct: number; progressPct: number; verified: boolean }> {
  return split.map((m) => {
    const snapshots = state.snapshots.filter((s) => s.milestoneId !== null);
    const progressPct = snapshots.length ? snapshots[snapshots.length - 1].progressPct : 0;
    return { name: m.name, pct: m.pct, progressPct, verified: state.reports.some((r) => r.verdict === 'pass') };
  });
}