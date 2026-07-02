import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '@/db/db';
import {
  loadGovernanceWorkflow,
  submitForReview,
  approveProject,
  requestChanges,
  resetGovernance,
  addGovernanceCommentAction,
} from '@/services/governanceWorkflowService';

describe('governanceWorkflowService', () => {
  beforeAll(async () => {
    await db.open();
  });

  afterAll(async () => {
    db.close();
  });

  it('default state is draft', async () => {
    const state = await loadGovernanceWorkflow('proj-draft', 'owner');
    expect(state.status).toBe('draft');
    expect(state.projectId).toBe('proj-draft');
    expect(state.currentRole).toBe('owner');
    expect(state.timeline).toHaveLength(0);
    expect(state.warnings.some((w) => w.includes('Demo governance'))).toBe(true);
  });

  it('owner can submit for review', async () => {
    const state = await submitForReview('proj-submit', 'owner');
    expect(state.status).toBe('in-review');
    expect(state.timeline.length).toBeGreaterThan(0);
    const submitEvent = state.timeline.find((e) => e.action === 'submit');
    expect(submitEvent).toBeDefined();
    expect(submitEvent!.author).toBe('Owner');
  });

  it('reviewer can approve', async () => {
    await submitForReview('proj-approve', 'owner');
    const state = await approveProject('proj-approve', 'reviewer', 'Looks good');
    expect(state.status).toBe('approved');
    const approveEvent = state.timeline.find((e) => e.action === 'approve');
    expect(approveEvent).toBeDefined();
    expect(approveEvent!.message).toContain('Looks good');
  });

  it('reviewer can request changes', async () => {
    await submitForReview('proj-changes', 'owner');
    const state = await requestChanges('proj-changes', 'reviewer', 'Need revisions');
    expect(state.status).toBe('changes-requested');
    const changeEvent = state.timeline.find((e) => e.action === 'request-changes');
    expect(changeEvent).toBeDefined();
    expect(changeEvent!.message).toContain('Need revisions');
  });

  it('viewer cannot approve', async () => {
    const state = await approveProject('proj-viewer-approve', 'viewer', 'Trying to approve');
    expect(state.status).not.toBe('approved');
    expect(state.warnings.some((w) => w.includes('Viewers cannot'))).toBe(true);
  });

  it('viewer cannot submit for review', async () => {
    const state = await submitForReview('proj-viewer-submit', 'viewer');
    expect(state.status).toBe('draft');
    expect(state.warnings.some((w) => w.includes('Viewers cannot'))).toBe(true);
  });

  it('comment added appears in timeline', async () => {
    const state = await addGovernanceCommentAction({
      projectId: 'proj-comment',
      actorRole: 'owner',
      type: 'general',
      message: 'This is a test comment',
    });
    const commentEvent = state.timeline.find((e) => e.action === 'comment');
    expect(commentEvent).toBeDefined();
    expect(commentEvent!.message).toBe('This is a test comment');
    expect(commentEvent!.author).toBe('Owner');
  });

  it('reset returns draft', async () => {
    await submitForReview('proj-reset', 'owner');
    const state = await resetGovernance('proj-reset', 'owner');
    expect(state.status).toBe('draft');
    const resetEvent = state.timeline.find((e) => e.action === 'reset');
    expect(resetEvent).toBeDefined();
  });

  it('does not crash on missing project id', async () => {
    const state = await loadGovernanceWorkflow('', 'owner');
    expect(state).toBeDefined();
    expect(state.projectId).toBeDefined();
  });

  it('does not crash on unknown project id', async () => {
    const state = await loadGovernanceWorkflow('non-existent-project', 'owner');
    expect(state).toBeDefined();
    expect(state.status).toBe('draft');
  });

  it('owner cannot approve', async () => {
    const state = await approveProject('proj-owner-approve', 'owner', 'Owner trying to approve');
    expect(state.status).not.toBe('approved');
    expect(state.warnings.some((w) => w.includes('Owners cannot'))).toBe(true);
  });

  it('owner cannot request changes', async () => {
    const state = await requestChanges('proj-owner-changes', 'owner');
    expect(state.status).not.toBe('changes-requested');
    expect(state.warnings.some((w) => w.includes('Owners cannot'))).toBe(true);
  });

  it('empty comment returns warning', async () => {
    const state = await addGovernanceCommentAction({
      projectId: 'proj-empty-comment',
      actorRole: 'owner',
      type: 'general',
      message: '',
    });
    expect(state.warnings.some((w) => w.includes('cannot be empty'))).toBe(true);
  });

  it('load after reset has draft state', async () => {
    const state = await loadGovernanceWorkflow('proj-reset', 'reviewer');
    expect(state.status).toBe('draft');
    expect(state.currentRole).toBe('reviewer');
  });
});
