import Dexie, { type Table } from 'dexie';
import type { ProjectRecord } from '../domain/project';
import type { GovernanceRecord } from '../domain/governance';
import type { CadDocument } from '../domain/cad';
import type { BimModel } from '../domain/bim';
import type { BOQ } from '../domain/boq';
import type { TransactionEvent } from '../domain/transaction';
import type { ProjectSnapshot } from '../domain/versioning';
export class AppDatabase extends Dexie {
  projects!: Table<ProjectRecord, string>;
  governance!: Table<GovernanceRecord, string>;
  cadDocs!: Table<CadDocument, string>;
  bimModels!: Table<BimModel, string>;
  boqs!: Table<BOQ, string>;
  transactions!: Table<TransactionEvent, string>;
  snapshots!: Table<ProjectSnapshot, string>;
  constructor() {
    super('BudgetEngineerDB');
    this.version(4).stores({ projects: 'id', governance: 'projectId', cadDocs: 'id', bimModels: 'id', boqs: 'id', transactions: 'id,projectId', snapshots: 'id,projectId' });
  }
}
export const db = new AppDatabase();