'use client'

import { useState, useTransition } from 'react'
import { claimCredential } from '@/app/actions/claim'
import { Button } from '@/components/ui/button'

export function ClaimButton({ badgeId }: { badgeId: string }) {
  const [agreed, setAgreed] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleClaim() {
    startTransition(async () => {
      await claimCredential(badgeId)
    })
  }

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-600">
          I accept this credential and understand it will be added to my VeriCred wallet and
          made publicly verifiable.
        </span>
      </label>

      <Button
        onClick={handleClaim}
        disabled={!agreed || isPending}
        isLoading={isPending}
        className="w-full"
      >
        {isPending ? 'Claiming…' : 'Accept & Claim Credential'}
      </Button>
    </div>
  )
}
