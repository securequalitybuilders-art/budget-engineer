import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/db'
import type { BOQ } from '@/types'
import type { Provider } from '@/domain/marketplace'
import type { MatchableSupplier } from '@/engine/dispatch/jitDispatchEngine'
import { pointInPolygon, centroid } from '@/engine/dispatch/jitDispatchEngine'
import {
  boqToDispatchLines,
  cancelDispatch,
  createDispatchFromBoq,
  disputeHold,
  dispatchSummary,
  enterSiteGeofence,
  estimateRouteKm,
  leaveSupplierYard,
  listDispatchOrders,
  listEscrowHolds,
  resolveHold,
  siteGeofenceAround,
  transitionOrder,
  verifyAndRelease,
  DEFAULT_SITE,
} from '@/lib/dispatch/dispatchActions'

const provider: Provider = {
  id: 'sup-1',
  name: 'Brick Co',
  type: 'supplier',
  email: '',
  phone: '',
  location: { address: '', city: 'Harare', country: 'ZW', coordinates: [-17.75, 31.1] },
  registrationDate: '',
  verificationStatus: 'verified',
  rating: 4.5,
  completedProjects: 12,
  totalContractValue: 500_000,
  credentials: [],
  catalog: [],
  services: [],
  portfolio: [],
  reviews: [],
  insurance: [],
  availability: { status: 'available', regions: [], preferredProjectTypes: [] },
}

const boq: BOQ = {
  id: 'boq-1',
  projectId: 'proj-1',
  designId: 'd1',
  sections: [
    {
      id: 's1',
      code: 'A',
      title: 'Materials',
      items: [
        { id: 'i1', description: 'Portland cement 50kg', quantity: 200, unit: 'bag', rateCents: 1850, totalCents: 370000, elementIds: [], source: 'manual' as const, aiConfidence: 1 },
        { id: 'i2', description: 'Steel rebar Y16', quantity: 40, unit: 'm', rateCents: 950, totalCents: 38000, elementIds: [], source: 'manual' as const, aiConfidence: 1 },
      ],
      subtotalCents: 408000,
    },
  ],
  totalCents: 408000,
  contingencyCents: 0,
  currency: 'USD',
  generatedAt: new Date().toISOString(),
}

beforeEach(async () => {
  await db.dispatchOrders.clear()
  await db.dispatchHolds.clear()
})

describe('dispatch actions — BOQ to order', () => {
  it('maps BOQ sections and items into dispatch lines', () => {
    const lines = boqToDispatchLines(boq)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatchObject({
      description: 'Portland cement 50kg',
      quantity: 200,
      unit: 'bag',
      unitCostCents: 1850,
      totalCents: 370000,
    })
    expect(lines[1].totalCents).toBe(38000)
  })

  it('creates a dispatch order and escrow hold from a BOQ', async () => {
    const { order, hold } = await createDispatchFromBoq({
      projectId: 'proj-1',
      projectName: 'Duplex',
      boq,
      provider,
    })
    expect(order.state).toBe('pending')
    expect(order.supplierName).toBe('Brick Co')
    expect(order.projectName).toBe('Duplex')
    expect(order.totalCents).toBe(408000)
    expect(order.lines).toHaveLength(2)
    expect(order.routeKm).toBeGreaterThan(0)
    expect(order.siteGeofence).toHaveLength(4)
    expect(hold.orderId).toBe(order.id)
    expect(hold.status).toBe('held')
    expect(hold.amountCents).toBe(408000)
    expect(hold.gpsVerified).toBe(false)
    expect(hold.engineerSignoff).toBe(false)
    expect(await listDispatchOrders()).toHaveLength(1)
    expect(await listEscrowHolds()).toHaveLength(1)
  })

  it('refuses to dispatch a BOQ with no line items', async () => {
    const emptyBoq: BOQ = { ...boq, sections: [] }
    await expect(
      createDispatchFromBoq({ projectId: 'proj-1', boq: emptyBoq, provider }),
    ).rejects.toThrow('no line items')
  })
})

