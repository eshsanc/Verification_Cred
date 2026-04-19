'use client'

import { useEffect } from 'react'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

export default function VerifyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Verify page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <XCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h1 className="text-xl font-semibold text-gray-900">Verification failed</h1>
        <p className="text-sm text-gray-500">
          {error.message ?? 'Unable to load credential verification. Please try again.'}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
