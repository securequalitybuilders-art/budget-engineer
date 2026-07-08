export interface TransactionEvent {
  id: string;
  projectId: string;
  timestamp: number;
  actor: {
    id: string;
    name: string;
    role: string;
  };
  action: string;
  entityType: 'CAD' | 'BIM' | 'BOQ' | 'EXPORT' | 'PROJECT';
  details: string;
}
