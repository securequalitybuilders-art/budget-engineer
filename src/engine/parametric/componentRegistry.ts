export type DoorType = 'single-swing' | 'double-swing' | 'sliding' | 'bi-fold' | 'pocket'
export type DoorCore = 'solid' | 'hollow-core' | 'fire-rated' | 'glazed' | 'flush'
export type WindowType = 'casement' | 'sliding' | 'awning' | 'fixed' | 'louver'
export type SanitaryType = 'wc' | 'basin' | 'shower' | 'bath' | 'kitchen-sink' | 'urinal' | 'bidet'
export type StairType = 'straight' | 'l-shaped' | 'u-shaped' | 'spiral'
export type ComponentCategory = 'door' | 'window' | 'sanitary' | 'stair'

export interface DoorSpec {
  type: DoorType
  widthMm: number
  heightMm: number
  core: DoorCore
  label: string
  code: string
  minClearWidthMm: number
  fireRatingMinHr?: number
  leafCount: 1 | 2
}

export interface WindowSpec {
  type: WindowType
  widthMm: number
  heightMm: number
  sillHeightMm: number
  label: string
  code: string
  liteCount: number
}

export interface SanitarySpec {
  type: SanitaryType
  widthMm: number
  depthMm: number
  label: string
  clearanceFrontMm: number
}

export interface StairSpec {
  type: StairType
  minWidthMm: number
  maxRiseMm: number
  minGoingMm: number
  minHeadroomMm: number
}

export interface ComponentFilter {
  category?: ComponentCategory
  type?: string
  minWidthMm?: number
  maxWidthMm?: number
}

export interface ComponentCatalog {
  doors: DoorSpec[]
  windows: WindowSpec[]
  sanitary: SanitarySpec[]
  stairs: StairSpec[]
}

