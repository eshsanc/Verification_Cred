import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Issuer dashboard — overview of issuance stats and quick actions.
 */
export default async function IssuerDashboardPage() {
  const session = await auth()

  // Scope stats to the first IssuerProfile (MVP: one issuer per deployment)
  const issuerProfile = await prisma.issuerProfile.findFirst({ select: { id: true } })
  const issuerId = issuerProfile?.id

  const [total, pending, claimed, revoked] = await Promise.all([
    prisma.issuedCredential.count({ where: issuerId ? { issuerId } : {} }),
    prisma.issuedCredential.count({ where: issuerId ? { issuerId, status: 'PENDING' } : { status: 'PENDING' } }),
    prisma.issuedCredential.count({ where: issuerId ? { issuerId, status: 'CLAIMED' } : { status: 'CLAIMED' } }),
    prisma.issuedCredential.count({ where: issuerId ? { issuerId, status: 'REVOKED' } : { status: 'REVOKED' } }),
  ])

  const stats = [
    { label: 'Total Issued', value: total, color: 'text-blue-600' },
    { label: 'Pending Claim', value: pending, color: 'text-yellow-600' },
    { label: 'Claimed', value: claimed, color: 'text-green-600' },
    { label: 'Revoked', value: revoked, color: 'text-red-600' },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Issuer Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {session?.user?.name ?? session?.user?.email}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Issue a Credential</CardTitle>
            <CardDescription>
              Create and send a new Open Badges 3.0 credential to a recipient.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/issuer/create"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Issue Credential →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>View All Credentials</CardTitle>
            <CardDescription>
              Browse, filter, and manage all credentials you have issued.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/issuer/credentials"
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              View Credentials →
            </Link>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
