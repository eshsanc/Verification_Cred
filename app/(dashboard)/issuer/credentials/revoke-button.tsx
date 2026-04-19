'use client'

import { useState } from 'react'
import { revokeCredential } from '@/app/actions/credentials'
import { useRouter } from 'next/navigation'

interface RevokeButtonProps {
  badgeId: string
  credentialName: string
}

/**
 * Inline revoke button with a confirmation step and inline error feedback.
 * On confirmation, calls the revokeCredential server action and refreshes the page.
 */
export function RevokeButton({ badgeId, credentialName }: RevokeButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleRevoke() {
    setLoading(true)
    setError(null)
    const result = await revokeCredential(badgeId)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? 'Failed to revoke')
      setLoading(false)
      setConfirming(false)
    }
  }

  if (error) {
    return (
      <span className="text-xs text-red-600" title={error}>
        {error.length > 30 ? error.slice(0, 30) + '…' : error}
      </span>
    )
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1 text-xs">
        <span className="text-gray-500">Revoke &quot;{credentialName.slice(0, 20)}&quot;?</span>
        <button
          onClick={handleRevoke}
          disabled={loading}
          className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
        >
          {loading ? '…' : 'Yes'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          No
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-red-500 hover:text-red-700 hover:underline"
    >
      Revoke
    </button>
  )
}
