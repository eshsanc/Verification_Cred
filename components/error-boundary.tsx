'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

/**
 * Generic React error boundary. Catches uncaught render errors and shows a
 * friendly fallback instead of a blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-yellow-500 mb-3" />
            <p className="text-sm font-medium text-gray-900">Something went wrong</p>
            <p className="mt-1 text-xs text-gray-500">{this.state.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="mt-4 text-xs text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
