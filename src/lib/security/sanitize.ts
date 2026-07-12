export function sanitizeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*]/g, '_')
  let result = ''
  for (let i = 0; i < cleaned.length; i++) {
    const code = cleaned.charCodeAt(i)
    if (code >= 0x20) result += cleaned[i]
  }
  return result.trim() || 'untitled'
}

export function validateTextLength(text: string, max = 10000): string {
  if (text.length > max) return text.slice(0, max)
  return text
}

export function validateNumeric(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
