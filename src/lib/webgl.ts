export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return false
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}
