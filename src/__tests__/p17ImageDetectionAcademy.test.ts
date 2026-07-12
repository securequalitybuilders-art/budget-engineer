import { describe, it, expect } from 'vitest'
import { buildingFromImageDetection } from '@/adapters/canonical/building-from-image-detection'
import { gradeQuiz } from '@/lib/learning/lessonEngine'
import { QUIZ_DATA } from '@/data/skills/quiz-data'

// ── Track A: Image Detection → BuildingGraph ──────────────────

const SAMPLE_WALLS = [
  { x1: 0, y1: 0, x2: 10, y2: 0, importConfidence: 0.9 },
  { x1: 10, y1: 0, x2: 10, y2: 8, importConfidence: 0.9 },
  { x1: 10, y1: 8, x2: 0, y2: 8, importConfidence: 0.9 },
  { x1: 0, y1: 8, x2: 0, y2: 0, importConfidence: 0.9 },
  { x1: 5, y1: 0, x2: 5, y2: 8, importConfidence: 0.8 },
]

const SAMPLE_ROOMS = [
  { x: 0, y: 0, width: 5, height: 8 },
  { x: 5, y: 0, width: 5, height: 8 },
]

describe('buildingFromImageDetection', () => {
  it('returns null for empty walls', () => {
    const result = buildingFromImageDetection([], [], { pxPerMetre: 100 })
    expect(result).toBeNull()
  })

  it('creates BuildingGraph with correct wall count', () => {
    const result = buildingFromImageDetection(SAMPLE_WALLS, SAMPLE_ROOMS, { pxPerMetre: 100 })!
    expect(result.graph.walls).toHaveLength(5)
  })

  it('creates spaces for each detected room', () => {
    const result = buildingFromImageDetection(SAMPLE_WALLS, SAMPLE_ROOMS, { pxPerMetre: 100 })!
    expect(result.graph.spaces).toHaveLength(2)
  })

  it('infers programme from room area', () => {
    const result = buildingFromImageDetection(SAMPLE_WALLS, SAMPLE_ROOMS, { pxPerMetre: 100 })!
    const room = result.graph.spaces[0]
    expect(room.areaM2).toBe(40)
    expect(['living', 'bedroom', 'kitchen']).toContain(room.programme)
  })

  it('includes default finishes per programme', () => {
    const result = buildingFromImageDetection(SAMPLE_WALLS, SAMPLE_ROOMS, { pxPerMetre: 100 })!
    for (const space of result.graph.spaces) {
      expect(space.finishSpec.wallFinish).toBeTruthy()
      expect(space.finishSpec.floorFinish).toBeTruthy()
    }
  })

  it('creates fallback single room when no rooms detected', () => {
    const result = buildingFromImageDetection(SAMPLE_WALLS, [], { pxPerMetre: 100 })!
    expect(result.graph.spaces).toHaveLength(1)
    expect(result.graph.spaces[0].programme).toBe('other')
  })

  it('returns derivation metadata with image-import source', () => {
    const result = buildingFromImageDetection(SAMPLE_WALLS, SAMPLE_ROOMS, { pxPerMetre: 100 })!
    expect(result.derivation.source).toBe('image-import')
    expect(result.derivation.confidence).toBeGreaterThan(0)
  })

  it('creates a slab from wall bounding box', () => {
    const result = buildingFromImageDetection(SAMPLE_WALLS, SAMPLE_ROOMS, { pxPerMetre: 100 })!
    expect(result.graph.slabs).toHaveLength(1)
    expect(result.graph.slabs[0].thickness).toBe(0.15)
  })

  it('includes one level (Ground Floor)', () => {
    const result = buildingFromImageDetection(SAMPLE_WALLS, SAMPLE_ROOMS, { pxPerMetre: 100 })!
    expect(result.graph.levels).toHaveLength(1)
    expect(result.graph.levels[0].name).toBe('Ground Floor')
  })

  it('assigns fixture instances per programme', () => {
    const result = buildingFromImageDetection(SAMPLE_WALLS, SAMPLE_ROOMS, { pxPerMetre: 100 })!
    for (const space of result.graph.spaces) {
      expect(Array.isArray(space.fixtures)).toBe(true)
    }
  })
})

// ── Track B: Academy v2 — Quiz System ─────────────────────────

describe('gradeQuiz', () => {
  it('returns 100% when all answers correct', () => {
    const questions = QUIZ_DATA['proportion-scale']
    const result = gradeQuiz(questions, [1, 1])
    expect(result.score).toBe(100)
    expect(result.passed).toBe(true)
  })

  it('returns 50% when half correct', () => {
    const questions = QUIZ_DATA['proportion-scale']
    const result = gradeQuiz(questions, [0, 1])
    expect(result.score).toBe(50)
  })

  it('returns 0% when all wrong', () => {
    const questions = QUIZ_DATA['proportion-scale']
    const result = gradeQuiz(questions, [0, 0])
    expect(result.score).toBe(0)
    expect(result.passed).toBe(false)
  })

  it('marks as passed when score >= 70', () => {
    const questions = QUIZ_DATA['load-paths']
    const result = gradeQuiz(questions, [1, 1])
    expect(result.score).toBe(100)
    expect(result.passed).toBe(true)
  })

  it('marks as failed when score < 70', () => {
    const questions = QUIZ_DATA['load-paths']
    const result = gradeQuiz(questions, [0, 0])
    expect(result.score).toBe(0)
    expect(result.passed).toBe(false)
  })

  it('wraps answers beyond question count gracefully', () => {
    const questions = QUIZ_DATA['passive-design']
    const result = gradeQuiz(questions, [1, 1, 999])
    expect(result.total).toBe(2)
    expect(result.score).toBe(100)
  })

  it('returns zero total for empty questions', () => {
    const result = gradeQuiz([], [])
    expect(result.score).toBe(0)
    expect(result.total).toBe(0)
  })
})

describe('QUIZ_DATA coverage', () => {
  it('has quiz questions for proportion-scale', () => {
    expect(QUIZ_DATA['proportion-scale']).toBeDefined()
    expect(QUIZ_DATA['proportion-scale'].length).toBeGreaterThanOrEqual(2)
  })

  it('has quiz questions for load-paths', () => {
    expect(QUIZ_DATA['load-paths']).toBeDefined()
  })

  it('each question has valid correctIndex within options range', () => {
    for (const [lessonId, questions] of Object.entries(QUIZ_DATA)) {
      for (const q of questions) {
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThan(q.options.length)
        expect(q.explanation).toBeTruthy()
      }
    }
  })

  it('covers at least 15 lessons', () => {
    expect(Object.keys(QUIZ_DATA).length).toBeGreaterThanOrEqual(15)
  })
})
