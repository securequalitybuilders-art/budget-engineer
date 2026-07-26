import { Component, type ReactNode, type ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((retry: () => void) => ReactNode)
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught:', error, info.componentStack)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    const fallback = this.props.fallback
    if (typeof fallback === 'function') {
      return (fallback as (retry: () => void) => ReactNode)(this.handleRetry)
    }
    if (fallback) return fallback

    return (
      <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-lg border border-stone-700/60 bg-stone-900/80 p-6">
        <p className="text-sm text-stone-300">Something went wrong.</p>
        <button
          onClick={this.handleRetry}
          className="rounded bg-cyan-600/20 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-600/30"
        >
          Retry
        </button>
      </div>
    )
  }
}
