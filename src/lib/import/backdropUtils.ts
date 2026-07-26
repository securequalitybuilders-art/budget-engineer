export interface BackdropState {
  imageDataUrl: string | null
  opacity: number
  visible: boolean
  pxPerMetre: number | null
  naturalWidth: number
  naturalHeight: number
}

export function createInitialBackdropState(): BackdropState {
  return {
    imageDataUrl: null,
    opacity: 0.3,
    visible: true,
    pxPerMetre: null,
    naturalWidth: 0,
    naturalHeight: 0,
  }
}

export function calibrateScale(referencePx: number, referenceMetres: number): number {
  if (referenceMetres <= 0) return 0
  return referencePx / referenceMetres
}

export function pixelsToMetres(px: number, pxPerMetre: number): number {
  if (pxPerMetre <= 0) return 0
  return px / pxPerMetre
}

export function metresToPixels(metres: number, pxPerMetre: number): number {
  return metres * pxPerMetre
}

export interface ScaleCalibration {
  pxPerMetre: number
  referencePx: number
  referenceMetres: number
}

export function computeScaleCalibration(
  imageNaturalWidth: number,
  imageNaturalHeight: number,
  knownWidthMetres: number,
  knownHeightMetres: number,
): ScaleCalibration | null {
  if (imageNaturalWidth <= 0 || imageNaturalHeight <= 0) return null
  if (knownWidthMetres <= 0 || knownHeightMetres <= 0) return null
  const pxPerMetreW = imageNaturalWidth / knownWidthMetres
  const pxPerMetreH = imageNaturalHeight / knownHeightMetres
  const pxPerMetre = (pxPerMetreW + pxPerMetreH) / 2
  return {
    pxPerMetre,
    referencePx: (imageNaturalWidth + imageNaturalHeight) / 2,
    referenceMetres: (knownWidthMetres + knownHeightMetres) / 2,
  }
}
