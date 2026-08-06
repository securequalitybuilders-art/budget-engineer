import type { SiteContext } from '@/domain/site'

const STORAGE_KEY = (pid: string) => `site-analysis-${pid}`

export function loadSiteContext(projectId: string): SiteContext | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(projectId))
    if (raw) return JSON.parse(raw) as SiteContext
  } catch { /* ignore */ }
  return null
}

export function persistSiteContext(projectId: string, site: SiteContext): void {
  try {
    localStorage.setItem(STORAGE_KEY(projectId), JSON.stringify(site))
  } catch { /* ignore */ }
}
