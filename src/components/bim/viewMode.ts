export type ViewMode = 'full' | 'dollhouse' | 'noRoof' | 'walk'

export interface VisibilityState {
  showRoof: boolean
  wallOpacity: number
  showCeilings: boolean
  storeysToShow: number[] | 'all'
}

export function computeVisibility(
  viewMode: ViewMode,
  visibleStorey: number | 'all',
  storeyCount: number,
): VisibilityState {
  const storeysToShow: number[] | 'all' =
    visibleStorey === 'all'
      ? 'all'
      : [Math.max(0, Math.min(visibleStorey, storeyCount - 1))]

  switch (viewMode) {
    case 'full':
      return { showRoof: true, wallOpacity: 1, showCeilings: true, storeysToShow }
    case 'noRoof':
      return { showRoof: false, wallOpacity: 1, showCeilings: true, storeysToShow }
    case 'dollhouse':
      return { showRoof: false, wallOpacity: 0.4, showCeilings: false, storeysToShow }
    case 'walk':
      return { showRoof: false, wallOpacity: 1, showCeilings: true, storeysToShow }
  }
}
