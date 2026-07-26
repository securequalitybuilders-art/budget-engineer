// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { BoardAnnotator } from '@/components/presentation/BoardAnnotator'
import { usePresentationStore } from '@/stores/presentationStore'

beforeEach(() => {
  usePresentationStore.setState({ boards: [], activeBoardId: null, editingAnnotationId: null })
})

function setupBoard() {
  const boardId = usePresentationStore.getState().createBoard('proj-1', 'Test Board', 'concept')
  return boardId
}

describe('BoardAnnotator', () => {
  it('renders annotation tool buttons', () => {
    const boardId = setupBoard()
    const { container } = render(<BoardAnnotator boardId={boardId} boardWidth={841} boardHeight={594} />)
    expect(container.textContent).toContain('Text')
    expect(container.textContent).toContain('Callout')
    expect(container.textContent).toContain('Dim')
    expect(container.textContent).toContain('Draw')
  })

  it('renders color picker buttons', () => {
    const boardId = setupBoard()
    const { container } = render(<BoardAnnotator boardId={boardId} boardWidth={841} boardHeight={594} />)
    const colorButtons = container.querySelectorAll('button[style*="border-radius: 50%"]')
    expect(colorButtons.length).toBe(6)
  })

  it('renders text input for annotation text', () => {
    const boardId = setupBoard()
    const { container } = render(<BoardAnnotator boardId={boardId} boardWidth={841} boardHeight={594} />)
    const input = container.querySelector('input[type="text"]')
    expect(input).toBeTruthy()
  })

  it('renders SVG element', () => {
    const boardId = setupBoard()
    const { container } = render(<BoardAnnotator boardId={boardId} boardWidth={841} boardHeight={594} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 841 594')
  })

  it('renders existing annotations from store', () => {
    const boardId = setupBoard()
    usePresentationStore.getState().addAnnotation(boardId, {
      id: 'test-ann',
      kind: 'textbox',
      x: 100,
      y: 200,
      w: 120,
      h: 24,
      text: 'Hello World',
      color: '#000',
      strokeWidth: 1,
    })
    const { container } = render(<BoardAnnotator boardId={boardId} boardWidth={841} boardHeight={594} />)
    expect(container.textContent).toContain('Hello World')
  })

  it('renders callout annotations', () => {
    const boardId = setupBoard()
    usePresentationStore.getState().addAnnotation(boardId, {
      id: 'callout-1',
      kind: 'callout',
      x: 50,
      y: 50,
      color: '#e74c3c',
      strokeWidth: 1.5,
      points: [{ x: 50, y: 50 }, { x: 100, y: 80 }],
      text: 'Callout text',
    })
    const { container } = render(<BoardAnnotator boardId={boardId} boardWidth={841} boardHeight={594} />)
    expect(container.textContent).toContain('Callout text')
  })

  it('renders dimension annotations', () => {
    const boardId = setupBoard()
    usePresentationStore.getState().addAnnotation(boardId, {
      id: 'dim-1',
      kind: 'dimension',
      x: 10,
      y: 10,
      color: '#3498db',
      strokeWidth: 0.5,
      points: [{ x: 10, y: 10 }, { x: 100, y: 10 }],
    })
    const { container } = render(<BoardAnnotator boardId={boardId} boardWidth={841} boardHeight={594} />)
    const lines = container.querySelectorAll('line')
    expect(lines.length).toBe(1)
  })

  it('renders freehand annotations', () => {
    const boardId = setupBoard()
    usePresentationStore.getState().addAnnotation(boardId, {
      id: 'fh-1',
      kind: 'freehand',
      x: 0,
      y: 0,
      color: '#2ecc71',
      strokeWidth: 2,
      points: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 5 }],
    })
    const { container } = render(<BoardAnnotator boardId={boardId} boardWidth={841} boardHeight={594} />)
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBeGreaterThanOrEqual(1)
  })
})
