import { db } from '@/db/db';
import type { Project } from '@/types';
import type { Milestone } from '@/domain/milestone';
import type { EscrowAgreement } from '@/domain/marketplace';
import type { ApprovalRequest } from '@/components/portal/ApprovalInbox';
import { makeReleaseDecision } from '@/engine/milestone/milestoneEngine';
import { ApiError, type ApiRequest, type ApiResponse } from './types';

/**
 * Transport adapter contract for the local-first API facade.
 *
 * The default `LocalIndexedDbTransport` serves every request from IndexedDB.
 * A real HTTP backend can be dropped in later by swapping the transport for
 * `HttpTransport` (or any other `ApiTransport` implementation) without
 * changing consumers — the REST shape stays identical.
 */
export interface ApiTransport {
  request<T>(req: ApiRequest): Promise<ApiResponse<T>>;
}

const toISO = () => new Date().toISOString();

function newId(): string {
  return crypto.randomUUID();
}

function assertRecord(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null) {
    throw new ApiError(400, 'bad_request', 'Request body must be a JSON object');
  }
  return body as Record<string, unknown>;
}

/**
 * REST-shaped facade backed directly by IndexedDB (via Dexie).
 *
 * Routes served:
 *   GET    /projects
 *   GET    /projects/:id
 *   POST   /projects
 *   PUT    /projects/:id
 *   DELETE /projects/:id                    (cascades milestones + escrow)
 *   GET    /projects/:id/milestones
 *   POST   /projects/:id/milestones
 *   GET    /milestones/:id
 *   PUT    /milestones/:id
 *   GET    /projects/:id/escrow
 *   POST   /projects/:id/escrow
 *   PUT    /escrow/:id
 *   GET    /projects/:id/approvals
 *   POST   /approvals/:id/decision
 */
