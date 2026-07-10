// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ContextTip } from '@/components/academy/ContextTip'
import { SkillPathView } from '@/components/academy/SkillPath'
import type { SkillPath } from '@/lib/learning/lessonEngine'

const mockPath: SkillPath = {
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

describe('SkillPath', () => {
  it('renders path title', () => {
    const { container } = render(
      <SkillPathView
        path={mockPath}
        progress={50}
        currentLessonId={null}
        onSelectLesson={() => {}}
        onCompleteLesson={() => {}}
        isCompleted={() => false}
      />
    )
    expect(container.textContent).toContain('Test Path')
    expect(container.textContent).toContain('A test')
  })

  it('renders all lesson titles', () => {
    const { container } = render(
      <SkillPathView
        path={mockPath}
        progress={0}
        currentLessonId={null}
        onSelectLesson={() => {}}
        onCompleteLesson={() => {}}
        isCompleted={() => false}
      />
    )
    expect(container.textContent).toContain('Lesson 1')
    expect(container.textContent).toContain('Lesson 2')
    expect(container.textContent).toContain('Lesson 3')
  })

  it('shows 0% progress', () => {
    const { container } = render(
      <SkillPathView
        path={mockPath}
        progress={0}
        currentLessonId={null}
        onSelectLesson={() => {}}
        onCompleteLesson={() => {}}
        isCompleted={() => false}
      />
    )
    expect(container.textContent).toContain('0%')
  })

  it('shows 100% progress', () => {
    const { container } = render(
      <SkillPathView
        path={mockPath}
        progress={100}
        currentLessonId={null}
        onSelectLesson={() => {}}
        onCompleteLesson={() => {}}
        isCompleted={() => true}
      />
    )
    expect(container.textContent).toContain('100%')
  })
})

describe('ContextTip', () => {
  it('renders button with lesson title', () => {
    const { container } = render(
      <ContextTip lessonTitle="Proportion" pathTitle="Design Principles" tip="Learn about the golden ratio." />
    )
    expect(container.textContent).toContain('Proportion')
  })

  it('shows tip label', () => {
    const { container } = render(
      <ContextTip lessonTitle="Structures" pathTitle="Building Systems" tip="Understand load paths." />
    )
    expect(container.textContent).toContain('Learn: Structures')
  })
})
