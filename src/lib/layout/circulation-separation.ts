import type { BuildingChassis, CirculationModel, RouteSegment, RouteType } from './vertical-chassis'

const uid = () => Math.random().toString(36).slice(2, 10)

// ── Circulation separation types ───────────────────────────────

export interface CirculationSeparationResult {
  separated: boolean
  publicOnly: string[]
  privateOnly: string[]
  sharedRoutes: string[]
  warnings: string[]
}

export interface RouteGroup {
  type: RouteType
  segments: RouteSegment[]
  isolatable: boolean
}

// ── Separation validation ─────────────────────────────────────

export function validateCirculationSeparation(chassis: BuildingChassis): CirculationSeparationResult {
  const warnings: string[] = []
  const sharedRoutes: string[] = []

  if (!chassis.circulationModel.separated) {
    return { separated: false, publicOnly: [], privateOnly: [], sharedRoutes: [], warnings: [] }
  }

  const { publicRoutes, privateRoutes, serviceRoutes, emergencyRoutes } = chassis.circulationModel

  const allRoutes = [...publicRoutes, ...privateRoutes, ...serviceRoutes, ...emergencyRoutes]

  // Check that public and private don't share via nodes
  for (const pub of publicRoutes) {
    for (const priv of privateRoutes) {
      const shared = pub.via.filter(v => priv.via.includes(v))
      if (shared.length > 0) {
        sharedRoutes.push(`Public→Private: "${shared.join(', ')}"`)
        if (!priv.protected) {
          warnings.push(
            `Public route "${pub.id}" and private route "${priv.id}" share "${shared[0]}" — residential access should not depend on retail/public flow`,
          )
        }
      }
    }
  }

  // Check that service routes don't cut through private zones
  for (const svc of serviceRoutes) {
    for (const priv of privateRoutes) {
      const shared = svc.via.filter(v => priv.via.includes(v))
      if (shared.length > 0) {
        sharedRoutes.push(`Service→Private: "${shared.join(', ')}"`)
        warnings.push(
          `Service route "${svc.id}" passes through private route "${priv.id}" via "${shared[0]}" — service routes must not cut through private residential zones`,
        )
      }
    }
  }

  // Check emergency routes are separate
  for (const em of emergencyRoutes) {
    if (!em.protected) {
      warnings.push(`Emergency route "${em.id}" is not a protected route`)
    }
  }

  const publicOnly = publicRoutes.map(r => r.id).filter(
    id => !privateRoutes.some(p => p.via.some(v => allRoutes.find(r => r.id === id)?.via.includes(v))),
  )
  const privateOnly = privateRoutes.map(r => r.id).filter(
    id => !publicRoutes.some(p => p.via.some(v => allRoutes.find(r => r.id === id)?.via.includes(v))),
  )

  return {
    separated: warnings.length === 0,
    publicOnly,
    privateOnly,
    sharedRoutes,
    warnings,
  }
}

// ── Circulation model builder for mixed-use ───────────────────

export function buildMixedUseCirculation(chassis: BuildingChassis): CirculationModel {
  const model: CirculationModel = {
    publicRoutes: [],
    privateRoutes: [],
    serviceRoutes: [],
    emergencyRoutes: [],
    separated: true,
  }

  // Ground floor: public retail routes
  model.publicRoutes.push({
    id: uid(),
    from: 'ground-retail',
    to: 'ground-exit',
    via: ['retail-floor', 'main-entrance'],
    routeType: 'public',
    protected: false,
  })

  // Upper floors: private residential routes
  if (chassis.storeyCount >= 2) {
    const stairCore = chassis.cores.find(c => c.hasStair)
    const coreVia = stairCore ? [stairCore.id] : ['stair-core']

    model.privateRoutes.push({
      id: uid(),
      from: 'upper-residential',
      to: 'ground-exit',
      via: [...coreVia, 'ground-lobby'],
      routeType: 'private',
      protected: true,
    })
  }

  // Service routes
  model.serviceRoutes.push({
    id: uid(),
    from: 'service-core',
    to: 'service-exit',
    via: ['service-corridor', 'back-of-house'],
    routeType: 'service',
    protected: false,
  })

  // Emergency routes
  if (chassis.storeyCount >= 2) {
    for (const core of chassis.cores.filter(c => c.hasStair)) {
      model.emergencyRoutes.push({
        id: uid(),
        from: `floor-${core.id}`,
        to: 'ground-safe-area',
        via: [core.id, 'ground-exit'],
        routeType: 'emergency',
        protected: true,
      })
    }
  }

  return model
}

// ── Shared via detection ──────────────────────────────────────

export function findSharedCirculationNodes(
  model: CirculationModel,
): { node: string; routes: string[] }[] {
  const nodeMap = new Map<string, string[]>()

  for (const route of [...model.publicRoutes, ...model.privateRoutes, ...model.serviceRoutes]) {
    for (const node of route.via) {
      const existing = nodeMap.get(node) || []
      existing.push(route.id)
      nodeMap.set(node, existing)
    }
  }

  const shared: { node: string; routes: string[] }[] = []
  for (const [node, routes] of nodeMap) {
    const types = new Set(routes)
    if (types.size > 1) {
      shared.push({ node, routes })
    }
  }

  return shared
}
