import { Component } from "react"
import type { ErrorInfo, ReactNode } from "react"

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info)
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="utilityPage">
          <div className="utilityPanel utilityPanel--compact">
            <h1>Something went wrong</h1>
            <p className="pageLead">An unexpected error occurred. Reload the page to try again.</p>
            {this.state.error ? (
              <pre className="errorBoundaryDetails">{this.state.error.message}</pre>
            ) : null}
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
