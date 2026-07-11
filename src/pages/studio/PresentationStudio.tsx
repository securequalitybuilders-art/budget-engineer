import { useParams } from 'react-router-dom'
import { BoardEditor } from '@/components/presentation/BoardEditor'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

export default function PresentationStudio() {
  const { id: projectId } = useParams<{ id: string }>()

  if (!projectId) {
    return <div style={{ padding: 40, color: '#888' }}>No project selected.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e0e0e0' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Presentation Boards</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>
          Compose boards with drawings, snapshots, annotations, and export to PDF.
        </p>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ErrorBoundary>
          <BoardEditor projectId={projectId} />
        </ErrorBoundary>
      </div>
    </div>
  )
}
