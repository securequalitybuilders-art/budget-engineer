type CaptureFn = () => string | null

let _capture: CaptureFn | null = null

export function registerSnapshotCapture(fn: CaptureFn): void {
  _capture = fn
}

export function unregisterSnapshotCapture(): void {
  _capture = null
}

export function captureSnapshot(): string | null {
  return _capture ? _capture() : null
}

const MIN_DATA_URL_LENGTH = 30

export function isValidPngDataUrl(url: string | undefined | null): url is string {
  return typeof url === 'string' && url.startsWith('data:image/png;base64,') && url.length > MIN_DATA_URL_LENGTH
}
