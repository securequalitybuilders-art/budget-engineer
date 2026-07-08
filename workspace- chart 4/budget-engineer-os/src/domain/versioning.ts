import { CadDocument } from './cad';
import { BimModel } from './bim';
import { BOQ } from './boq';

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  name: string;
  timestamp: number;
  cadDoc: CadDocument;
  bimModel: BimModel;
  boq: BOQ;
}