const DOORS: DoorSpec[] = [
  { type: 'single-swing', widthMm: 813, heightMm: 2032, core: 'hollow-core', label: 'Single Leaf 813', code: 'D-813', minClearWidthMm: 760, leafCount: 1 },
  { type: 'single-swing', widthMm: 926, heightMm: 2032, core: 'hollow-core', label: 'Single Leaf 926', code: 'D-926', minClearWidthMm: 870, leafCount: 1 },
  { type: 'single-swing', widthMm: 813, heightMm: 2100, core: 'hollow-core', label: 'Single Leaf 813×2100', code: 'D-813H', minClearWidthMm: 760, leafCount: 1 },
  { type: 'single-swing', widthMm: 926, heightMm: 2100, core: 'hollow-core', label: 'Single Leaf 926×2100', code: 'D-926H', minClearWidthMm: 870, leafCount: 1 },
  { type: 'single-swing', widthMm: 1200, heightMm: 2032, core: 'solid', label: 'Wide Single 1200', code: 'D-1200', minClearWidthMm: 1140, leafCount: 1 },
  { type: 'single-swing', widthMm: 1500, heightMm: 2032, core: 'solid', label: 'Wide Single 1500', code: 'D-1500', minClearWidthMm: 1440, leafCount: 1 },
  { type: 'double-swing', widthMm: 1500, heightMm: 2032, core: 'solid', label: 'Double Leaf 1500', code: 'D-1500D', minClearWidthMm: 1440, leafCount: 2 },
  { type: 'double-swing', widthMm: 1800, heightMm: 2032, core: 'solid', label: 'Double Leaf 1800', code: 'D-1800D', minClearWidthMm: 1740, leafCount: 2 },
  { type: 'double-swing', widthMm: 2100, heightMm: 2032, core: 'solid', label: 'Double Leaf 2100', code: 'D-2100D', minClearWidthMm: 2040, leafCount: 2 },
  { type: 'double-swing', widthMm: 2400, heightMm: 2032, core: 'solid', label: 'Double Leaf 2400', code: 'D-2400D', minClearWidthMm: 2340, leafCount: 2 },
  { type: 'single-swing', widthMm: 813, heightMm: 2032, core: 'fire-rated', label: 'Fire Door 813 FD30', code: 'D-FD30-813', minClearWidthMm: 740, fireRatingMinHr: 0.5, leafCount: 1 },
  { type: 'single-swing', widthMm: 926, heightMm: 2032, core: 'fire-rated', label: 'Fire Door 926 FD30', code: 'D-FD30-926', minClearWidthMm: 850, fireRatingMinHr: 0.5, leafCount: 1 },
  { type: 'single-swing', widthMm: 813, heightMm: 2032, core: 'fire-rated', label: 'Fire Door 813 FD60', code: 'D-FD60-813', minClearWidthMm: 730, fireRatingMinHr: 1, leafCount: 1 },
  { type: 'single-swing', widthMm: 926, heightMm: 2032, core: 'fire-rated', label: 'Fire Door 926 FD60', code: 'D-FD60-926', minClearWidthMm: 840, fireRatingMinHr: 1, leafCount: 1 },
  { type: 'single-swing', widthMm: 813, heightMm: 2032, core: 'glazed', label: 'Glazed Door 813', code: 'D-GL-813', minClearWidthMm: 760, leafCount: 1 },
  { type: 'single-swing', widthMm: 926, heightMm: 2032, core: 'glazed', label: 'Glazed Door 926', code: 'D-GL-926', minClearWidthMm: 870, leafCount: 1 },
  { type: 'sliding', widthMm: 1500, heightMm: 2100, core: 'glazed', label: 'Sliding Door 1500', code: 'D-SL-1500', minClearWidthMm: 1460, leafCount: 2 },
  { type: 'sliding', widthMm: 1800, heightMm: 2100, core: 'glazed', label: 'Sliding Door 1800', code: 'D-SL-1800', minClearWidthMm: 1760, leafCount: 2 },
  { type: 'sliding', widthMm: 2400, heightMm: 2100, core: 'glazed', label: 'Sliding Door 2400', code: 'D-SL-2400', minClearWidthMm: 2360, leafCount: 2 },
  { type: 'sliding', widthMm: 3000, heightMm: 2100, core: 'glazed', label: 'Sliding Door 3000', code: 'D-SL-3000', minClearWidthMm: 2960, leafCount: 2 },
  { type: 'sliding', widthMm: 3600, heightMm: 2100, core: 'glazed', label: 'Sliding Door 3600', code: 'D-SL-3600', minClearWidthMm: 3560, leafCount: 2 },
  { type: 'bi-fold', widthMm: 2400, heightMm: 2100, core: 'glazed', label: 'Bi-Fold 2400 4-leaf', code: 'D-BF-2400', minClearWidthMm: 2300, leafCount: 2 },
  { type: 'bi-fold', widthMm: 3000, heightMm: 2100, core: 'glazed', label: 'Bi-Fold 3000 4-leaf', code: 'D-BF-3000', minClearWidthMm: 2900, leafCount: 2 },
  { type: 'bi-fold', widthMm: 3600, heightMm: 2100, core: 'glazed', label: 'Bi-Fold 3600 6-leaf', code: 'D-BF-3600', minClearWidthMm: 3500, leafCount: 2 },
  { type: 'pocket', widthMm: 813, heightMm: 2032, core: 'flush', label: 'Pocket Door 813', code: 'D-PK-813', minClearWidthMm: 800, leafCount: 1 },
  { type: 'pocket', widthMm: 926, heightMm: 2032, core: 'flush', label: 'Pocket Door 926', code: 'D-PK-926', minClearWidthMm: 910, leafCount: 1 },
]

