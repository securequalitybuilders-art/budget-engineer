import type { Project, Currency } from '@/types';
import type { Milestone, ReviewDecision } from '@/domain/milestone';
import type { EscrowAgreement } from '@/domain/marketplace';
import type { ApprovalRequest } from '@/components/portal/ApprovalInbox';
import {
  createEscrow,
  getEscrowSummary,
  releaseFunds,
} from '@/engine/marketplace/escrowEngine';
import { ApiError, type ApiRequest } from './types';
import type { ApiTransport } from './transport';

export interface EscrowSummary {
  total: number;
  released: number;
  locked: number;
  disputed: number;
  progress: number;
  overdueCount: number;
}

export interface CreateProjectInput {
  name: string;
  ownerId?: string;
  slug?: string;
  region?: Project['region'];
  currency?: Currency;
  status?: Project['status'];
}

export interface CreateMilestoneInput {
  name: string;
  description?: string;
  plannedDate?: string;
  plannedCostCents?: number;
  category?: Milestone['category'];
  order?: number;
  weight?: number;
  isCritical?: boolean;
}

export interface CreateEscrowInput {
  providerId: string;
  clientId?: string;
  totalAmount: number;
  currency?: string;
  terms?: string;
  milestones: { title: string; description: string; amount: number; dueDate: string }[];
}

export interface ApprovalDecisionInput {
  decision: ReviewDecision;
  decidedBy?: string;
  reason?: string;
}

export interface ApiClient {
  projects: {
    list(): Promise<Project[]>;
    get(id: string): Promise<Project | null>;
    create(input: CreateProjectInput): Promise<Project>;
    update(id: string, patch: Partial<Project>): Promise<Project>;
    remove(id: string): Promise<{ deleted: boolean }>;
  };
  milestones: {
    listByProject(projectId: string): Promise<Milestone[]>;
    get(id: string): Promise<Milestone | null>;
    create(projectId: string, input: CreateMilestoneInput): Promise<Milestone>;
    update(id: string, patch: Partial<Milestone>): Promise<Milestone>;
  };
  escrow: {
    getByProject(projectId: string): Promise<EscrowAgreement | null>;
    create(projectId: string, input: CreateEscrowInput): Promise<EscrowAgreement>;
    save(escrow: EscrowAgreement): Promise<EscrowAgreement>;
    releaseMilestone(projectId: string, milestoneId: string, approvedBy?: string): Promise<EscrowAgreement>;
    summary(projectId: string): Promise<EscrowSummary>;
  };
  approvals: {
    list(projectId: string): Promise<ApprovalRequest[]>;
    decide(id: string, input: ApprovalDecisionInput): Promise<ApprovalRequest>;
  };
}

export function createApiClient(transport: ApiTransport): ApiClient {
  const request = async <T>(req: ApiRequest): Promise<T> => {
    const res = await transport.request<T>(req);
    return res.data;
  };

  return {
    projects: {
      list: () => request<Project[]>({ method: 'GET', path: '/projects' }),
      get: (id) => request<Project | null>({ method: 'GET', path: `/projects/${id}` }),
      create: (input) =>
        request<Project>({
          method: 'POST',
          path: '/projects',
          body: { ...input, ownerId: input.ownerId ?? 'local' },
        }),
      update: (id, patch) => request<Project>({ method: 'PUT', path: `/projects/${id}`, body: patch }),
      remove: (id) => request<{ deleted: boolean }>({ method: 'DELETE', path: `/projects/${id}` }),
    },
    milestones: {
      listByProject: (projectId) =>
        request<Milestone[]>({ method: 'GET', path: `/projects/${projectId}/milestones` }),
      get: (id) => request<Milestone | null>({ method: 'GET', path: `/milestones/${id}` }),
      create: (projectId, input) =>
        request<Milestone>({ method: 'POST', path: `/projects/${projectId}/milestones`, body: input }),
      update: (id, patch) => request<Milestone>({ method: 'PUT', path: `/milestones/${id}`, body: patch }),
    },
    escrow: {
      getByProject: (projectId) =>
        request<EscrowAgreement | null>({ method: 'GET', path: `/projects/${projectId}/escrow` }),
      create: async (projectId, input) => {
        const escrow = createEscrow({
          projectId,
          providerId: input.providerId,
          clientId: input.clientId ?? 'local-client',
          totalAmount: input.totalAmount,
          currency: input.currency,
          terms: input.terms,
          milestones: input.milestones,
        });
        return request<EscrowAgreement>({ method: 'POST', path: `/projects/${projectId}/escrow`, body: escrow });
      },
      save: (escrow) => request<EscrowAgreement>({ method: 'PUT', path: `/escrow/${escrow.id}`, body: escrow }),
      releaseMilestone: async (projectId, milestoneId, approvedBy) => {
        const escrow = await request<EscrowAgreement | null>({
          method: 'GET',
          path: `/projects/${projectId}/escrow`,
        });
        if (!escrow) throw new ApiError(404, 'not_found', `No escrow for project ${projectId}`);
        const updated = releaseFunds(escrow, milestoneId, approvedBy);
        return request<EscrowAgreement>({ method: 'PUT', path: `/escrow/${escrow.id}`, body: updated });
      },
      summary: async (projectId) => {
        const escrow = await request<EscrowAgreement | null>({
          method: 'GET',
          path: `/projects/${projectId}/escrow`,
        });
        if (!escrow) return { total: 0, released: 0, locked: 0, disputed: 0, progress: 0, overdueCount: 0 };
        return toEscrowSummary(getEscrowSummary(escrow));
      },
    },
    approvals: {
      list: (projectId) => request<ApprovalRequest[]>({ method: 'GET', path: `/projects/${projectId}/approvals` }),
      decide: (id, input) =>
        request<ApprovalRequest>({ method: 'POST', path: `/approvals/${id}/decision`, body: input }),
    },
  };
}

function toEscrowSummary(summary: ReturnType<typeof getEscrowSummary>): EscrowSummary {
  return {
    total: summary.total,
    released: summary.released,
    locked: summary.locked,
    disputed: summary.disputed,
    progress: summary.progress,
    overdueCount: summary.overdueCount,
  };
}
