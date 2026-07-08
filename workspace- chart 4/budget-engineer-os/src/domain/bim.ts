import { BimMetadata } from './cad';

export interface BimElementBase {
  id: string;
  cadId: string;
  type: 'wall' | 'slab' | 'opening' | 'block' | 'roomZone' | 'roof';
  name: string;
  floorId?: string;
  wallId?: string;
  area: number;
  volume?: number;
  metadata: BimMetadata;
  program?: string;
}

export interface BimModel {
  id: string;
  projectId: string;
  name: string;
  floors: any[];
  elements: BimElementBase[];
}
