export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface Lesson {
  id: string
  title: string
  summary: string
  duration: string
  content: string
  quiz?: QuizQuestion[]
}

export interface SkillPath {
  id: string
  title: string
  description: string
  icon: string
  color: string
  lessons: Lesson[]
}

export interface Taxonomy {
  paths: SkillPath[]
}

export interface QuizResult {
  lessonId: string
  score: number
  total: number
  passed: boolean
  completedAt: string
}

export function gradeQuiz(questions: QuizQuestion[], answers: number[]): QuizResult {
  let correct = 0
  for (let i = 0; i < questions.length; i++) {
    if (i < answers.length && answers[i] === questions[i].correctIndex) {
      correct++
    }
  }
  const total = questions.length
  const score = total > 0 ? Math.round((correct / total) * 100) : 0
  return {
    lessonId: questions[0]?.id ?? '',
    score,
    total,
    passed: score >= 70,
    completedAt: new Date().toISOString(),
  }
}

export function parseLessonContent(markdown: string): string {
  return markdown
    .replace(/^### /gm, '<h3>')
    .replace(/^## /gm, '<h2>')
    .replace(/^# /gm, '<h1>')
    .replace(/^- /gm, '&bull; ')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
}

export function renderLessonToHtml(lesson: Lesson): string {
  const body = parseLessonContent(lesson.content)
  return `<article><h1>${lesson.title}</h1><p class="duration">${lesson.duration} &middot; ${lesson.summary}</p><hr/>${body}</article>`
}

export function findLesson(taxonomy: Taxonomy, pathId: string, lessonId: string): { path: SkillPath; lesson: Lesson } | null {
  for (const path of taxonomy.paths) {
    if (path.id === pathId) {
      const lesson = path.lessons.find((l) => l.id === lessonId)
      if (lesson) return { path, lesson }
      return null
    }
  }
  return null
}

export function getTotalLessons(taxonomy: Taxonomy): number {
  return taxonomy.paths.reduce((sum, p) => sum + p.lessons.length, 0)
}

export function getPathProgress(taxonomy: Taxonomy, completed: string[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const path of taxonomy.paths) {
    const total = path.lessons.length
    const done = path.lessons.filter((l) => completed.includes(l.id)).length
    result[path.id] = total > 0 ? Math.round((done / total) * 100) : 0
  }
  return result
}
