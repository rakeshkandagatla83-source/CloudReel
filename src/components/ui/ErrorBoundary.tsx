import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div id="error-boundary-fallback" className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <p id="error-boundary-title" className="text-lg font-semibold text-white">Something went wrong</p>
          <p id="error-boundary-description" className="text-sm text-white/50">An unexpected error occurred in this panel.</p>
          <button
            id="error-boundary-btn-reload"
            type="button"
            onClick={() => window.location.reload()}
            className="mt-1 px-4 py-2 rounded-lg bg-[#3031cb] text-white text-sm font-medium cursor-pointer hover:bg-[#2626a8] transition-colors"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