const WINDOWS: WindowSpec[] = [
  { type: 'casement', widthMm: 600, heightMm: 600, sillHeightMm: 900, label: 'Casement 600×600', code: 'W-C-0606', liteCount: 1 },
  { type: 'casement', widthMm: 900, heightMm: 600, sillHeightMm: 900, label: 'Casement 900×600', code: 'W-C-0906', liteCount: 1 },
  { type: 'casement', widthMm: 1200, heightMm: 600, sillHeightMm: 900, label: 'Casement 1200×600', code: 'W-C-1206', liteCount: 2 },
  { type: 'casement', widthMm: 1500, heightMm: 900, sillHeightMm: 900, label: 'Casement 1500×900', code: 'W-C-1509', liteCount: 2 },
  { type: 'casement', widthMm: 1800, heightMm: 900, sillHeightMm: 900, label: 'Casement 1800×900', code: 'W-C-1809', liteCount: 3 },
  { type: 'casement', widthMm: 2100, heightMm: 1200, sillHeightMm: 900, label: 'Casement 2100×1200', code: 'W-C-2112', liteCount: 3 },
  { type: 'sliding', widthMm: 1200, heightMm: 600, sillHeightMm: 900, label: 'Sliding 1200×600', code: 'W-S-1206', liteCount: 2 },
  { type: 'sliding', widthMm: 1500, heightMm: 900, sillHeightMm: 900, label: 'Sliding 1500×900', code: 'W-S-1509', liteCount: 2 },
  { type: 'sliding', widthMm: 1800, heightMm: 900, sillHeightMm: 900, label: 'Sliding 1800×900', code: 'W-S-1809', liteCount: 3 },
  { type: 'sliding', widthMm: 2400, heightMm: 1200, sillHeightMm: 900, label: 'Sliding 2400×1200', code: 'W-S-2412', liteCount: 3 },
  { type: 'sliding', widthMm: 3000, heightMm: 1200, sillHeightMm: 900, label: 'Sliding 3000×1200', code: 'W-S-3012', liteCount: 4 },
  { type: 'sliding', widthMm: 3600, heightMm: 1200, sillHeightMm: 900, label: 'Sliding 3600×1200', code: 'W-S-3612', liteCount: 4 },
  { type: 'awning', widthMm: 600, heightMm: 600, sillHeightMm: 900, label: 'Awning 600×600', code: 'W-A-0606', liteCount: 1 },
  { type: 'awning', widthMm: 900, heightMm: 600, sillHeightMm: 900, label: 'Awning 900×600', code: 'W-A-0906', liteCount: 1 },
  { type: 'awning', widthMm: 1200, heightMm: 900, sillHeightMm: 900, label: 'Awning 1200×900', code: 'W-A-1209', liteCount: 2 },
  { type: 'fixed', widthMm: 900, heightMm: 600, sillHeightMm: 900, label: 'Fixed 900×600', code: 'W-F-0906', liteCount: 1 },
  { type: 'fixed', widthMm: 1200, heightMm: 900, sillHeightMm: 900, label: 'Fixed 1200×900', code: 'W-F-1209', liteCount: 1 },
  { type: 'fixed', widthMm: 1800, heightMm: 1200, sillHeightMm: 900, label: 'Fixed 1800×1200', code: 'W-F-1812', liteCount: 1 },
  { type: 'louver', widthMm: 600, heightMm: 600, sillHeightMm: 900, label: 'Louvre 600×600', code: 'W-L-0606', liteCount: 1 },
  { type: 'louver', widthMm: 900, heightMm: 600, sillHeightMm: 900, label: 'Louvre 900×600', code: 'W-L-0906', liteCount: 1 },
  { type: 'louver', widthMm: 1200, heightMm: 900, sillHeightMm: 900, label: 'Louvre 1200×900', code: 'W-L-1209', liteCount: 2 },
  { type: 'casement', widthMm: 600, heightMm: 600, sillHeightMm: 300, label: 'Bathroom Casement 600×600', code: 'W-C-0606-B', liteCount: 1 },
  { type: 'casement', widthMm: 900, heightMm: 600, sillHeightMm: 300, label: 'Bathroom Casement 900×600', code: 'W-C-0906-B', liteCount: 1 },
  { type: 'louver', widthMm: 900, heightMm: 600, sillHeightMm: 300, label: 'Bathroom Louvre 900×600', code: 'W-L-0906-B', liteCount: 1 },
]

const SANITARY: SanitarySpec[] = [
  { type: 'wc', widthMm: 360, depthMm: 700, label: 'WC Pan', clearanceFrontMm: 600 },
  { type: 'wc', widthMm: 400, depthMm: 750, label: 'WC Pan Wide', clearanceFrontMm: 600 },
  { type: 'basin', widthMm: 550, depthMm: 450, label: 'Basin Small', clearanceFrontMm: 550 },
  { type: 'basin', widthMm: 600, depthMm: 500, label: 'Basin Standard', clearanceFrontMm: 550 },
  { type: 'basin', widthMm: 900, depthMm: 500, label: 'Basin Double', clearanceFrontMm: 550 },
  { type: 'shower', widthMm: 800, depthMm: 800, label: 'Shower 800×800', clearanceFrontMm: 600 },
  { type: 'shower', widthMm: 900, depthMm: 900, label: 'Shower 900×900', clearanceFrontMm: 600 },
  { type: 'shower', widthMm: 1200, depthMm: 900, label: 'Shower Walk-in 1200×900', clearanceFrontMm: 600 },
  { type: 'bath', widthMm: 1500, depthMm: 700, label: 'Bath 1500', clearanceFrontMm: 600 },
  { type: 'bath', widthMm: 1700, depthMm: 750, label: 'Bath 1700', clearanceFrontMm: 600 },
  { type: 'bath', widthMm: 1800, depthMm: 800, label: 'Bath 1800', clearanceFrontMm: 600 },
  { type: 'kitchen-sink', widthMm: 800, depthMm: 500, label: 'Kitchen Sink Single', clearanceFrontMm: 600 },
  { type: 'kitchen-sink', widthMm: 1000, depthMm: 550, label: 'Kitchen Sink 1.5 Bowl', clearanceFrontMm: 600 },
  { type: 'kitchen-sink', widthMm: 1200, depthMm: 550, label: 'Kitchen Sink Double', clearanceFrontMm: 600 },
  { type: 'urinal', widthMm: 350, depthMm: 350, label: 'Urinal Stall', clearanceFrontMm: 500 },
  { type: 'urinal', widthMm: 700, depthMm: 350, label: 'Urinal Trough', clearanceFrontMm: 500 },
  { type: 'bidet', widthMm: 360, depthMm: 600, label: 'Bidet', clearanceFrontMm: 500 },
]

