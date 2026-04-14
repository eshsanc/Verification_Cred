import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Earner dashboard — overview of wallet stats and quick links.
 */
export default async function EarnerDashboardPage() {
  const session = await auth()
  const userId = session?.user?.id

  const [total, claimed, pending] = await Promise.all([
    prisma.issuedCredential.count({ where: { recipientId: userId } }),
    prisma.issuedCredential.count({ where: { recipientId: userId, status: 'CLAIMED' } }),
    prisma.issuedCredential.count({ where: { recipientId: userId, status: 'PENDING' } }),
  ])

  const stats = [
    { label: 'Total Credentials', value: total, color: 'text-blue-600' },
    { label: 'Claimed', value: claimed, color: 'text-green-600' },
    { label: 'Awaiting Claim', value: pending, color: 'text-yellow-600' },
  ]

  // Fetch most recent claimed credentials for preview
  const recentCredentials = await prisma.issuedCredential.findMany({
    where: { recipientId: userId, status: 'CLAIMED' },
    orderBy: { updatedAt: 'desc' },
    take: 3,
    include: { issuer: { select: { name: true } } },
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {session?.user?.name ?? session?.user?.email}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent credentials */}
      {recentCredentials.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Credentials</h2>
          <div className="space-y-3">
            {recentCredentials.map((cred) => (
              <Card key={cred.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-gray-900">{cred.name}</p>
                    <p className="text-sm text-gray-500">Issued by {cred.issuer.name}</p>
                  </div>
                  <Link
                    href={`/verify/${cred.badgeId}`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View →
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Credential Wallet</CardTitle>
            <CardDescription>
              View and manage all your earned credentials in one place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/earner/wallet"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Open Wallet →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Claim a Credential</CardTitle>
            <CardDescription>
              Have a claim link from an issuer? Use it to add the credential to your wallet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Open the claim link from your invitation email.
            </p>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
