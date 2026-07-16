import { db } from '@/db/db'
import type { ProcurementRequest } from '@/domain/procurement'

export type LinkedBOQInfo = {
  boqLineIds: string[]
  boqLineDescriptions: string[]
  totalLinkedCostCents: number
}

export async function enrichProcurementWithBOQLinks(requests: ProcurementRequest[]): Promise<(ProcurementRequest & { linkedBOQInfo: LinkedBOQInfo })[]> {
  const allBOQLineIds = new Set(requests.flatMap((r) => r.linkedBOQLineIds))
  if (allBOQLineIds.size === 0) {
    return requests.map((r) => ({ ...r, linkedBOQInfo: { boqLineIds: [], boqLineDescriptions: [], totalLinkedCostCents: 0 } }))
  }

  const boqs = await db.boqs.toArray()
  const allLineItems = boqs.flatMap((b) => (b as unknown as Record<string, unknown>).lineItems as Array<Record<string, unknown>> ?? (b as unknown as Record<string, unknown>).sections as Array<Record<string, unknown>> ?? [])

  return requests.map((r) => {
    const matchedLines = allLineItems.filter((li) => r.linkedBOQLineIds.includes(li.id as string))
    return {
      ...r,
      linkedBOQInfo: {
        boqLineIds: r.linkedBOQLineIds,
        boqLineDescriptions: matchedLines.map((li) => `${li.description ?? li.name ?? 'Unknown'} (${li.quantity ?? '?'} ${li.unit ?? ''})`),
        totalLinkedCostCents: matchedLines.reduce((sum, li) => sum + ((li.totalCents as number) ?? 0), 0),
      },
    }
  })
}

export async function getBOQLinesForProcurementRequest(requestId: string): Promise<LinkedBOQInfo> {
  const request = await db.procurementRequests.get(requestId)
  if (!request) return { boqLineIds: [], boqLineDescriptions: [], totalLinkedCostCents: 0 }

  const enriched = await enrichProcurementWithBOQLinks([request])
  return enriched[0]?.linkedBOQInfo ?? { boqLineIds: [], boqLineDescriptions: [], totalLinkedCostCents: 0 }
}

export function buildProcurementBOQLinkSummary(linkedBOQLineIds: string[]): { hasLinks: boolean; linkCount: number; summary: string } {
  const linkCount = linkedBOQLineIds.length
  return {
    hasLinks: linkCount > 0,
    linkCount,
    summary: linkCount > 0 ? `${linkCount} BOQ line item(s) linked` : 'No BOQ links',
  }
}
