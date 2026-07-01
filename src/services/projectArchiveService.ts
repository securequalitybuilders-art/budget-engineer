import { db } from '@/db/db';
import { logTransaction } from './projectPersistenceService';

export async function archiveProject(projectId: string): Promise<void> {
  if (!projectId) return;
  const project = await db.projects.get(projectId);
  if (!project) return;

  await db.projects.update(projectId, {
    isArchived: true,
    updatedAt: new Date().toISOString(),
  });

  await logTransaction(projectId, 'UPDATE', 'project', projectId, 'Project archived');
}

export async function restoreProject(projectId: string): Promise<void> {
  if (!projectId) return;
  const project = await db.projects.get(projectId);
  if (!project) return;

  await db.projects.update(projectId, {
    isArchived: false,
    updatedAt: new Date().toISOString(),
  });

  await logTransaction(projectId, 'UPDATE', 'project', projectId, 'Project restored');
}
