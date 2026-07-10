import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import taxonomy from '@/data/skills/taxonomy.json'
import { useAcademyStore } from '@/stores/academyStore'
import { SkillPathView } from '@/components/academy/SkillPath'
import { findLesson, getPathProgress, renderLessonToHtml } from '@/lib/learning/lessonEngine'
import type { Taxonomy } from '@/lib/learning/lessonEngine'

const tax = taxonomy as Taxonomy

export function AcademyHome() {
  const navigate = useNavigate()
  const completedLessons = useAcademyStore((s) => s.completedLessons)
  const currentPathId = useAcademyStore((s) => s.currentPathId)
  const currentLessonId = useAcademyStore((s) => s.currentLessonId)
  const completeLesson = useAcademyStore((s) => s.completeLesson)
  const isCompleted = useAcademyStore((s) => s.isCompleted)
  const resetProgress = useAcademyStore((s) => s.resetProgress)

  const progress = useMemo(() => getPathProgress(tax, completedLessons), [completedLessons])
  const totalLessons = tax.paths.reduce((s, p) => s + p.lessons.length, 0)
  const totalCompleted = completedLessons.length

  const handleSelectLesson = (pathId: string, lessonId: string) => {
    navigate(`/academy/${pathId}/${lessonId}`)
  }

  const handleCompleteLesson = (lessonId: string) => {
    if (lessonId) completeLesson(lessonId)
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Architecture Academy</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#888' }}>
          {totalCompleted} of {totalLessons} lessons completed
        </p>
        <div style={{ marginTop: 8, height: 6, background: '#e0e0e0', borderRadius: 3, maxWidth: 400 }}>
          <div style={{ width: `${totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0}%`, height: '100%', background: '#2c3e50', borderRadius: 3, transition: 'width 0.3s' }} />
        </div>
      </div>
      {totalCompleted > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={resetProgress}
            style={{ padding: '4px 12px', fontSize: 12, color: '#c0392b', background: 'none', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}
          >
            Reset Progress
          </button>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 20 }}>
        {tax.paths.map((path) => (
          <SkillPathView
            key={path.id}
            path={path}
            progress={progress[path.id] ?? 0}
            currentLessonId={currentPathId === path.id ? currentLessonId : null}
            onSelectLesson={handleSelectLesson}
            onCompleteLesson={handleCompleteLesson}
            isCompleted={isCompleted}
          />
        ))}
      </div>
    </div>
  )
}

export function AcademyLesson() {
  const { skillPath: pathId, lessonId } = useParams<{ skillPath: string; lessonId: string }>()
  const navigate = useNavigate()
  const completeLesson = useAcademyStore((s) => s.completeLesson)
  const setCurrentLesson = useAcademyStore((s) => s.setCurrentLesson)
  const isCompleted = useAcademyStore((s) => s.isCompleted)

  const result = useMemo(() => {
    if (!pathId || !lessonId) return null
    return findLesson(tax as Taxonomy, pathId, lessonId)
  }, [pathId, lessonId])

  const html = useMemo(() => result ? renderLessonToHtml(result.lesson) : '', [result])

  if (!result) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 40, textAlign: 'center', color: '#888' }}>
        <h2>Lesson not found</h2>
        <button onClick={() => navigate('/academy')} style={{ padding: '8px 20px', fontSize: 13, border: '1px solid #ccc', borderRadius: 4, background: '#f5f5f5', cursor: 'pointer' }}>
          Back to Academy
        </button>
      </div>
    )
  }

  const { path, lesson } = result
  const done = isCompleted(lesson.id)

  const handleComplete = () => {
    completeLesson(lesson.id)
    setCurrentLesson(path.id, lesson.id)
  }

  const handleBack = () => {
    navigate('/academy')
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={handleBack} style={{ padding: '6px 14px', fontSize: 13, border: '1px solid #ccc', borderRadius: 4, background: '#f5f5f5', cursor: 'pointer' }}>
          ← Back
        </button>
        <span style={{ fontSize: 12, color: '#888' }}>{path.title} / {lesson.title}</span>
      </div>
      <div style={{
        background: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: 8,
        padding: '24px 28px',
        lineHeight: 1.7,
        fontSize: 14,
        color: '#1a1a1a',
      }}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          onClick={handleComplete}
          style={{
            padding: '8px 24px',
            fontSize: 14,
            background: done ? '#e0e0e0' : path.color,
            color: done ? '#888' : '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: done ? 'default' : 'pointer',
            fontWeight: 600,
          }}
        >
          {done ? '✓ Completed' : 'Mark as Complete'}
        </button>
      </div>
    </div>
  )
}

export default function Academy() {
  return <AcademyHome />
}
