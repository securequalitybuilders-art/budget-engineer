import Dexie, { Table } from 'dexie';
import { CadDocument } from '../domain/cad';
import { BimModel } from '../domain/bim';
import { BOQ } from '../domain/boq';
import { TransactionEvent } from '../domain/transaction';
import { ProjectSnapshot } from '../domain/versioning';
import { ProjectRecord } from '../domain/project';
import { GovernanceRecord } from '../domain/governance';

export class BudgetEngineerDb extends Dexie {
  projects!: Table<ProjectRecord, string>;
  cadDocs!: Table<CadDocument, string>;
  bimModels!: Table<BimModel, string>;
  boqs!: Table<BOQ, string>;
  transactions!: Table<TransactionEvent, string>;
  snapshots!: Table<ProjectSnapshot, string>;
  governance!: Table<GovernanceRecord, string>;

  constructor() {
    super('BudgetEngineerDb');
    this.version(4).stores({
      projects: 'id, name, isArchived',
      cadDocs: 'id, projectId',
      bimModels: 'id, projectId',
      boqs: 'id, projectId',
      transactions: 'id, projectId, timestamp',
      snapshots: 'id, projectId, timestamp',
      governance: 'projectId, approvalState, lastUpdated'
    });
  }
}

export const db = new BudgetEngineerDb();
