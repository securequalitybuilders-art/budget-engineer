import { useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import taxonomy from '@/data/skills/taxonomy.json'
import { QUIZ_DATA } from '@/data/skills/quiz-data'
import { useAcademyStore } from '@/stores/academyStore'
import { SkillPathView } from '@/components/academy/SkillPath'
import { QuizViewer } from '@/components/academy/QuizViewer'
import { LessonNavigator } from '@/components/academy/LessonNavigator'
import { findLesson, getPathProgress, renderLessonToHtml } from '@/lib/learning/lessonEngine'
import type { Taxonomy, QuizResult } from '@/lib/learning/lessonEngine'

const tax = taxonomy as Taxonomy

export function AcademyHome() {
  const navigate = useNavigate()
  const completedLessons = useAcademyStore((s) => s.completedLessons)
  const currentPathId = useAcademyStore((s) => s.currentPathId)
  const currentLessonId = useAcademyStore((s) => s.currentLessonId)
  const completeLesson = useAcademyStore((s) => s.completeLesson)
  const isCompleted = useAcademyStore((s) => s.isCompleted)
  const resetProgress = useAcademyStore((s) => s.resetProgress)
  const certifications = useAcademyStore((s) => s.certifications)

  const progress = useMemo(() => getPathProgress(tax, completedLessons), [completedLessons])
  const totalLessons = tax.paths.reduce((s, p) => s + p.lessons.length, 0)
  const totalCompleted = completedLessons.length

  const handleSelectLesson = (pathId: string, lessonId: string) => {
    navigate(`/academy/${pathId}/${lessonId}`)
  }

  const handleCompleteLesson = (lessonId: string) => {
    if (lessonId) completeLesson(lessonId)
  }

  if (tax.paths.length === 0) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Architecture Academy</h1>
        <p style={{ marginTop: 16, fontSize: 13, color: '#888' }}>No learning paths available yet.</p>
      </div>
    )
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

      {certifications.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#555' }}>Certifications Earned</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {certifications.map((cert) => (
              <div key={cert.pathId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: '#f0f8f0',
                border: '1px solid #c8e6c9',
                borderRadius: 6,
                fontSize: 12,
                color: '#2e7d32',
                fontWeight: 500,
              }}>
                <span style={{ fontSize: 16 }}>🏆</span>
                <span>{cert.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
  const recordQuizResult = useAcademyStore((s) => s.recordQuizResult)
  const getQuizResult = useAcademyStore((s) => s.getQuizResult)
  const completedLessons = useAcademyStore((s) => s.completedLessons)
  const addCertification = useAcademyStore((s) => s.addCertification)
  const hasCertification = useAcademyStore((s) => s.hasCertification)
  const result = useMemo(() => {
    if (!pathId || !lessonId) return null
    return findLesson(tax as Taxonomy, pathId, lessonId)
  }, [pathId, lessonId])

  const renderOutcome = useMemo(() => {
    if (!result) return { html: '', error: null as string | null }
    try {
      return { html: renderLessonToHtml(result.lesson), error: null }
    } catch (err) {
      return { html: '', error: err instanceof Error ? err.message : 'Failed to render lesson' }
    }
  }, [result])

  const renderError = renderOutcome.error

  const quizQuestions = useMemo(() => {
    if (!lessonId) return []
    return QUIZ_DATA[lessonId] ?? []
  }, [lessonId])

  const existingQuizResult = useMemo(() => {
    if (!lessonId) return undefined
    return getQuizResult(lessonId)
  }, [lessonId, getQuizResult])

  const handleNavigate = useCallback((newLessonId: string) => {
    if (pathId) {
      navigate(`/academy/${pathId}/${newLessonId}`)
    }
  }, [pathId, navigate])

  const handleBack = useCallback(() => {
    navigate('/academy')
  }, [navigate])

  const handleQuizComplete = useCallback((quizResult: QuizResult) => {
    recordQuizResult(quizResult)

    if (pathId && lessonId && quizResult.passed) {
      const path = tax.paths.find((p) => p.id === pathId)
      if (path) {
        const otherLessonsInPath = path.lessons.filter((l) => l.id !== lessonId)
        const allOtherDone = otherLessonsInPath.every((l) => isCompleted(l.id))
        if (allOtherDone && quizResult.passed && !hasCertification(pathId)) {
          addCertification({
            pathId,
            earnedAt: new Date().toISOString(),
            title: `${path.title} — Completed`,
          })
        }
      }
    }
  }, [pathId, lessonId, recordQuizResult, addCertification, hasCertification, isCompleted])

  if (!result) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 40, textAlign: 'center', color: '#888' }}>
        <h2>Lesson not found</h2>
        <button onClick={handleBack} style={{ padding: '8px 20px', fontSize: 13, border: '1px solid #ccc', borderRadius: 4, background: '#f5f5f5', cursor: 'pointer' }}>
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

  if (renderError) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 40, textAlign: 'center', color: '#888' }}>
        <h2>Failed to load lesson</h2>
        <p style={{ fontSize: 13, marginTop: 8 }}>{renderError}</p>
        <button onClick={handleBack} style={{ padding: '8px 20px', fontSize: 13, border: '1px solid #ccc', borderRadius: 4, background: '#f5f5f5', cursor: 'pointer', marginTop: 16 }}>
          Back to Academy
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={handleBack} style={{ padding: '6px 14px', fontSize: 13, border: '1px solid #ccc', borderRadius: 4, background: '#f5f5f5', cursor: 'pointer' }}>
          ← Back
        </button>
        <span style={{ fontSize: 12, color: '#888' }}>{path.title} / {lesson.title}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 20, alignItems: 'start' }}>
        <div>
          <div style={{
            background: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            padding: '24px 28px',
            lineHeight: 1.7,
            fontSize: 14,
            color: '#1a1a1a',
          }}>
            <div dangerouslySetInnerHTML={{ __html: renderOutcome.html }} />
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

          {quizQuestions.length > 0 && (
            <QuizViewer
              lessonId={lesson.id}
              questions={quizQuestions}
              existingResult={existingQuizResult}
              onComplete={handleQuizComplete}
            />
          )}
        </div>

        <div>
          <LessonNavigator
            path={path}
            currentLessonId={lesson.id}
            onNavigate={handleNavigate}
            onBack={handleBack}
            completedLessons={completedLessons}
          />
        </div>
      </div>
    </div>
  )
}

export default function Academy() {
  return <AcademyHome />
}
