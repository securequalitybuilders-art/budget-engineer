import type { BimMetadata } from './cad';
export interface BimFloor { id: string; name: string; elevation: number; height: number; }
export interface BimElement { id: string; projectId: string; floorId: string; type: 'wall' | 'slab' | 'roof' | 'opening' | 'block' | 'column' | 'beam'; cadId: string; position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number]; metadata?: BimMetadata; }
export interface BimModel { id: string; projectId: string; name: string; floors: BimFloor[]; elements: BimElement[]; }