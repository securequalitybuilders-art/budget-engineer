export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  isArchived?: boolean;
}
