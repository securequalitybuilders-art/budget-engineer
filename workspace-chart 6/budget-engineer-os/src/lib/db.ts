import Dexie, { Table } from 'dexie';
import {
  CadDocument, BimModel, BOQ, TransactionEvent, ProjectRecord, RevisionRecord,
} from '../domain/types';

export class BudgetDB extends Dexie {
  projects!: Table<ProjectRecord, string>;
  cadDocs!: Table<CadDocument, string>;
  bimModels!: Table<BimModel, string>;
  boqs!: Table<BOQ, string>;
  transactions!: Table<TransactionEvent, string>;
  revisions!: Table<RevisionRecord, string>;

  constructor() {
    super('budget-engineer-os');
    this.version(1).stores({
      projects: 'id,name,archived,createdAt',
      cadDocs: 'id,projectId',
      bimModels: 'id,projectId',
      boqs: 'id,projectId',
      transactions: 'id,projectId,timestamp',
    });
    this.version(2).stores({
      revisions: 'projectId',
    });
  }
}

export const db = new BudgetDB();
