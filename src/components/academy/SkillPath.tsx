import type { SkillPath as SkillPathType } from '@/lib/learning/lessonEngine'

interface SkillPathProps {
  path: SkillPathType
  progress: number
  currentLessonId: string | null
  onSelectLesson: (pathId: string, lessonId: string) => void
  onCompleteLesson: (lessonId: string) => void
  isCompleted: (lessonId: string) => boolean
}

const ICONS: Record<string, string> = {
  compass: '⟐',
  grid: '⊞',
  leaf: '☘',
  'file-text': '📄',
  book: '📖',
}

export function SkillPathView({ path, progress, currentLessonId, onSelectLesson, onCompleteLesson, isCompleted }: SkillPathProps) {
  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: 8,
      overflow: 'hidden',
      background: '#fff',
    }}>
      <div style={{
        padding: '16px 20px',
        background: path.color,
        color: '#fff',
      }}>
        <div style={{ fontSize: 24, marginBottom: 4 }}>{ICONS[path.icon] ?? '•'}</div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{path.title}</h3>
        <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.85 }}>{path.description}</p>
      </div>
      <div style={{ padding: '12px 20px', background: '#f9f9f9', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: '#e0e0e0', borderRadius: 3 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: path.color, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>{progress}%</span>
        </div>
      </div>
      <div style={{ padding: '8px 0' }}>
        {path.lessons.map((lesson) => {
          const done = isCompleted(lesson.id)
          const active = currentLessonId === lesson.id
          return (
            <div
              key={lesson.id}
              onClick={() => onSelectLesson(path.id, lesson.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                cursor: 'pointer',
                background: active ? '#f0f7ff' : 'transparent',
                borderLeft: active ? `3px solid ${path.color}` : '3px solid transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#f5f5f5' }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <span
                onClick={(e) => { e.stopPropagation(); done ? onCompleteLesson('') : onCompleteLesson(lesson.id) }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: `2px solid ${done ? path.color : '#ccc'}`,
                  background: done ? path.color : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 11,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {done ? '✓' : ''}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: '#1a1a1a' }}>{lesson.title}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{lesson.duration} — {lesson.summary}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
