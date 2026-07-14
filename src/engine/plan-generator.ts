import type { DesignOption } from '../domain/boq'
import type { PlanModel } from '../domain/plan'
import { getRoomProgram } from './roomPrograms'
import { isResidential } from './buildingTypes'
import { generateLayoutByTypology } from '../lib/layout/typology-router'
import { assemblePlan } from '../lib/geometry/plan-intelligence'

function normalizeFootprint(area: number) {
  const width = Math.sqrt(area * 1.18)
  const height = area / width
  return {
    width: Math.round(width * 10) / 10,
    height: Math.round(height * 10) / 10,
  }
}

function programFromArea(area: number, buildingType: string): Array<{ name: string; ratio: number }> {
  if (!isResidential(buildingType)) {
    return getRoomProgram(buildingType)
  }

  if (area <= 100) {
    return [
      { name: 'Lounge / Dining', ratio: 0.22 },
      { name: 'Kitchen', ratio: 0.1 },
      { name: 'Bedroom 1', ratio: 0.14 },
      { name: 'Bedroom 2', ratio: 0.12 },
      { name: 'Bedroom 3', ratio: 0.11 },
      { name: 'Bathroom 1', ratio: 0.07 },
      { name: 'Bathroom 2', ratio: 0.06 },
      { name: 'Circulation', ratio: 0.1 },
      { name: 'Veranda', ratio: 0.08 },
    ]
  }

  if (area <= 125) {
    return [
      { name: 'Lounge / Dining', ratio: 0.24 },
      { name: 'Kitchen', ratio: 0.11 },
      { name: 'Bedroom 1', ratio: 0.15 },
      { name: 'Bedroom 2', ratio: 0.12 },
      { name: 'Bedroom 3', ratio: 0.11 },
      { name: 'Bathroom 1', ratio: 0.07 },
      { name: 'Bathroom 2', ratio: 0.06 },
      { name: 'Study / Flex', ratio: 0.06 },
      { name: 'Circulation', ratio: 0.08 },
    ]
  }

  return [
    { name: 'Lounge / Dining', ratio: 0.23 },
    { name: 'Kitchen', ratio: 0.1 },
    { name: 'Bedroom 1', ratio: 0.14 },
    { name: 'Bedroom 2', ratio: 0.12 },
    { name: 'Bedroom 3', ratio: 0.11 },
    { name: 'Guest Room', ratio: 0.09 },
    { name: 'Bathroom 1', ratio: 0.06 },
    { name: 'Bathroom 2', ratio: 0.05 },
    { name: 'Study / Flex', ratio: 0.05 },
    { name: 'Circulation', ratio: 0.05 },
    { name: 'Veranda', ratio: 0.05 },
    { name: 'Store', ratio: 0.03 },
    { name: 'Laundry', ratio: 0.02 },
  ]
}

export function generatePlanModel(design: DesignOption): PlanModel {
  const area = design.grossFloorArea
  const buildingType = design.buildingType || 'house'
  const footprint = normalizeFootprint(area)
  const wallThickness = 0.2

  const program = programFromArea(area, buildingType)

  // Use typology-specific layout router
  const rawRooms = generateLayoutByTypology(
    buildingType,
    program,
    footprint.width,
    footprint.height,
    Date.now(),
  )

  // Convert to RoomRect format
  const rooms = rawRooms.map(r => ({
    id: r.id,
    name: r.name,
    x: Number(r.x.toFixed(2)),
    y: Number(r.y.toFixed(2)),
    width: Number(Math.max(r.width, 0.5).toFixed(2)),
    height: Number(Math.max(r.height, 0.5).toFixed(2)),
    color: ['#1d4ed8', '#0f766e', '#7c3aed', '#9a3412', '#0369a1', '#4d7c0f', '#be185d', '#b45309'][Math.floor(Math.random() * 8)],
  }))

  // Use the full assembly pipeline
  const { plan, warnings } = assemblePlan({
    rooms,
    width: footprint.width,
    height: footprint.height,
    wallThickness,
    designOptionId: design.id,
  })

  if (warnings.length > 0) {
    console.warn(`[plan-generator] ${warnings.length} warnings:`, warnings.slice(0, 5))
  }

  return plan
}
