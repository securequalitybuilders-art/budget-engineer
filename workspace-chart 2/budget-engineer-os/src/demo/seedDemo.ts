import type { DesignOption } from '../domain/boq'
import { useAppStore, type ProjectBrief } from '../store/appStore'

const demoBrief: ProjectBrief = {
  profile: 'architect',
  region: 'Zimbabwe',
  currency: 'USD',
  briefText:
    'Design an affordable 3-bedroom single-storey family home with open-plan lounge, kitchen, 2 bathrooms, veranda, durable roof, and cost-efficient finishes.',
  budgetText: 'USD 45,000 - 60,000',
}

const demoDesigns: DesignOption[] = [
  {
    id: 'opt-compact',
    name: 'Compact',
    grossFloorArea: 96,
    floors: 1,
    elements: [
      { id: 'e1', type: 'foundation', category: 'foundation', name: 'Strip foundations', unit: 'm3', quantity: 14.5 },
      { id: 'e2', type: 'foundation_wall', category: 'foundation_wall', name: 'Foundation walls', unit: 'm2', quantity: 38 },
      { id: 'e3', type: 'wall', category: 'wall', name: 'External and internal walls', unit: 'm2', quantity: 210 },
      { id: 'e4', type: 'roof', category: 'roof', name: 'Roof structure', unit: 'm2', quantity: 108 },
      { id: 'e5', type: 'floor_finish', category: 'floor_finish', name: 'Floor finishes', unit: 'm2', quantity: 96 },
      { id: 'e6', type: 'wall_finish', category: 'wall_finish', name: 'Wall finishes', unit: 'm2', quantity: 270 },
      { id: 'e7', type: 'electrical_point', category: 'electrical_point', name: 'Electrical points', unit: 'point', quantity: 26 },
      { id: 'e8', type: 'plumbing_point', category: 'plumbing_point', name: 'Plumbing points', unit: 'point', quantity: 12 },
      { id: 'e9', type: 'external_works', category: 'external_works', name: 'External works', unit: 'm2', quantity: 80 },
    ],
  },
  {
    id: 'opt-standard',
    name: 'Standard',
    grossFloorArea: 118,
    floors: 1,
    elements: [
      { id: 'e10', type: 'foundation', category: 'foundation', name: 'Strip foundations', unit: 'm3', quantity: 17.8 },
      { id: 'e11', type: 'foundation_wall', category: 'foundation_wall', name: 'Foundation walls', unit: 'm2', quantity: 45 },
      { id: 'e12', type: 'wall', category: 'wall', name: 'External and internal walls', unit: 'm2', quantity: 248 },
      { id: 'e13', type: 'roof', category: 'roof', name: 'Roof structure', unit: 'm2', quantity: 132 },
      { id: 'e14', type: 'floor_finish', category: 'floor_finish', name: 'Floor finishes', unit: 'm2', quantity: 118 },
      { id: 'e15', type: 'wall_finish', category: 'wall_finish', name: 'Wall finishes', unit: 'm2', quantity: 318 },
      { id: 'e16', type: 'electrical_point', category: 'electrical_point', name: 'Electrical points', unit: 'point', quantity: 32 },
      { id: 'e17', type: 'plumbing_point', category: 'plumbing_point', name: 'Plumbing points', unit: 'point', quantity: 15 },
      { id: 'e18', type: 'external_works', category: 'external_works', name: 'External works', unit: 'm2', quantity: 96 },
    ],
  },
  {
    id: 'opt-spacious',
    name: 'Spacious',
    grossFloorArea: 144,
    floors: 1,
    elements: [
      { id: 'e19', type: 'foundation', category: 'foundation', name: 'Strip foundations', unit: 'm3', quantity: 21.2 },
      { id: 'e20', type: 'foundation_wall', category: 'foundation_wall', name: 'Foundation walls', unit: 'm2', quantity: 54 },
      { id: 'e21', type: 'wall', category: 'wall', name: 'External and internal walls', unit: 'm2', quantity: 302 },
      { id: 'e22', type: 'roof', category: 'roof', name: 'Roof structure', unit: 'm2', quantity: 160 },
      { id: 'e23', type: 'floor_finish', category: 'floor_finish', name: 'Floor finishes', unit: 'm2', quantity: 144 },
      { id: 'e24', type: 'wall_finish', category: 'wall_finish', name: 'Wall finishes', unit: 'm2', quantity: 386 },
      { id: 'e25', type: 'electrical_point', category: 'electrical_point', name: 'Electrical points', unit: 'point', quantity: 38 },
      { id: 'e26', type: 'plumbing_point', category: 'plumbing_point', name: 'Plumbing points', unit: 'point', quantity: 17 },
      { id: 'e27', type: 'external_works', category: 'external_works', name: 'External works', unit: 'm2', quantity: 120 },
    ],
  },
]

export function seedDemoProject() {
  const store = useAppStore.getState()
  if (store.projects.length > 0) return
  const projectId = store.createProject({ name: 'Demo Affordable Housing Project', brief: demoBrief })
  store.setDesignOptions(projectId, demoDesigns, 'AI_AGENT')
}
