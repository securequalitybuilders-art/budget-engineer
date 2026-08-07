import type { SiteContext } from '@/domain/site'

const STORAGE_KEY = (pid: string) => `site-analysis-${pid}`

export interface SiteDimensions {
  siteWidthM: number
  siteDepthM: number
}

/** Derives pipeline site dimensions from a captured site context plot boundary.
 *  Falls back to 15m x 20m when no context or boundary exists. */
export function deriveSiteDimensions(site: SiteContext | null): SiteDimensions {
  const plot = site?.plotBoundary ?? []
  let siteWidthM = plot.length > 0 ? Math.max(...plot.map((p) => p.x)) : 15
  let siteDepthM = plot.length > 0 ? Math.max(...plot.map((p) => p.y)) : 20
  if (!Number.isFinite(siteWidthM) || siteWidthM <= 0) siteWidthM = 15
  if (!Number.isFinite(siteDepthM) || siteDepthM <= 0) siteDepthM = 20
  return { siteWidthM, siteDepthM }
}

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
