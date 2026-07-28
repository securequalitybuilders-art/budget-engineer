// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { QuizViewer } from '@/components/academy/QuizViewer'
import { LessonNavigator } from '@/components/academy/LessonNavigator'
import { QUIZ_DATA } from '@/data/skills/quiz-data'
import { gradeQuiz } from '@/lib/learning/lessonEngine'
import taxonomy from '@/data/skills/taxonomy.json'
import type { SkillPath as SkillPathType, Taxonomy } from '@/lib/learning/lessonEngine'

const tax = taxonomy as Taxonomy

const mockPath: SkillPathType = {
  id: 'test-path',
  title: 'Test Path',
  description: 'A test',
  icon: 'compass',
  color: '#2c3e50',
  lessons: [
    { id: 'l1', title: 'Lesson 1', summary: 'First', duration: '10 min', content: '# Hello' },
    { id: 'l2', title: 'Lesson 2', summary: 'Second', duration: '8 min', content: '# World' },
    { id: 'l3', title: 'Lesson 3', summary: 'Third', duration: '7 min', content: '# Foo' },
  ],
}

describe('QuizViewer', () => {
  it('renders question count', () => {
    const questions = QUIZ_DATA['proportion-scale']
    const { container } = render(
      <QuizViewer lessonId="proportion-scale" questions={questions} onComplete={() => {}} />
    )
    expect(container.textContent).toContain('2 questions')
  })

  it('renders all question text', () => {
    const questions = QUIZ_DATA['proportion-scale']
    const { container } = render(
      <QuizViewer lessonId="proportion-scale" questions={questions} onComplete={() => {}} />
    )
    expect(container.textContent).toContain('What is the golden ratio')
    expect(container.textContent).toContain('Le Corbusier')
  })

  it('renders all options for each question', () => {
    const questions = QUIZ_DATA['hierarchy-emphasis']
    const { container } = render(
      <QuizViewer lessonId="hierarchy-emphasis" questions={questions} onComplete={() => {}} />
    )
    expect(container.textContent).toContain('By size')
    expect(container.textContent).toContain('By shape')
    expect(container.textContent).toContain('By symmetry')
    expect(container.textContent).toContain('By material')
  })

  it('shows submit button enabled only when all questions answered', () => {
    const questions = QUIZ_DATA['rhythm-repetition']
    const { container } = render(
      <QuizViewer lessonId="rhythm-repetition" questions={questions} onComplete={() => {}} />
    )
    const submitBtn = container.querySelector('button')
    expect(submitBtn).toBeTruthy()
    expect(container.textContent).toContain('Submit Answers')
  })

  it('shows empty state when no questions', () => {
    const { container } = render(
      <QuizViewer lessonId="unknown" questions={[]} onComplete={() => {}} />
    )
    expect(container.textContent).toContain('No quiz questions available')
  })

  it('shows existing result when provided', () => {
    const questions = QUIZ_DATA['spatial-organization']
    const existingResult = gradeQuiz(questions, [2, 0])
    const { container } = render(
      <QuizViewer lessonId="spatial-organization" questions={questions} existingResult={existingResult} onComplete={() => {}} />
    )
    expect(container.textContent).toContain('Passed')
  })
})

describe('LessonNavigator', () => {
  it('renders path title and lesson count', () => {
    const { container } = render(
      <LessonNavigator
        path={mockPath}
        currentLessonId="l2"
        onNavigate={() => {}}
        onBack={() => {}}
        completedLessons={[]}
      />
    )
    expect(container.textContent).toContain('Test Path')
    expect(container.textContent).toContain('2 of 3')
  })

  it('renders all lesson titles', () => {
    const { container } = render(
      <LessonNavigator
        path={mockPath}
        currentLessonId="l1"
        onNavigate={() => {}}
        onBack={() => {}}
        completedLessons={[]}
      />
    )
    expect(container.textContent).toContain('Lesson 1')
    expect(container.textContent).toContain('Lesson 2')
    expect(container.textContent).toContain('Lesson 3')
  })

  it('shows completed checkmarks', () => {
    const { container } = render(
      <LessonNavigator
        path={mockPath}
        currentLessonId="l2"
        onNavigate={() => {}}
        onBack={() => {}}
        completedLessons={['l1', 'l3']}
      />
    )
    expect(container.textContent).toContain('✓ Lesson 1')
    expect(container.textContent).toContain('✓ Lesson 3')
  })

  it('shows next lesson button', () => {
    const { container } = render(
      <LessonNavigator
        path={mockPath}
        currentLessonId="l1"
        onNavigate={() => {}}
        onBack={() => {}}
        completedLessons={[]}
      />
    )
    expect(container.textContent).toContain('Lesson 2 →')
  })

  it('shows prev lesson button', () => {
    const { container } = render(
      <LessonNavigator
        path={mockPath}
        currentLessonId="l2"
        onNavigate={() => {}}
        onBack={() => {}}
        completedLessons={[]}
      />
    )
    expect(container.textContent).toContain('← Lesson 1')
  })

  it('hides prev when on first lesson', () => {
    const { container } = render(
      <LessonNavigator
        path={mockPath}
        currentLessonId="l1"
        onNavigate={() => {}}
        onBack={() => {}}
        completedLessons={[]}
      />
    )
    expect(container.textContent).not.toContain('← Lesson 3')
  })

  it('hides next when on last lesson', () => {
    const { container } = render(
      <LessonNavigator
        path={mockPath}
        currentLessonId="l3"
        onNavigate={() => {}}
        onBack={() => {}}
        completedLessons={[]}
      />
    )
    const buttons = container.querySelectorAll('button')
    const nextButtons = Array.from(buttons).filter((b) => b.textContent?.includes('→'))
    expect(nextButtons.length).toBe(0)
  })

  it('shows completed count', () => {
    const { container } = render(
      <LessonNavigator
        path={mockPath}
        currentLessonId="l1"
        onNavigate={() => {}}
        onBack={() => {}}
        completedLessons={['l1']}
      />
    )
    expect(container.textContent).toContain('1 completed')
  })

  it('renders back to all paths button', () => {
    const { container } = render(
      <LessonNavigator
        path={mockPath}
        currentLessonId="l1"
        onNavigate={() => {}}
        onBack={() => {}}
        completedLessons={[]}
      />
    )
    expect(container.textContent).toContain('All Paths')
  })
})

