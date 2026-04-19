'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">
        {error.message ?? 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
