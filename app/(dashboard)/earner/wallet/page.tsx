import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CredentialCard } from '@/components/credential-card'

export const metadata = { title: 'My Wallet' }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/**
 * /earner/wallet — responsive credential gallery for the authenticated earner.
 */
export default async function WalletPage() {
  const session = await auth()
  const userId = session?.user?.id

  const credentials = await prisma.issuedCredential.findMany({
    where: { recipientId: userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      issuer: { select: { name: true } },
    },
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
        <p className="mt-1 text-sm text-gray-500">
          {credentials.length} credential{credentials.length !== 1 ? 's' : ''}
        </p>
      </div>

      {credentials.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
          <p className="text-gray-500 font-medium">No credentials yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Credentials you claim from invitation emails will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {credentials.map((cred) => (
            <CredentialCard
              key={cred.id}
              badgeId={cred.badgeId}
              name={cred.name}
              description={cred.description}
              issuerName={cred.issuer.name}
              issuedAt={cred.issuedAt}
              expiresAt={cred.expiresAt}
              criteriaUrl={cred.criteriaUrl}
              evidenceUrl={cred.evidenceUrl}
              status={cred.status}
              isPublic={cred.isPublic}
              verifyUrl={`${APP_URL}/verify/${cred.badgeId}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
