/**
 * TEMPORARY RUNTIME DEBUG — Sprint 39B
 * Module-level observable that records the buildingType value at each stage
 * of the real UI flow. The debug panel subscribes to this so the user can
 * see WHERE 'house' first appears instead of the expected clinic/etc.
 *
 * Remove after Sprint 39B diagnosis is complete.
 */

export interface BtTrace {
  dropdownValue: string
  briefBuildingType: string
  optionsBuildingTypes: string[]
  selectedDesignBuildingType: string
  planGenBuildingType: string
  programKeyUsed: string
  firstThreeRoomNames: string[]
}

const trace: BtTrace = {
  dropdownValue: 'house',
  briefBuildingType: 'house',
  optionsBuildingTypes: [],
  selectedDesignBuildingType: 'house',
  planGenBuildingType: 'house',
  programKeyUsed: 'house',
  firstThreeRoomNames: [],
}

type Listener = () => void
const listeners = new Set<Listener>()

export function getBtTrace(): Readonly<BtTrace> {
  return trace
}

export function setBtTrace<K extends keyof BtTrace>(key: K, value: BtTrace[K]): void {
  trace[key] = value
  console.log(`[BT-DEBUG] ${key} =`, value)
  listeners.forEach((fn) => fn())
}

export function subscribeBtTrace(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