export class LocalIndexedDbTransport implements ApiTransport {
  async request<T>(req: ApiRequest): Promise<ApiResponse<T>> {
    const route = `${req.method} ${req.path}`;

    const listProjects = route.match(/^GET \/projects$/);
    if (listProjects) {
      const projects = await db.projects.orderBy('updatedAt').reverse().toArray();
      return { data: projects as T, meta: { total: projects.length } };
    }

    const getProject = route.match(/^GET \/projects\/([^/]+)$/);
    if (getProject) {
      const project = await db.projects.get(getProject[1]);
      if (!project) throw new ApiError(404, 'not_found', `Project ${getProject[1]} not found`);
      return { data: project as T };
    }

    if (route === 'POST /projects') {
      const body = assertRecord(req.body) as Partial<Project>;
      const now = toISO();
      const project: Project = {
        id: typeof body.id === 'string' ? body.id : newId(),
        slug: typeof body.slug === 'string' ? body.slug : (body.name ?? 'project').toLowerCase().replace(/\s+/g, '-'),
        name: (body.name as string) ?? 'Untitled project',
        ownerId: (body.ownerId as string) ?? 'local',
        profile: body.profile ?? 'first-time',
        region: body.region ?? 'zimbabwe',
        currency: body.currency ?? 'USD',
        status: body.status ?? 'draft',
        isArchived: body.isArchived,
        createdAt: body.createdAt ?? now,
        updatedAt: body.updatedAt ?? now,
        version: body.version ?? 1,
      };
      await db.projects.add(project);
      return { data: project as T, meta: { updatedAt: now } };
    }

    const putProject = route.match(/^PUT \/projects\/([^/]+)$/);
    if (putProject) {
      const existing = await db.projects.get(putProject[1]);
      if (!existing) throw new ApiError(404, 'not_found', `Project ${putProject[1]} not found`);
      const body = assertRecord(req.body);
      const project: Project = { ...existing, ...(body as Partial<Project>), updatedAt: toISO() };
      await db.projects.put(project);
      return { data: project as T, meta: { updatedAt: project.updatedAt } };
    }

    const deleteProject = route.match(/^DELETE \/projects\/([^/]+)$/);
    if (deleteProject) {
      const projectId = deleteProject[1];
      await db.projects.delete(projectId);
      await db.milestones.where('projectId').equals(projectId).delete();
      await db.escrows.where('projectId').equals(projectId).delete();
      return { data: { deleted: true } as T };
    }

    const listMilestones = route.match(/^GET \/projects\/([^/]+)\/milestones$/);
    if (listMilestones) {
      const milestones = await db.milestones.where('projectId').equals(listMilestones[1]).sortBy('order');
      return { data: milestones as T, meta: { total: milestones.length } };
    }

    const createMilestone = route.match(/^POST \/projects\/([^/]+)\/milestones$/);
    if (createMilestone) {
      const projectId = createMilestone[1];
      const body = assertRecord(req.body) as Partial<Milestone>;
      const now = toISO();
      const milestone: Milestone = {
        id: typeof body.id === 'string' ? body.id : newId(),
        projectId,
        name: (body.name as string) ?? 'Milestone',
        description: (body.description as string) ?? '',
        plannedDate: body.plannedDate ?? now,
        plannedCostCents: body.plannedCostCents ?? 0,
        linkedBOQSectionIds: body.linkedBOQSectionIds ?? [],
        linkedScheduleLineIds: body.linkedScheduleLineIds ?? [],
        requiredArtifacts: body.requiredArtifacts ?? [],
        requiredReviewChecks: body.requiredReviewChecks ?? [],
        proofArtifacts: body.proofArtifacts ?? [],
        reviewChecks: body.reviewChecks ?? [],
        releaseConditions: body.releaseConditions ?? [],
        releaseState: body.releaseState ?? 'locked',
        releaseDecisions: body.releaseDecisions ?? [],
        weight: body.weight ?? 1,
        order: body.order ?? 0,
        category: body.category ?? 'construction',
        isCritical: body.isCritical ?? false,
        createdAt: body.createdAt ?? now,
        updatedAt: body.updatedAt ?? now,
        notes: body.notes ?? '',
      };
      await db.milestones.add(milestone);
      return { data: milestone as T, meta: { updatedAt: now } };
    }

    const getMilestone = route.match(/^GET \/milestones\/([^/]+)$/);
    if (getMilestone) {
      const milestone = await db.milestones.get(getMilestone[1]);
      if (!milestone) throw new ApiError(404, 'not_found', `Milestone ${getMilestone[1]} not found`);
      return { data: milestone as T };
    }

    const putMilestone = route.match(/^PUT \/milestones\/([^/]+)$/);
    if (putMilestone) {
      const existing = await db.milestones.get(putMilestone[1]);
      if (!existing) throw new ApiError(404, 'not_found', `Milestone ${putMilestone[1]} not found`);
      const body = assertRecord(req.body);
      const milestone: Milestone = { ...existing, ...(body as Partial<Milestone>), id: existing.id, projectId: existing.projectId, updatedAt: toISO() };
      await db.milestones.put(milestone);
      return { data: milestone as T, meta: { updatedAt: milestone.updatedAt } };
    }

    const getEscrow = route.match(/^GET \/projects\/([^/]+)\/escrow$/);
    if (getEscrow) {
      const escrow = (await db.escrows.where('projectId').equals(getEscrow[1]).first()) ?? null;
      return { data: escrow as T };
    }

    const createEscrow = route.match(/^POST \/projects\/([^/]+)\/escrow$/);
    if (createEscrow) {
      const projectId = createEscrow[1];
      const body = assertRecord(req.body) as Partial<EscrowAgreement>;
      const now = toISO();
      const escrow: EscrowAgreement = {
        id: typeof body.id === 'string' ? body.id : newId(),
        projectId,
        providerId: (body.providerId as string) ?? 'local-provider',
        clientId: (body.clientId as string) ?? 'local-client',
        totalAmount: body.totalAmount ?? 0,
        currency: body.currency ?? 'USD',
        milestones: body.milestones ?? [],
        status: body.status ?? 'locked',
        terms: body.terms ?? 'Standard milestone-based release',
        createdAt: body.createdAt ?? now,
        updatedAt: body.updatedAt ?? now,
      };
      await db.escrows.add(escrow);
      return { data: escrow as T, meta: { updatedAt: now } };
    }

    const putEscrow = route.match(/^PUT \/escrow\/([^/]+)$/);
    if (putEscrow) {
      const existing = await db.escrows.get(putEscrow[1]);
      if (!existing) throw new ApiError(404, 'not_found', `Escrow ${putEscrow[1]} not found`);
      const body = assertRecord(req.body);
      const escrow: EscrowAgreement = { ...existing, ...(body as Partial<EscrowAgreement>), id: existing.id, updatedAt: toISO() };
      await db.escrows.put(escrow);
      return { data: escrow as T, meta: { updatedAt: escrow.updatedAt } };
    }

    const listApprovals = route.match(/^GET \/projects\/([^/]+)\/approvals$/);
    if (listApprovals) {
      const approvals = await deriveApprovals(listApprovals[1]);
      return { data: approvals as T, meta: { total: approvals.length } };
    }

    const decideApproval = route.match(/^POST \/approvals\/([^/]+)\/decision$/);
    if (decideApproval) {
      const milestoneId = decideApproval[1];
      const body = assertRecord(req.body) as {
        decision: 'pass' | 'fail' | 'conditional-pass' | 're-submit';
        decidedBy?: string;
        reason?: string;
      };
      const milestone = await db.milestones.get(milestoneId);
      if (!milestone) throw new ApiError(404, 'not_found', `Milestone ${milestoneId} not found`);
      const { milestone: updated } = makeReleaseDecision(
        milestone,
        body.decision,
        body.decidedBy ?? 'Local API',
        body.reason ?? 'Decided via local API'
      );
      await db.milestones.put(updated);
      const projectId = updated.projectId;
      const approval = (await deriveApprovals(projectId)).find((a) => a.id === milestoneId);
      return { data: (approval ?? toApprovalRequest(updated)) as T, meta: { updatedAt: updated.updatedAt } };
    }

    throw new ApiError(404, 'route_not_found', `No local route for ${req.method} ${req.path}`);
  }
}

