import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { StatusBadge } from '@/components/ui/badge'
import { ClaimButton } from './claim-button'

interface PageProps {
  params: Promise<{ badgeId: string }>
}

/**
 * /claim/[badgeId] — Credential claim page.
 * Shows a preview of the credential and an Accept & Claim button.
 * Middleware ensures the user is authenticated before reaching this page.
 */
export default async function ClaimPage({ params }: PageProps) {
  const { badgeId } = await params

  const credential = await prisma.issuedCredential.findUnique({
    where: { badgeId },
    include: {
      issuer: { select: { name: true, website: true } },
    },
  })

  if (!credential) notFound()

  // Non-pending credentials show an informational state instead of the claim form
  if (credential.status !== 'PENDING') {
    const messages: Record<string, { title: string; body: string; color: string }> = {
      CLAIMED: {
        title: 'Already claimed',
        body: 'This credential has already been claimed and added to a wallet.',
        color: 'bg-green-50 border-green-200 text-green-800',
      },
      REVOKED: {
        title: 'Credential revoked',
        body: 'This credential has been revoked by the issuer and is no longer valid.',
        color: 'bg-red-50 border-red-200 text-red-800',
      },
      EXPIRED: {
        title: 'Credential expired',
        body: 'This credential has passed its expiry date.',
        color: 'bg-gray-50 border-gray-200 text-gray-700',
      },
    }

    const msg = messages[credential.status] ?? {
      title: 'Unavailable',
      body: 'This credential is not available for claiming.',
      color: 'bg-gray-50 border-gray-200 text-gray-700',
    }

    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border bg-white shadow-sm p-8 text-center">
          <StatusBadge status={credential.status} className="mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">{msg.title}</h1>
          <div className={`rounded-lg border p-4 text-sm ${msg.color}`}>{msg.body}</div>
        </div>
      </main>
    )
  }

  const issuedDate = new Date(credential.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200 mb-3">
            VeriCred
          </span>
          <h1 className="text-2xl font-bold text-gray-900">You&apos;ve earned a credential!</h1>
          <p className="mt-1 text-sm text-gray-500">Review the details below and claim it to add it to your wallet.</p>
        </div>

        {/* Credential preview card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-8 text-white">
            <p className="text-sm font-medium text-blue-200 mb-1">Achievement Credential</p>
            <h2 className="text-xl font-bold leading-snug">{credential.name}</h2>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Issued by</p>
              <p className="text-sm font-medium text-gray-900">{credential.issuer.name}</p>
              {credential.issuer.website && (
                <a
                  href={credential.issuer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  {credential.issuer.website}
                </a>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Description</p>
              <p className="text-sm text-gray-700">{credential.description}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Issued on</p>
              <p className="text-sm text-gray-700">{issuedDate}</p>
            </div>

            {credential.criteriaUrl && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Criteria</p>
                <a
                  href={credential.criteriaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {credential.criteriaUrl}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Claim form */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <ClaimButton badgeId={badgeId} />
        </div>
      </div>
    </main>
  )
}
