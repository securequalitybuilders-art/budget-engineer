// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import React from 'react'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Bim3DUnavailable } from '@/components/bim/Bim3DUnavailable'
import { isWebGLAvailable } from '@/lib/webgl'

afterEach(() => cleanup())

// ── ErrorBoundary ──

function GoodChild(): React.ReactNode {
  return <p>All good</p>
}

function BadChild(): React.ReactNode {
  throw new Error('Kaboom!')
}

describe('ErrorBoundary', () => {
  it('renders children normally when no error', () => {
    const { container } = render(
      <ErrorBoundary fallback={<p>Fallback</p>}>
        <GoodChild />
      </ErrorBoundary>,
    )
    expect(container.textContent).toContain('All good')
  })

  it('renders fallback when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      <ErrorBoundary fallback={<p>Fallback</p>}>
        <BadChild />
      </ErrorBoundary>,
    )
    expect(container.textContent).toContain('Fallback')
    spy.mockRestore()
  })

  it('does not rethrow the error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      render(
        <ErrorBoundary fallback={<p role="alert">Fallback</p>}>
          <BadChild />
        </ErrorBoundary>,
      )
    }).not.toThrow()
    spy.mockRestore()
  })

  it('renders default fallback when no fallback prop given', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>,
    )
    expect(container.querySelector('[role="alert"]')).toBeTruthy()
    expect(container.textContent).toContain('Something went wrong.')
    spy.mockRestore()
  })

  it('passes retry function when fallback is a render prop', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      <ErrorBoundary fallback={(retry: () => void) => <button onClick={retry}>Retry</button>}>
        <BadChild />
      </ErrorBoundary>,
    )
    expect(container.textContent).toContain('Retry')
    spy.mockRestore()
  })
})

// ── Bim3DUnavailable ──

describe('Bim3DUnavailable', () => {
  it('renders unavailable text', () => {
    const { container } = render(<Bim3DUnavailable />)
    expect(container.textContent).toContain('3D view unavailable')
    expect(container.textContent).toContain('drawings, 2D plan')
  })

  it('has role="alert"', () => {
    const { container } = render(<Bim3DUnavailable />)
    expect(container.querySelector('[role="alert"]')).toBeTruthy()
  })

  it('renders Retry button when onRetry is provided', () => {
    const retry = vi.fn()
    const { container } = render(<Bim3DUnavailable onRetry={retry} />)
    const btn = container.querySelector('button')
    expect(btn).not.toBeNull()
    btn!.click()
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('does not render Retry button when onRetry is not provided', () => {
    const { container } = render(<Bim3DUnavailable />)
    expect(container.querySelector('button')).toBeNull()
  })
})

// ── isWebGLAvailable ──

describe('isWebGLAvailable', () => {
  it('returns false when getContext returns null', () => {
    const orig = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as typeof HTMLCanvasElement.prototype.getContext
    expect(isWebGLAvailable()).toBe(false)
    HTMLCanvasElement.prototype.getContext = orig
  })

  it('returns true when webgl2 context is available', () => {
    const orig = HTMLCanvasElement.prototype.getContext
    const mockCtx = {} as RenderingContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx) as typeof HTMLCanvasElement.prototype.getContext
    expect(isWebGLAvailable()).toBe(true)
    HTMLCanvasElement.prototype.getContext = orig
  })

  it('returns false when document is undefined', () => {
    const doc = globalThis.document
    ;(globalThis as Record<string, unknown>).document = undefined as unknown as Document
    expect(isWebGLAvailable()).toBe(false)
    globalThis.document = doc
  })
})
