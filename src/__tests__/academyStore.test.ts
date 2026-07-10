import { describe, it, expect, beforeEach } from 'vitest'
import { useAcademyStore } from '@/stores/academyStore'

beforeEach(() => {
  useAcademyStore.setState({ completedLessons: [], currentPathId: null, currentLessonId: null })
})

describe('academyStore', () => {
  it('starts with no completed lessons', () => {
    expect(useAcademyStore.getState().completedLessons).toEqual([])
  })

  it('completes a lesson', () => {
    useAcademyStore.getState().completeLesson('proportion-scale')
    expect(useAcademyStore.getState().completedLessons).toContain('proportion-scale')
  })

  it('does not duplicate lesson completion', () => {
    useAcademyStore.getState().completeLesson('l1')
    useAcademyStore.getState().completeLesson('l1')
    expect(useAcademyStore.getState().completedLessons.length).toBe(1)
  })

  it('marks lesson incomplete', () => {
    useAcademyStore.getState().completeLesson('l1')
    useAcademyStore.getState().markIncomplete('l1')
    expect(useAcademyStore.getState().completedLessons).not.toContain('l1')
  })

  it('checks if lesson is completed', () => {
    useAcademyStore.getState().completeLesson('l1')
    expect(useAcademyStore.getState().isCompleted('l1')).toBe(true)
    expect(useAcademyStore.getState().isCompleted('l2')).toBe(false)
  })

  it('sets current lesson', () => {
    useAcademyStore.getState().setCurrentLesson('path-1', 'lesson-1')
    expect(useAcademyStore.getState().currentPathId).toBe('path-1')
    expect(useAcademyStore.getState().currentLessonId).toBe('lesson-1')
  })

  it('clears current lesson', () => {
    useAcademyStore.getState().setCurrentLesson('p1', 'l1')
    useAcademyStore.getState().clearCurrent()
    expect(useAcademyStore.getState().currentPathId).toBeNull()
    expect(useAcademyStore.getState().currentLessonId).toBeNull()
  })

  it('resets all progress', () => {
    useAcademyStore.getState().completeLesson('l1')
    useAcademyStore.getState().completeLesson('l2')
    useAcademyStore.getState().resetProgress()
    expect(useAcademyStore.getState().completedLessons).toEqual([])
  })
})
