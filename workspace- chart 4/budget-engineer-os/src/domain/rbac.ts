export type UserRole = 'owner' | 'reviewer' | 'viewer';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}
