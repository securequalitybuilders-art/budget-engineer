export interface WorkItem {
  id: string
  label: string
  description: string
  unit: string
  quantity: number
  material: string
  spec: string
  status: 'pending' | 'in-progress' | 'completed'
}

export interface MaterialSpec {
  name: string
  spec: string
  application: string
}

export interface PhaseBomEntry {
  item: string
  spec: string
  unit: string
  qty: number
  notes: string
}

export interface ConstructionPhase {
  id: string
  title: string
  description: string
  workItems: WorkItem[]
  materials: MaterialSpec[]
  bom: PhaseBomEntry[]
  estimatedDays: number
  trade: string
}
