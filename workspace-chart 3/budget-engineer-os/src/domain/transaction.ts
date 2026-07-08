export type TransactionEvent = {
  id: string;
  timestamp: string;
  actor: 'USER' | 'SYSTEM' | 'AI_AGENT';
  action: string;
  entityType: 'CAD' | 'BIM' | 'BOQ' | 'EXPORT' | 'PROJECT';
  entityId: string;
  summary: string;
  metadata?: Record<string, string | number | boolean>;
};
