import { useState, useCallback } from 'react'

interface ContextTipProps {
  lessonTitle: string
  pathTitle: string
  tip: string
}

export function ContextTip({ lessonTitle, pathTitle, tip }: ContextTipProps) {
  const [open, setOpen] = useState(false)

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleToggle}
        style={{
          background: 'none',
          border: '1px dashed #ccc',
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 11,
          color: '#888',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
        aria-label={`Learn more about ${lessonTitle}`}
      >
        <span>📘</span>
        <span>Learn: {lessonTitle}</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 280,
            background: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            padding: 12,
            zIndex: 100,
            fontSize: 12,
            color: '#333',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>{lessonTitle}</div>
          <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>From: {pathTitle}</div>
          <p style={{ margin: 0, lineHeight: 1.5 }}>{tip}</p>
          <button
            onClick={handleToggle}
            style={{
              marginTop: 8,
              padding: '2px 10px',
              fontSize: 11,
              background: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
