import { Component, type ReactNode, type ErrorInfo } from 'react'
import Icon from '../Icon'

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center max-w-md p-8 rounded-3xl bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-[0_0_40px_rgba(255,51,102,0.1)]">
              <span className="relative inline-block">
                <Icon icon="error" size="3xl" className="text-[#ff3366]" />
                <span className="absolute inset-0 rounded-full blur-xl opacity-50 bg-[radial-gradient(circle,rgba(255,51,102,0.6)_0%,transparent_70%)]" />
              </span>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mt-4 mb-2">Something went wrong</h1>
              <p className="font-body-md text-secondary mb-6">{this.state.error?.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-[var(--neon-primary)] text-[#050816] rounded-full font-label-md hover:shadow-[0_0_24px_rgba(148,197,253,0.4)] transition-all min-h-[44px]"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}
