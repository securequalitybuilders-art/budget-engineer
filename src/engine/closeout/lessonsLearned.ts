import type { LessonCategory, LessonLearned, LessonSeverity } from '@/domain/closeout'

export function addLesson(
  lessons: LessonLearned[],
  input: Omit<LessonLearned, 'id' | 'createdAt'>,
): LessonLearned[] {
  const lesson: LessonLearned = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  return [...lessons, lesson]
}

export function summarizeLessons(lessons: LessonLearned[]): {
  total: number
  byCategory: Record<LessonCategory, number>
  highSeverity: number
  topCategories: LessonCategory[]
} {
  const categories: LessonCategory[] = ['cost', 'schedule', 'quality', 'safety', 'procurement', 'design', 'process']
  const byCategory = Object.fromEntries(categories.map((c) => [c, 0])) as Record<LessonCategory, number>
  for (const l of lessons) {
    if (l.category in byCategory) byCategory[l.category] += 1
  }
  const highSeverity = lessons.filter((l) => l.severity === 'high').length
  const topCategories = categories
    .filter((c) => byCategory[c] > 0)
    .sort((a, b) => byCategory[b] - byCategory[a])
    .slice(0, 3)
  return { total: lessons.length, byCategory, highSeverity, topCategories }
}

export function lessonSeverityLabel(severity: LessonSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1)
}
