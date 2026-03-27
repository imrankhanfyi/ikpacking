// src/components/ErrorBoundary.tsx
import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-sm text-center space-y-4">
            <h1 className="text-xl font-bold text-slate-100">Something went wrong</h1>
            <p className="text-sm text-slate-400">The app hit an unexpected error.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/' }}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold"
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
