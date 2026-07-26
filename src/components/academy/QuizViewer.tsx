import { useState, useCallback } from 'react'
import type { QuizQuestion, QuizResult } from '@/lib/learning/lessonEngine'
import { gradeQuiz } from '@/lib/learning/lessonEngine'

interface QuizViewerProps {
  lessonId: string
  questions: QuizQuestion[]
  existingResult?: QuizResult
  onComplete: (result: QuizResult) => void
}

export function QuizViewer({ lessonId, questions, existingResult, onComplete }: QuizViewerProps) {
  const [answers, setAnswers] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<QuizResult | undefined>(existingResult)

  const handleSelect = useCallback((qIdx: number, optIdx: number) => {
    if (submitted || result) return
    setAnswers((prev) => {
      const next = [...prev]
      next[qIdx] = optIdx
      return next
    })
  }, [submitted, result])

  const handleSubmit = useCallback(() => {
    if (answers.length !== questions.length || questions.length === 0) return
    const r = gradeQuiz(questions, answers)
    setResult(r)
    setSubmitted(true)
    onComplete(r)
  }, [answers, questions, onComplete])

  const handleRetry = useCallback(() => {
    setAnswers([])
    setSubmitted(false)
    setResult(undefined)
  }, [])

  if (questions.length === 0) {
    return (
      <div style={{ padding: 16, color: '#888', fontSize: 13 }}>No quiz questions available for this lesson.</div>
    )
  }

  const isDone = !!result

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: 8,
      padding: '20px 24px',
      marginTop: 20,
    }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600 }}>Knowledge Check</h3>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
        {questions.length} question{questions.length > 1 ? 's' : ''} &middot; Pass: 70%
      </p>

      {questions.map((q, qIdx) => {
        const selected = answers[qIdx]
        const isCorrect = result && selected === q.correctIndex
        const isWrong = result && selected !== undefined && selected !== q.correctIndex

        return (
          <div key={q.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: qIdx < questions.length - 1 ? '1px solid #eee' : 'none' }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500 }}>
              {qIdx + 1}. {q.question}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {q.options.map((opt, oIdx) => {
                let bg = '#f9f9f9'
                let border = '#ddd'
                let textColor = '#1a1a1a'
                let indicator = ''

                if (isDone) {
                  if (oIdx === q.correctIndex) {
                    bg = '#e8f5e9'
                    border = '#4caf50'
                    indicator = '✓'
                    textColor = '#2e7d32'
                  } else if (oIdx === selected) {
                    bg = '#fce4ec'
                    border = '#e53935'
                    indicator = '✗'
                    textColor = '#c62828'
                  } else {
                    bg = '#f5f5f5'
                    border = '#eee'
                    textColor = '#999'
                  }
                } else if (oIdx === selected) {
                  bg = '#e3f2fd'
                  border = '#1976d2'
                }

                return (
                  <div
                    key={oIdx}
                    onClick={() => handleSelect(qIdx, oIdx)}
                    style={{
                      padding: '8px 12px',
                      fontSize: 13,
                      background: bg,
                      border: `1px solid ${border}`,
                      borderRadius: 6,
                      cursor: isDone ? 'default' : 'pointer',
                      color: textColor,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!isDone && oIdx !== selected) e.currentTarget.style.background = '#f0f7ff' }}
                    onMouseLeave={(e) => { if (!isDone && oIdx !== selected) e.currentTarget.style.background = '#f9f9f9' }}
                  >
                    {indicator && <span style={{ fontWeight: 700, fontSize: 14, width: 16 }}>{indicator}</span>}
                    <span>{opt}</span>
                  </div>
                )
              })}
            </div>
            {isDone && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#666', fontStyle: 'italic', lineHeight: 1.5 }}>
                {q.explanation}
              </p>
            )}
          </div>
        )
      })}

      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        {!isDone ? (
          <button
            onClick={handleSubmit}
            disabled={answers.length !== questions.length}
            style={{
              padding: '8px 24px',
              fontSize: 14,
              background: answers.length === questions.length ? '#1976d2' : '#e0e0e0',
              color: answers.length === questions.length ? '#fff' : '#999',
              border: 'none',
              borderRadius: 6,
              cursor: answers.length === questions.length ? 'pointer' : 'default',
              fontWeight: 600,
            }}
          >
            Submit Answers
          </button>
        ) : (
          <>
            <div style={{
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              background: result && result.passed ? '#e8f5e9' : '#fce4ec',
              color: result && result.passed ? '#2e7d32' : '#c62828',
            }}>
              {result && result.passed
                ? `Passed: ${result.score}% (${result.total - (result.score / 100 * result.total | 0)}/${result.total} correct)`
                : result
                  ? `Failed: ${result.score}% — ${result.score >= 70 ? result.total - (result.score / 100 * result.total | 0) : (result.score / 100 * result.total | 0)}/${result.total} correct`
                  : ''}
            </div>
            <button
              onClick={handleRetry}
              style={{
                padding: '6px 16px',
                fontSize: 13,
                background: 'none',
                border: '1px solid #ddd',
                borderRadius: 6,
                cursor: 'pointer',
                color: '#555',
              }}
            >
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  )
}
