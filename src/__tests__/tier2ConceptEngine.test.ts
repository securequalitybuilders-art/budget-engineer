import { describe, it, expect } from 'vitest'
import { generateDesignConcept } from '@/engine/tier2/conceptEngine'
import { parseBrief } from '@/engine/parseBrief'
import { getAllTypologies } from '@/engine/typology-kb'

function hotelBrief() {
  return parseBrief(
    'Build a 20-room hotel with restaurant and pool in Victoria Falls on a 40x60 site with $500,000 budget. Veranda and courtyard style.',
    { buildingType: 'hotel' },
  )
}

function clinicBrief() {
  return parseBrief(
    'Build a clinic in Harare with 4 consultation rooms and a pharmacy on a 25x30 site.',
    { buildingType: 'clinic' },
  )
}

function houseBrief() {
  return parseBrief(
    'Build a 3-bedroom house with veranda in Harare on a 20x25 site with $60,000 budget.',
    { buildingType: 'house' },
  )
}

describe('Tier 2 - generateDesignConcept', () => {
  it('returns a complete DesignConcept for a HOTEL brief', () => {
    const brief = hotelBrief()
    const concept = generateDesignConcept(brief)
    expect(concept).toBeDefined()
    expect(concept.philosophy.statement.length).toBeGreaterThan(10)
    expect(concept.philosophy.aaltoPrinciple.length).toBeGreaterThan(10)
    expect(concept.philosophy.andoPrinciple.length).toBeGreaterThan(10)
    expect(concept.philosophy.chipperfieldPrinciple.length).toBeGreaterThan(10)
    expect(concept.philosophy.africanPrinciple.length).toBeGreaterThan(10)
    expect(concept.strategy.spatialOrganization).toContain('courtyard')
    expect(concept.strategy.spatialOrganization).toContain('lobby')
    expect(concept.massing.materialPalette.length).toBeGreaterThanOrEqual(2)
    expect(concept.massing.colorPalette.length).toBeGreaterThanOrEqual(2)
    expect(concept.precedents.african.length).toBeGreaterThan(0)
    expect(concept.precedents.modern.length).toBeGreaterThan(0)
    expect(concept.precedents.local.length).toBeGreaterThan(0)
    expect(concept.precedents.climate.length).toBeGreaterThan(0)
    expect(concept.qualityMetrics.daylightTarget).toContain('%')
    expect(concept.qualityMetrics.ventilationTarget).toContain('%')
    expect(concept.qualityMetrics.thermalComfortTarget).toContain('%')
  })

  it('different typologies yield different philosophy and strategy', () => {
    const hotel = generateDesignConcept(hotelBrief())
    const clinic = generateDesignConcept(clinicBrief())
    const house = generateDesignConcept(houseBrief())
    expect(hotel.strategy.spatialOrganization).not.toBe(clinic.strategy.spatialOrganization)
    expect(clinic.strategy.spatialOrganization).not.toBe(house.strategy.spatialOrganization)
    expect(hotel.strategy.privacyGradient).not.toBe(clinic.strategy.privacyGradient)
    expect(hotel.massing.materialPalette.join(' ')).not.toBe(clinic.massing.materialPalette.join(' '))
  })

  it('climate zone drives site analysis', () => {
    const harare = generateDesignConcept(houseBrief())
    const vicFalls = generateDesignConcept(hotelBrief())
    expect(harare.siteAnalysis.solarResponse).toContain('600')
    expect(vicFalls.siteAnalysis.solarResponse).toContain('1200')
    expect(vicFalls.siteAnalysis.solarResponse).toContain('Deep')
  })

  it('heritage pattern appears in heritageIntegration', () => {
    const withHeritage = parseBrief(
      'Build a rondavel-style guest lodge near Victoria Falls with veranda',
      { buildingType: 'hotel' },
    )
    const concept = generateDesignConcept(withHeritage)
    expect(concept.strategy.heritageIntegration.length).toBeGreaterThan(10)
    expect(concept.strategy.heritageIntegration.toLowerCase()).toContain('rondavel')
  })

  it('every supported typology produces a complete, non-empty concept', () => {
    const all = getAllTypologies()
    for (const t of all) {
      const brief = parseBrief('Build a ' + t.displayName.toLowerCase() + ' in Harare on a 20x30 site', {
        buildingType: t.id.split('-')[0],
      })
      const concept = generateDesignConcept(brief)
      expect(concept.philosophy.statement, t.id + ': philosophy').toBeTruthy()
      expect(concept.strategy.spatialOrganization, t.id + ': spatial').toBeTruthy()
      expect(concept.strategy.privacyGradient, t.id + ': privacy').toBeTruthy()
      expect(concept.siteAnalysis.orientation, t.id + ': orientation').toBeTruthy()
      expect(concept.circulation.publicPath, t.id + ': circulation').toBeTruthy()
      expect(concept.massing.primaryForm, t.id + ': form').toBeTruthy()
      expect(concept.massing.materialPalette.length, t.id + ': materials').toBeGreaterThan(0)
      expect(concept.massing.colorPalette.length, t.id + ': colors').toBeGreaterThan(0)
      expect(concept.precedents.african.length, t.id + ': african').toBeGreaterThan(0)
      expect(concept.qualityMetrics.daylightTarget, t.id + ': quality').toContain('%')
    }
  })

  it('qualityMetrics has numeric targets present', () => {
    const concept = generateDesignConcept(houseBrief())
    expect(concept.qualityMetrics.daylightTarget).toMatch(/\d+%/)
    expect(concept.qualityMetrics.ventilationTarget).toMatch(/\d+%/)
    expect(concept.qualityMetrics.thermalComfortTarget).toMatch(/\d+%/)
  })
})
