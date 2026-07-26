import { describe, it, expect } from 'vitest'
import { parseLessonContent, renderLessonToHtml, findLesson, getTotalLessons, getPathProgress } from '@/lib/learning/lessonEngine'
import type { Lesson, Taxonomy } from '@/lib/learning/lessonEngine'

const mockTax: Taxonomy = {
  paths: [
    {
      id: 'design-principles',
      title: 'Design Principles',
      description: 'Core concepts',
      icon: 'compass',
      color: '#2c3e50',
      lessons: [
        { id: 'p1', title: 'Proportion', summary: 'Scale basics', duration: '10 min', content: '# Proportion\nLesson content' },
        { id: 'p2', title: 'Rhythm', summary: 'Patterns', duration: '8 min', content: '# Rhythm\nMore content' },
        { id: 'p3', title: 'Hierarchy', summary: 'Emphasis', duration: '7 min', content: '# Hierarchy\nContent' },
      ],
    },
    {
      id: 'structures',
      title: 'Structures',
      description: 'Building systems',
      icon: 'grid',
      color: '#c0392b',
      lessons: [
        { id: 's1', title: 'Loads', summary: 'Load paths', duration: '12 min', content: '# Loads\nContent' },
        { id: 's2', title: 'Materials', summary: 'Material choice', duration: '10 min', content: '# Materials\nContent' },
        { id: 's3', title: 'Envelope', summary: 'Thermal', duration: '11 min', content: '# Envelope\nContent' },
      ],
    },
    {
      id: 'sustainable',
      title: 'Sustainable Design',
      description: 'Green building',
      icon: 'leaf',
      color: '#27ae60',
      lessons: [
        { id: 'e1', title: 'Passive', summary: 'Passive design', duration: '9 min', content: '# Passive\nContent' },
        { id: 'e2', title: 'Carbon', summary: 'Embodied carbon', duration: '8 min', content: '# Carbon\nContent' },
        { id: 'e3', title: 'Net Zero', summary: 'Zero energy', duration: '10 min', content: '# Net Zero\nContent' },
      ],
    },
  ],
}

describe('parseLessonContent', () => {
  it('converts markdown headings to HTML tags', () => {
    const result = parseLessonContent('# Title\n## Section\n### Subsection')
    expect(result).toContain('<h1>')
    expect(result).toContain('<h2>')
    expect(result).toContain('<h3>')
  })

  it('converts bold text', () => {
    const result = parseLessonContent('**bold** text')
    expect(result).toContain('<strong>bold</strong>')
  })

  it('converts italic text', () => {
    const result = parseLessonContent('*italic* text')
    expect(result).toContain('<em>italic</em>')
  })

  it('converts list items', () => {
    const result = parseLessonContent('- item 1\n- item 2')
    expect(result).toContain('&bull; item 1')
    expect(result).toContain('&bull; item 2')
  })

  it('wraps paragraphs', () => {
    const result = parseLessonContent('Para 1\n\nPara 2')
    expect(result).toMatch(/<\/p><p>/)
  })
})

describe('renderLessonToHtml', () => {
  it('includes lesson title and duration', () => {
    const lesson: Lesson = { id: 't1', title: 'Test Lesson', summary: 'A test', duration: '5 min', content: '# Hello' }
    const html = renderLessonToHtml(lesson)
    expect(html).toContain('Test Lesson')
    expect(html).toContain('5 min')
    expect(html).toContain('A test')
  })

  it('renders article tag', () => {
    const lesson: Lesson = { id: 't1', title: 'Test', summary: 'Sum', duration: '5 min', content: '# X' }
    const html = renderLessonToHtml(lesson)
    expect(html).toContain('<article>')
    expect(html).toContain('</article>')
  })
})

describe('findLesson', () => {
  it('finds existing lesson', () => {
    const result = findLesson(mockTax, 'design-principles', 'p1')
    expect(result).not.toBeNull()
    expect(result!.path.id).toBe('design-principles')
    expect(result!.lesson.id).toBe('p1')
  })

  it('returns null for unknown path', () => {
    expect(findLesson(mockTax, 'unknown-path', 'p1')).toBeNull()
  })

  it('returns null for unknown lesson', () => {
    expect(findLesson(mockTax, 'design-principles', 'unknown')).toBeNull()
  })
})

describe('getTotalLessons', () => {
  it('counts all lessons', () => {
    expect(getTotalLessons(mockTax)).toBe(9)
  })

  it('returns 0 for empty taxonomy', () => {
    expect(getTotalLessons({ paths: [] })).toBe(0)
  })
})

describe('getPathProgress', () => {
  it('returns 100% for completed path', () => {
    const result = getPathProgress(mockTax, ['p1', 'p2', 'p3'])
    expect(result['design-principles']).toBe(100)
  })

  it('returns 0% for no completions', () => {
    const result = getPathProgress(mockTax, [])
    expect(result['design-principles']).toBe(0)
  })

  it('returns partial progress', () => {
    const result = getPathProgress(mockTax, ['p1', 's1'])
    expect(result['design-principles']).toBe(33)
    expect(result['structures']).toBe(33)
    expect(result['sustainable']).toBe(0)
  })
})
