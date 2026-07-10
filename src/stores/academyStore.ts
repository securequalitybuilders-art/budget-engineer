import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AcademyState {
  completedLessons: string[]
  currentPathId: string | null
  currentLessonId: string | null
}

interface AcademyActions {
  completeLesson: (lessonId: string) => void
  markIncomplete: (lessonId: string) => void
  isCompleted: (lessonId: string) => boolean
  setCurrentLesson: (pathId: string, lessonId: string) => void
  clearCurrent: () => void
  resetProgress: () => void
}

export const useAcademyStore = create<AcademyState & AcademyActions>()(
  immer(
    persist(
      (set, get) => ({
        completedLessons: [],
        currentPathId: null,
        currentLessonId: null,

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
          })
        },
      }),
      {
        name: 'budget-engineer-academy',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          completedLessons: state.completedLessons,
        }),
      },
    ),
  ),
)
