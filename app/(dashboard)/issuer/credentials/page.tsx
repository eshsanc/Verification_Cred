import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/badge'
import { RevokeButton } from './revoke-button'
import type { Status } from '@prisma/client'

export const metadata = { title: 'All Credentials' }

const STATUSES: Array<Status | 'ALL'> = ['ALL', 'PENDING', 'CLAIMED', 'REVOKED', 'EXPIRED']

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

/**
 * /issuer/credentials — Full list of issued credentials with status filter.
 */
export default async function CredentialsListPage({ searchParams }: PageProps) {
  const { status: rawStatus } = await searchParams
  const statusFilter = STATUSES.includes(rawStatus as Status)
    ? (rawStatus as Status)
    : 'ALL'

  // Scope to the first IssuerProfile (MVP: one issuer per deployment)
  const issuerProfile = await prisma.issuerProfile.findFirst({ select: { id: true } })
  const issuerId = issuerProfile?.id

  const credentials = await prisma.issuedCredential.findMany({
    where: {
      ...(issuerId ? { issuerId } : {}),
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    },
    orderBy: { issuedAt: 'desc' },
    include: {
      recipient: { select: { email: true, name: true } },
      issuer: { select: { name: true } },
    },
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Credentials</h1>
          <p className="mt-1 text-sm text-gray-500">
            {credentials.length} credential{credentials.length !== 1 ? 's' : ''}
            {statusFilter !== 'ALL' ? ` with status ${statusFilter}` : ' total'}
          </p>
        </div>
        <Link
          href="/issuer/create"
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Issue Credential
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === 'ALL' ? '/issuer/credentials' : `/issuer/credentials?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              statusFilter === s || (s === 'ALL' && statusFilter === 'ALL')
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      {/* Table */}
      {credentials.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-500">No credentials found.</p>
          <Link href="/issuer/create" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
            Issue your first credential →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Credential', 'Recipient', 'Status', 'Issued', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {credentials.map((cred) => (
                <tr key={cred.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{cred.name}</p>
                    <p className="text-xs text-gray-400 font-mono truncate max-w-[200px]">
                      {cred.badgeId}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {cred.recipient.name && (
                      <p className="font-medium text-gray-800">{cred.recipient.name}</p>
                    )}
                    <p>{cred.recipient.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={cred.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(cred.issuedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/verify/${cred.badgeId}`}
                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                        target="_blank"
                      >
                        Verify
                      </Link>
                      {cred.status !== 'REVOKED' && (
                        <RevokeButton badgeId={cred.badgeId} credentialName={cred.name} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
