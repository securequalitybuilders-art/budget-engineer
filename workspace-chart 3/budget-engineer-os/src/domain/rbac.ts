export type UserRole = 'owner' | 'reviewer' | 'viewer';

export type UserRecord = {
  id: string;
  name: string;
  role: UserRole;
};