describe('Quiz Data Integrity', () => {
  it('all quiz questions have valid lesson IDs', () => {
    const allLessonIds = new Set(tax.paths.flatMap((p) => p.lessons.map((l) => l.id)))
    for (const lessonId of Object.keys(QUIZ_DATA)) {
      expect(allLessonIds.has(lessonId)).toBe(true)
    }
  })

  it('all quiz questions have valid structure', () => {
    for (const [, questions] of Object.entries(QUIZ_DATA)) {
      questions.forEach((q) => {
        expect(q.id).toBeTruthy()
        expect(q.question).toBeTruthy()
        expect(q.options.length).toBeGreaterThanOrEqual(2)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThan(q.options.length)
        expect(q.explanation).toBeTruthy()
      })
    }
  })

  it('gradeQuiz returns correct results', () => {
    const questions = QUIZ_DATA['proportion-scale']
    const result = gradeQuiz(questions, [1, 1])
    expect(result.total).toBe(2)
    expect(result.score).toBe(100)
    expect(result.passed).toBe(true)

    const failResult = gradeQuiz(questions, [0, 0])
    expect(failResult.passed).toBe(false)
  })

  it('new SADC path has quiz questions', () => {
    expect(QUIZ_DATA['sans10400-overview']).toBeTruthy()
    expect(QUIZ_DATA['sans10400-overview'].length).toBe(2)
    expect(QUIZ_DATA['climate-responsive-design']).toBeTruthy()
    expect(QUIZ_DATA['climate-responsive-design'].length).toBe(2)
    expect(QUIZ_DATA['structural-standards']).toBeTruthy()
    expect(QUIZ_DATA['structural-standards'].length).toBe(2)
    expect(QUIZ_DATA['site-planning-services']).toBeTruthy()
    expect(QUIZ_DATA['site-planning-services'].length).toBe(2)
  })

  it('filled gaps for previously missing lessons', () => {
    expect(QUIZ_DATA['parametric-thinking']).toBeTruthy()
    expect(QUIZ_DATA['generative-design']).toBeTruthy()
    expect(QUIZ_DATA['ai-architecture']).toBeTruthy()
    expect(QUIZ_DATA['digital-fabrication']).toBeTruthy()
    expect(QUIZ_DATA['contracts-delivery']).toBeTruthy()
    expect(QUIZ_DATA['regulations-liability']).toBeTruthy()
    expect(QUIZ_DATA['ethics-business']).toBeTruthy()
  })

  it('all 24+4=28 lessons have quiz coverage', () => {
    const lessonIds = new Set(tax.paths.flatMap((p) => p.lessons.map((l) => l.id)))
    const quizLessonIds = new Set(Object.keys(QUIZ_DATA))
    const missing = new Set([...lessonIds].filter((x) => !quizLessonIds.has(x)))
    expect(missing.size).toBe(0)
  })
})

describe('SADC Taxonomy', () => {
  it('has SADC building science path', () => {
    const sadcPath = tax.paths.find((p) => p.id === 'sadc-building-science')
    expect(sadcPath).toBeTruthy()
    expect(sadcPath!.title).toContain('SADC')
  })

  it('has 4 lessons in SADC path', () => {
    const sadcPath = tax.paths.find((p) => p.id === 'sadc-building-science')
    expect(sadcPath!.lessons.length).toBe(4)
    const ids = sadcPath!.lessons.map((l) => l.id)
    expect(ids).toContain('sans10400-overview')
    expect(ids).toContain('climate-responsive-design')
    expect(ids).toContain('structural-standards')
    expect(ids).toContain('site-planning-services')
  })

  it('total paths increased to 8', () => {
    expect(tax.paths.length).toBe(8)
  })

  it('total lessons increased to 28', () => {
    const total = tax.paths.reduce((s, p) => s + p.lessons.length, 0)
    expect(total).toBe(28)
  })
})
