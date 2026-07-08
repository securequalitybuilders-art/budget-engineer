import Dexie, { type Table } from 'dexie';
import type { CadDocument } from '../domain/cad';
import type { BimModel } from '../domain/bim';
import type { BOQ } from '../domain/boq';
import type { TransactionEvent } from '../domain/transaction';
import type { ProjectSnapshot } from '../domain/versioning';
import type { ProjectRecord } from '../domain/project';
import type { GovernanceRecord } from '../domain/governance';

export class BudgetEngineerDb extends Dexie {
  projects!: Table<ProjectRecord, string>;
  governance!: Table<GovernanceRecord, string>;
  cadDocs!: Table<CadDocument, string>;
  bimModels!: Table<BimModel, string>;
  boqs!: Table<BOQ, string>;
  transactions!: Table<TransactionEvent, string>;
  snapshots!: Table<ProjectSnapshot, string>;

  constructor() {
    super('budgetEngineerDb');
    this.version(4).stores({
      projects: 'id,status,updatedAt',
      governance: 'projectId,approvalState,lastUpdated',
      cadDocs: 'id,name,projectId',
      bimModels: 'id,name,projectId',
      boqs: 'id,currency,projectId',
      transactions: 'id,timestamp,entityType,entityId',
      snapshots: 'id,timestamp,name,projectId',
    });
  }
}

export const db = new BudgetEngineerDb();
