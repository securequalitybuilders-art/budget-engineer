import Dexie, { type Table } from 'dexie';
import type { Project, Brief, Design, BOQ, ProjectTransaction, Rate } from '@/types';

/**
 * Local-first IndexedDB database for Budget Engineer OS.
 * All project data, briefs, designs, BOQs, and transactions live here.
 * Sync to a backend is optional and layered on top of this store.
 */
export class BudgetEngineerDB extends Dexie {
  projects!: Table<Project, string>;
  briefs!: Table<Brief, string>;
  designs!: Table<Design, string>;
  boqs!: Table<BOQ, string>;
  transactions!: Table<ProjectTransaction, string>;
  rates!: Table<Rate, string>;

  constructor() {
    super('BudgetEngineerDB');
    this.version(1).stores({
      projects: 'id, [ownerId+status], updatedAt',
      briefs: 'projectId',
      designs: 'id, projectId, [projectId+optionIndex]',
      boqs: 'id, projectId, designId',
      transactions: 'id, [projectId+createdAt], entityType',
      rates: 'id, [region+code], source',
    });
  }
}

export const db = new BudgetEngineerDB();

/**
 * Seed a minimal Zimbabwe/CWICR-style rate catalogue for offline demos.
 * In production, this table is populated from OpenConstructionEstimate-DDC-CWICR
 * and regional overrides.
 */
export async function seedRates(): Promise<void> {
  const count = await db.rates.count();
  if (count > 0) return;

  const now = new Date().getFullYear();
  const rates: Rate[] = [
    { id: 'cement-50kg', region: 'zimbabwe', code: 'MAT-CEM-001', description: 'Portland cement, 50kg bag', unit: 'bag', baseRateCents: 1850, source: 'zimbabwe', year: now },
    { id: 'brick-common', region: 'zimbabwe', code: 'MAT-BRK-001', description: 'Common clay brick', unit: 'each', baseRateCents: 25, source: 'zimbabwe', year: now },
    { id: 'steel-rebar-12mm', region: 'zimbabwe', code: 'MAT-STL-001', description: 'High tensile steel rebar 12mm', unit: 'm', baseRateCents: 450, source: 'zimbabwe', year: now },
    { id: 'timber-50x100', region: 'zimbabwe', code: 'MAT-TIM-001', description: 'Sawn timber 50x100mm', unit: 'm', baseRateCents: 320, source: 'zimbabwe', year: now },
    { id: 'roof-sheet', region: 'zimbabwe', code: 'MAT-Roof-001', description: 'Corrugated galvanized iron sheet', unit: 'm2', baseRateCents: 1200, source: 'zimbabwe', year: now },
    { id: 'paint-latex', region: 'zimbabwe', code: 'MAT-PNT-001', description: 'Latex interior paint', unit: 'l', baseRateCents: 850, source: 'zimbabwe', year: now },
    { id: 'concrete-slab', region: 'zimbabwe', code: 'MAT-CON-SLAB', description: 'Reinforced concrete slab supply & place', unit: 'm2', baseRateCents: 8500, source: 'zimbabwe', year: now },
    { id: 'aluminium-window', region: 'zimbabwe', code: 'MAT-WIN-001', description: 'Aluminium window frame + glass', unit: 'm2', baseRateCents: 15000, source: 'zimbabwe', year: now },
    { id: 'timber-door', region: 'zimbabwe', code: 'MAT-DOR-001', description: 'Timber flush door', unit: 'each', baseRateCents: 12000, source: 'zimbabwe', year: now },
    { id: 'solar-panel', region: 'zimbabwe', code: 'MAT-SOL-001', description: 'Solar PV panel system', unit: 'm2', baseRateCents: 20000, source: 'zimbabwe', year: now },
    { id: 'labour-bricklayer', region: 'zimbabwe', code: 'LAB-BRK-001', description: 'Bricklayer labour', unit: 'hr', baseRateCents: 180, source: 'zimbabwe', year: now },
    { id: 'labour-carpenter', region: 'zimbabwe', code: 'LAB-CAR-001', description: 'Carpenter labour', unit: 'hr', baseRateCents: 200, source: 'zimbabwe', year: now },
  ];

  await db.rates.bulkAdd(rates);
}