function toApprovalRequest(m: Milestone): ApprovalRequest {
  return {
    id: m.id,
    title: m.name,
    description: m.description,
    amount: Math.round(m.plannedCostCents / 100),
    providerName: m.reviewChecks[0]?.assignedTo ?? 'Verified Contractor',
    status:
      m.releaseState === 'released'
        ? 'approved'
        : m.releaseState === 'rejected'
          ? 'rejected'
          : 'pending',
    dateRequested: m.plannedDate,
  };
}

async function deriveApprovals(projectId: string): Promise<ApprovalRequest[]> {
  const milestones = await db.milestones.where('projectId').equals(projectId).sortBy('order');
  const project = await db.projects.get(projectId);
  const currency = project?.currency ?? 'USD';
  return milestones
    .filter((m) => {
      const state = m.releaseState;
      const decided = state === 'released' || state === 'rejected';
      const awaitingReview = m.proofArtifacts.length > 0 && !decided;
      return decided || awaitingReview;
    })
    .map((m) => ({ ...toApprovalRequest(m), currency }));
}

/**
 * Fetch-backed transport ready for a future HTTP backend.
 *
 * Keep the no-backend constitution: this is never constructed by the app.
 * A backend deployment provides a `baseUrl` (e.g. a same-origin server route)
 * and swaps it into `createApiClient` — no consumer code changes.
 */
export class HttpTransport implements ApiTransport {
  constructor(private readonly baseUrl: string) {}

  async request<T>(req: ApiRequest): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${req.path}`, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string; code?: string };
      throw new ApiError(response.status, payload.code ?? 'http_error', payload.message ?? response.statusText);
    }
    return (await response.json()) as ApiResponse<T>;
  }
}
