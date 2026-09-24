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
            <div className="text-center max-w-md p-8 rounded-3xl bg-surface border border-outline-variant">
              <span className="relative inline-block">
                <Icon icon="error" size="3xl" className="text-error" />
              </span>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mt-4 mb-2">Something went wrong</h1>
              <p className="font-body-md text-secondary mb-6">{this.state.error?.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-primary text-on-primary rounded-full font-label-md transition-all min-h-[44px]"
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
