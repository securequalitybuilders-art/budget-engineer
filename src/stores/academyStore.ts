import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { QuizResult } from '@/lib/learning/lessonEngine'

export interface Certification {
  pathId: string
  earnedAt: string
  title: string
}

interface AcademyState {
  completedLessons: string[]
  currentPathId: string | null
  currentLessonId: string | null
  quizResults: QuizResult[]
  certifications: Certification[]
}

interface AcademyActions {
  completeLesson: (lessonId: string) => void
  markIncomplete: (lessonId: string) => void
  isCompleted: (lessonId: string) => boolean
  setCurrentLesson: (pathId: string, lessonId: string) => void
  clearCurrent: () => void
  resetProgress: () => void
  recordQuizResult: (result: QuizResult) => void
  getQuizResult: (lessonId: string) => QuizResult | undefined
  addCertification: (cert: Certification) => void
  hasCertification: (pathId: string) => boolean
  getPathCompletionPct: (pathLessons: string[]) => number
}

export const useAcademyStore = create<AcademyState & AcademyActions>()(
  immer(
    persist(
      (set, get) => ({
        completedLessons: [],
        currentPathId: null,
        currentLessonId: null,
        quizResults: [],
        certifications: [],

        completeLesson: (lessonId) => {
          set((s) => {
            if (!s.completedLessons.includes(lessonId)) {
              s.completedLessons.push(lessonId)
            }
          })
        },

        markIncomplete: (lessonId) => {
          set((s) => {
            s.completedLessons = s.completedLessons.filter((id) => id !== lessonId)
          })
        },

        isCompleted: (lessonId) => {
          return get().completedLessons.includes(lessonId)
        },

        setCurrentLesson: (pathId, lessonId) => {
          set((s) => {
            s.currentPathId = pathId
            s.currentLessonId = lessonId
          })
        },

        clearCurrent: () => {
          set((s) => {
            s.currentPathId = null
            s.currentLessonId = null
          })
        },

        resetProgress: () => {
          set((s) => {
            s.completedLessons = []
            s.quizResults = []
            s.certifications = []
          })
        },

        recordQuizResult: (result) => {
          set((s) => {
            const idx = s.quizResults.findIndex((r) => r.lessonId === result.lessonId)
            if (idx >= 0) {
              s.quizResults[idx] = result
            } else {
              s.quizResults.push(result)
            }
          })
        },

        getQuizResult: (lessonId) => {
          return get().quizResults.find((r) => r.lessonId === lessonId)
        },

        addCertification: (cert) => {
          set((s) => {
            if (!s.certifications.find((c) => c.pathId === cert.pathId)) {
              s.certifications.push(cert)
            }
          })
        },

        hasCertification: (pathId) => {
          return get().certifications.some((c) => c.pathId === pathId)
        },

        getPathCompletionPct: (pathLessons) => {
          const done = pathLessons.filter((id) => get().completedLessons.includes(id)).length
          return pathLessons.length > 0 ? Math.round((done / pathLessons.length) * 100) : 0
        },
      }),
      {
        name: 'budget-engineer-academy',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          completedLessons: state.completedLessons,
          quizResults: state.quizResults,
          certifications: state.certifications,
        }),
      },
    ),
  ),
)
