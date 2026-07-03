import { describe, it, expect } from 'vitest'
import { detectTypology, getAllTypologies, getTypology } from '@/engine/typology-kb'
import { detectClimate } from '@/engine/climate-kb'
import { detectHeritage } from '@/engine/heritage-kb'
import { parseBrief } from '@/engine/parseBrief'

describe('Tier 1 — Typology KB', () => {
  it('all 14 typologies are defined with required fields', () => {
    const all = getAllTypologies()
    expect(all.length).toBe(14)
    for (const t of all) {
      expect(t.id).toBeTruthy()
      expect(t.displayName).toBeTruthy()
      expect(t.aliases.length).toBeGreaterThan(0)
      expect(t.sans10400Class).toBeTruthy()
      expect(t.zbcClass).toBeTruthy()
      expect(t.defaultStoreys).toBeGreaterThan(0)
      expect(t.defaultProgram.length).toBeGreaterThan(0)
      expect(t.notes).toBeTruthy()
    }
  })

  it('getTypology returns a typology by id', () => {
    const house = getTypology('house-residential')
    expect(house).toBeDefined()
    expect(house!.displayName).toContain('House')
  })

  it('getTypology returns undefined for unknown id', () => {
    expect(getTypology('nonexistent')).toBeUndefined()
  })

  it('detectTypology maps "clinic" text to clinic-health', () => {
    const result = detectTypology('I need a clinic in a rural area')
    expect(result.typology).not.toBeNull()
    expect(result.typology!.id).toBe('clinic-health')
    expect(result.confidence).toBeGreaterThanOrEqual(0.1)
  })

  it('detectTypology maps "hotel" text to hotel-fullservice', () => {
    const result = detectTypology('Build a 20-room hotel with restaurant')
    expect(result.typology).not.toBeNull()
    expect(result.typology!.id).toBe('hotel-fullservice')
  })

  it('detectTypology maps "school" to school-classroom', () => {
    const result = detectTypology('A primary school with 6 classrooms')
    expect(result.typology).not.toBeNull()
    expect(result.typology!.id).toBe('school-classroom')
  })

  it('detectTypology maps "house" to house-residential', () => {
    const result = detectTypology('3 bedroom house with garage')
    expect(result.typology).not.toBeNull()
    expect(result.typology!.id).toBe('house-residential')
  })

  it('detectTypology returns null for gibberish', () => {
    const result = detectTypology('asdf zxcv qwerty')
    expect(result.typology).toBeNull()
    expect(result.confidence).toBe(0)
  })
})

describe('Tier 1 — Climate KB', () => {
  it('detectClimate returns HARARE_Highveld for Harare text', () => {
    const zone = detectClimate('Building a house in Harare with 3 bedrooms')
    expect(zone.id).toBe('HARARE_Highveld')
  })

  it('detectClimate returns VICFALLS_Lowveld for Victoria Falls', () => {
    const zone = detectClimate('A lodge near Victoria Falls')
    expect(zone.id).toBe('VICFALLS_Lowveld')
  })

  it('detectClimate returns GENERIC for unknown location', () => {
    const zone = detectClimate('A building somewhere in the mountains')
    expect(zone.id).toBe('GENERIC_Zimbabwe')
  })
})

describe('Tier 1 — Heritage KB', () => {
  it('detectHeritage picks veranda pattern for veranda text', () => {
    const pattern = detectHeritage('A house with a wide veranda')
    expect(pattern).not.toBeNull()
    expect(pattern!.id).toBe('veranda')
  })

  it('detectHeritage picks kraal for kraal text', () => {
    const pattern = detectHeritage('Traditional kraal with courtyard')
    expect(pattern).not.toBeNull()
    expect(pattern!.id).toBe('kraal')
  })

  it('detectHeritage returns null for unrelated text', () => {
    const pattern = detectHeritage('A modern glass office building')
    expect(pattern).toBeNull()
  })
})

describe('Tier 1 — parseBrief', () => {
  it('returns a full Tier1ParsedBrief for a reasonable brief', () => {
    const result = parseBrief('Build a 3-bedroom clinic in Harare on a 20x30 site with $80,000 budget')
    expect(result.typology).not.toBeNull()
    expect(result.typologyConfidence).toBeGreaterThan(0)
    expect(result.climateZone).not.toBeNull()
    expect(result.climateZone!.id).toBe('HARARE_Highveld')
    expect(result.siteInfo.widthM).toBe(20)
    expect(result.siteInfo.depthM).toBe(30)
    expect(result.siteInfo.areaM2).toBe(600)
    expect(result.constraints.budgetUsd).toBe(80000)
    expect(result.program.length).toBeGreaterThan(0)
    expect(result.qualityGate).toBeDefined()
    expect(result.qualityGate.score).toBeGreaterThanOrEqual(0)
    expect(typeof result.qualityGate.passed).toBe('boolean')
  })

  it('quality gate passes a reasonable brief', () => {
    const result = parseBrief('Build a 3-bedroom house in Harare on a 20x30 site with $80,000 budget. Include veranda.')
    expect(result.qualityGate.passed).toBe(true)
    expect(result.qualityGate.score).toBeGreaterThanOrEqual(70)
    expect(result.qualityGate.issues.length).toBeGreaterThan(0)
    expect(result.qualityGate.recommendations.length).toBeGreaterThan(0)
  })

  it('quality gate flags an obviously bad brief', () => {
    const result = parseBrief('Build a 100-bedroom hotel on a 5x5 site with $2,000 budget')
    // Typology might still be detected
    expect(result.qualityGate.score).toBeLessThanOrEqual(85)
    const hasSiteIssue = result.qualityGate.issues.some((i) =>
      i.message.includes('small') || i.message.includes('tight'),
    )
    expect(hasSiteIssue).toBe(true)
  })

  it('UI override forces clinic typology even when text is vague', () => {
    const result = parseBrief('Build something on a 20x30 site', { buildingType: 'clinic' })
    expect(result.typology).not.toBeNull()
    expect(result.typology!.id).toBe('clinic-health')
    expect(result.typologyConfidence).toBeGreaterThanOrEqual(0.95)
  })

  it('falls back gracefully on empty text', () => {
    const result = parseBrief('')
    expect(result).toBeDefined()
    expect(result.qualityGate.passed).toBe(false)
    expect(result.qualityGate.score).toBeLessThan(70)
    expect(result.typology).toBeNull()
    expect(result.climateZone).not.toBeNull() // still gets generic climate
    expect(result.program.length).toBe(0)
  })

  it('falls back gracefully on garbage text', () => {
    const result = parseBrief('zxcvbnm asdfghjkl qwertyuiop')
    expect(result).toBeDefined()
    expect(result.qualityGate.passed).toBe(false)
    expect(result.typology).toBeNull()
  })

  it('detects heritage pattern when mentioned', () => {
    const result = parseBrief('A rondavel-style house near Victoria Falls with veranda', { buildingType: 'house' })
    expect(result.heritagePattern).not.toBeNull()
    expect(result.heritagePattern!.id).toBe('rondavel')
  })

  it('extracts site dimensions from area notation', () => {
    const result = parseBrief('A school on a 120 sqm site')
    expect(result.siteInfo.areaM2).toBe(120)
    expect(result.siteInfo.widthM).not.toBeNull()
  })
})