describe('dispatch actions — lifecycle', () => {
  let orderId: string
  beforeEach(async () => {
    const { order } = await createDispatchFromBoq({ projectId: 'proj-1', boq, provider })
    orderId = order.id
  })

  it('accepts a pending order', async () => {
    const next = await transitionOrder(orderId, 'accepted', 'Supplier accepted')
    expect(next.state).toBe('accepted')
    expect(next.acceptedAt).toBeTruthy()
  })

  it('rejects illegal transitions', async () => {
    await expect(transitionOrder(orderId, 'delivered')).rejects.toThrow('Illegal dispatch transition')
  })

  it('cancels a pending order with a reason', async () => {
    const next = await cancelDispatch(orderId, 'No stock')
    expect(next.state).toBe('cancelled')
    expect(next.cancelReason).toBe('No stock')
  })

  it('GPS simulation moves accepted → en-route → arrived', async () => {
    await transitionOrder(orderId, 'accepted')
    const left = await leaveSupplierYard(orderId)
    expect(left).toBe('en-route')
    const arrived = await enterSiteGeofence(orderId)
    expect(arrived).toBe('arrived')
  })

  it('verifies GPS + sign-off and releases escrow on completion', async () => {
    await transitionOrder(orderId, 'accepted')
    await leaveSupplierYard(orderId)
    await enterSiteGeofence(orderId)
    await transitionOrder(orderId, 'delivered')
    const { hold, order } = await verifyAndRelease(orderId, 'qs-mary')
    expect(order.state).toBe('completed')
    expect(order.completedAt).toBeTruthy()
    expect(hold.status).toBe('released')
    expect(hold.gpsVerified).toBe(true)
    expect(hold.engineerSignoff).toBe(true)
    expect(hold.signoffBy).toBe('qs-mary')
    expect(hold.releasedAt).toBeTruthy()
  })
})

describe('dispatch actions — disputes', () => {
  it('raises a dispute that freezes the escrow hold', async () => {
    const { order, hold } = await createDispatchFromBoq({ projectId: 'proj-1', boq, provider })
    const disputed = await disputeHold(order.id, {
      type: 'shortage',
      reason: 'Only 150 of 200 bags delivered',
      raisedBy: 'site-engineer',
    })
    expect(disputed.status).toBe('disputed')
    expect(disputed.dispute?.type).toBe('shortage')
    expect(disputed.dispute?.resolved).toBe(false)
    expect(disputed.disputeRelease?.immediateCents).toBe(Math.round(408000 * 0.9))
    expect(hold.status).toBe('held')
  })

  it('resolves a dispute and marks it resolved', async () => {
    const { order } = await createDispatchFromBoq({ projectId: 'proj-1', boq, provider })
    await disputeHold(order.id, { type: 'quality', reason: 'Cracked units', raisedBy: 'qs' })
    const resolved = await resolveHold(order.id)
    expect(resolved.dispute?.resolved).toBe(true)
    expect(resolved.dispute?.resolvedAt).toBeTruthy()
  })
})

describe('dispatch actions — summary + geofence', () => {
  it('summarises orders and escrow holds', async () => {
    const { order } = await createDispatchFromBoq({ projectId: 'proj-1', boq, provider })
    const other = await createDispatchFromBoq({ projectId: 'proj-2', boq, provider })
    await transitionOrder(order.id, 'accepted')
    await leaveSupplierYard(order.id)
    await enterSiteGeofence(order.id)
    await transitionOrder(order.id, 'delivered')
    await verifyAndRelease(order.id)
    await cancelDispatch(other.order.id, 'Cancelled')
    const summary = dispatchSummary(await listDispatchOrders(), await listEscrowHolds())
    expect(summary.total).toBe(2)
    expect(summary.active).toBe(0)
    expect(summary.completed).toBe(1)
    expect(summary.cancelled).toBe(1)
    expect(summary.releasedValue).toBe(408000)
  })

  it('builds a site geofence polygon around the default site', () => {
    const fence = siteGeofenceAround()
    expect(fence).toHaveLength(4)
    expect(pointInPolygon(centroid(fence), fence)).toBe(true)
    expect(pointInPolygon(DEFAULT_SITE, fence)).toBe(true)
  })

  it('estimates route distance from supplier to site', () => {
    const supplier: MatchableSupplier = {
      id: 's',
      name: 'Far store',
      location: { lat: DEFAULT_SITE.lat + 0.2, lng: DEFAULT_SITE.lng + 0.2 },
      quoteCents: 100,
      rating: 4,
      reliabilityScore: 80,
    }
    const km = estimateRouteKm(supplier, siteGeofenceAround())
    expect(km).toBeGreaterThan(10)
  })
})