const STAIRS: StairSpec[] = [
  { type: 'straight', minWidthMm: 900, maxRiseMm: 200, minGoingMm: 250, minHeadroomMm: 2100 },
  { type: 'straight', minWidthMm: 1100, maxRiseMm: 190, minGoingMm: 260, minHeadroomMm: 2100 },
  { type: 'straight', minWidthMm: 1500, maxRiseMm: 180, minGoingMm: 280, minHeadroomMm: 2200 },
  { type: 'l-shaped', minWidthMm: 900, maxRiseMm: 200, minGoingMm: 250, minHeadroomMm: 2100 },
  { type: 'l-shaped', minWidthMm: 1100, maxRiseMm: 190, minGoingMm: 260, minHeadroomMm: 2100 },
  { type: 'u-shaped', minWidthMm: 1100, maxRiseMm: 190, minGoingMm: 260, minHeadroomMm: 2100 },
  { type: 'u-shaped', minWidthMm: 1500, maxRiseMm: 180, minGoingMm: 280, minHeadroomMm: 2200 },
  { type: 'spiral', minWidthMm: 1400, maxRiseMm: 220, minGoingMm: 200, minHeadroomMm: 2100 },
  { type: 'spiral', minWidthMm: 1600, maxRiseMm: 200, minGoingMm: 220, minHeadroomMm: 2200 },
]

export const CATALOG: ComponentCatalog = {
  doors: DOORS,
  windows: WINDOWS,
  sanitary: SANITARY,
  stairs: STAIRS,
}

export function getDoors(filter?: ComponentFilter): DoorSpec[] {
  let result = DOORS
  if (filter?.type) result = result.filter(d => d.type === filter.type)
  if (filter?.minWidthMm) result = result.filter(d => d.widthMm >= filter.minWidthMm!)
  if (filter?.maxWidthMm) result = result.filter(d => d.widthMm <= filter.maxWidthMm!)
  return result
}

export function getWindows(filter?: ComponentFilter): WindowSpec[] {
  let result = WINDOWS
  if (filter?.type) result = result.filter(w => w.type === filter.type)
  if (filter?.minWidthMm) result = result.filter(w => w.widthMm >= filter.minWidthMm!)
  if (filter?.maxWidthMm) result = result.filter(w => w.widthMm <= filter.maxWidthMm!)
  return result
}

export function getSanitary(filter?: ComponentFilter): SanitarySpec[] {
  let result = SANITARY
  if (filter?.type) result = result.filter(s => s.type === filter.type)
  return result
}

export function getStairs(filter?: ComponentFilter): StairSpec[] {
  let result = STAIRS
  if (filter?.type) result = result.filter(s => s.type === filter.type)
  return result
}

export function findDoorByCode(code: string): DoorSpec | undefined {
  return DOORS.find(d => d.code === code)
}

export function findWindowByCode(code: string): WindowSpec | undefined {
  return WINDOWS.find(w => w.code === code)
}

export function findClosestDoor(widthMm: number): DoorSpec {
  return DOORS.reduce((best, d) =>
    Math.abs(d.widthMm - widthMm) < Math.abs(best.widthMm - widthMm) ? d : best
  )
}

export function findClosestWindow(widthMm: number): WindowSpec {
  return WINDOWS.reduce((best, w) =>
    Math.abs(w.widthMm - widthMm) < Math.abs(best.widthMm - widthMm) ? w : best
  )
}

export function getDoorCount(): number { return DOORS.length }
export function getWindowCount(): number { return WINDOWS.length }
export function getSanitaryCount(): number { return SANITARY.length }
export function getStairCount(): number { return STAIRS.length }
export function getTotalComponentCount(): number {
  return DOORS.length + WINDOWS.length + SANITARY.length + STAIRS.length
}
