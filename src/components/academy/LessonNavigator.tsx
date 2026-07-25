import type { SkillPath as SkillPathType } from '@/lib/learning/lessonEngine'

interface LessonNavigatorProps {
  path: SkillPathType
  currentLessonId: string
  onNavigate: (lessonId: string) => void
  onBack: () => void
  completedLessons: string[]
}

export function LessonNavigator({ path, currentLessonId, onNavigate, onBack, completedLessons }: LessonNavigatorProps) {
  const currentIdx = path.lessons.findIndex((l) => l.id === currentLessonId)
  const total = path.lessons.length
  const done = completedLessons.filter((id) => path.lessons.some((l) => l.id === id)).length

  const prevLesson = currentIdx > 0 ? path.lessons[currentIdx - 1] : null
  const nextLesson = currentIdx < total - 1 ? path.lessons[currentIdx + 1] : null

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px',
        background: path.color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{path.title}</span>
        <span style={{ fontSize: 11, opacity: 0.85 }}>
          {currentIdx + 1} of {total} &middot; {done} completed
        </span>
      </div>
      <div style={{ height: 4, background: '#e0e0e0' }}>
        <div style={{
          width: `${total > 0 ? (done / total) * 100 : 0}%`,
          height: '100%',
          background: path.color,
          transition: 'width 0.3s',
          opacity: 0.5,
        }} />
      </div>
      <div style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
        {path.lessons.map((lesson) => {
          const isActive = lesson.id === currentLessonId
          const isDone = completedLessons.includes(lesson.id)
          return (
            <div
              key={lesson.id}
              onClick={() => onNavigate(lesson.id)}
              style={{
                padding: '6px 16px',
                fontSize: 12,
                cursor: 'pointer',
                background: isActive ? '#f0f7ff' : 'transparent',
                borderLeft: isActive ? `3px solid ${path.color}` : '3px solid transparent',
                color: isActive ? path.color : '#555',
                fontWeight: isActive ? 600 : 400,
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#f5f5f5' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              {isDone ? '✓ ' : ''}{lesson.title}
            </div>
          )
        })}
      </div>
      <div style={{ padding: '10px 16px', display: 'flex', gap: 8 }}>
        <button
          onClick={onBack}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: 4,
            cursor: 'pointer',
            color: '#555',
          }}
        >
          ← All Paths
        </button>
        {prevLesson && (
          <button
            onClick={() => onNavigate(prevLesson.id)}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: 4,
              cursor: 'pointer',
              color: '#555',
            }}
          >
            ← {prevLesson.title.length > 20 ? prevLesson.title.slice(0, 20) + '...' : prevLesson.title}
          </button>
        )}
        {nextLesson && (
          <button
            onClick={() => onNavigate(nextLesson.id)}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              background: path.color,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              color: '#fff',
              marginLeft: 'auto',
            }}
          >
            {nextLesson.title.length > 20 ? nextLesson.title.slice(0, 20) + '...' : nextLesson.title} →
          </button>
        )}
      </div>
    </div>
  )
}
