import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { verifyCredential } from '@/lib/crypto'
import { StatusBadge } from '@/components/ui/badge'
import { QrCode } from '@/components/qr-code'
import { ShareButtons } from '@/components/share-buttons'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  User,
  Building2,
  Link as LinkIcon,
} from 'lucide-react'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface Props {
  params: Promise<{ badgeId: string }>
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getVerificationData(badgeId: string) {
  const credential = await prisma.issuedCredential.findUnique({
    where: { badgeId },
    select: {
      name: true,
      description: true,
      status: true,
      isPublic: true,
      issuedAt: true,
      expiresAt: true,
      criteriaUrl: true,
      evidenceUrl: true,
      jsonLd: true,
      issuer: { select: { name: true, website: true, publicKey: true } },
      recipient: { select: { email: true } },
    },
  })

  return credential
}

// ── Metadata (Open Graph) ─────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { badgeId } = await params
  const cred = await getVerificationData(badgeId)
  if (!cred) return { title: 'Credential Not Found' }

  const verifyUrl = `${APP_URL}/verify/${badgeId}`
  const title = `${cred.name} — VeriCred`
  const description = `Issued by ${cred.issuer.name}. Verify this Open Badges 3.0 credential.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: verifyUrl,
      siteName: 'VeriCred',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}***@${domain}`
}

// ── Trust status UI helpers ───────────────────────────────────────────────────

type TrustState = 'valid' | 'invalid' | 'revoked' | 'expired'

function getTrustState(
  signatureValid: boolean,
  status: string,
  expiresAt: Date | null,
): TrustState {
  if (status === 'REVOKED') return 'revoked'
  if (expiresAt && new Date(expiresAt) < new Date()) return 'expired'
  if (!signatureValid) return 'invalid'
  return 'valid'
}

const trustConfig: Record<
  TrustState,
  { icon: React.ReactNode; heading: string; subtext: string; colors: string }
> = {
  valid: {
    icon: <CheckCircle2 className="h-10 w-10 text-green-500" />,
    heading: 'Credential Verified',
    subtext: 'The cryptographic signature is valid and the credential has not been revoked.',
    colors: 'bg-green-50 border-green-200',
  },
  invalid: {
    icon: <XCircle className="h-10 w-10 text-red-500" />,
    heading: 'Invalid Signature',
    subtext: 'The credential signature could not be verified. This credential may have been tampered with.',
    colors: 'bg-red-50 border-red-200',
  },
  revoked: {
    icon: <AlertTriangle className="h-10 w-10 text-orange-500" />,
    heading: 'Credential Revoked',
    subtext: 'This credential has been revoked by the issuer and is no longer valid.',
    colors: 'bg-orange-50 border-orange-200',
  },
  expired: {
    icon: <AlertTriangle className="h-10 w-10 text-yellow-500" />,
    heading: 'Credential Expired',
    subtext: 'This credential is past its expiration date.',
    colors: 'bg-yellow-50 border-yellow-200',
  },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function VerifyPage({ params }: Props) {
  const { badgeId } = await params
  const credential = await getVerificationData(badgeId)

  if (!credential) notFound()

  // Private credentials are not publicly accessible — return 404 to avoid info leakage.
  if (!credential.isPublic && credential.status === 'CLAIMED') notFound()

  // Run signature verification (server-side, never exposed to client)
  let signatureValid = false
  if (credential.status !== 'REVOKED') {
    try {
      signatureValid = await verifyCredential(
        credential.jsonLd as Record<string, unknown>,
        credential.issuer.publicKey,
      )
    } catch {
      signatureValid = false
    }
  }

  const trustState = getTrustState(signatureValid, credential.status, credential.expiresAt)
  const config = trustConfig[trustState]
  const verifyUrl = `${APP_URL}/verify/${badgeId}`

  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-blue-600 font-semibold text-lg mb-1">
            <ShieldCheck className="h-5 w-5" />
            VeriCred
          </div>
          <p className="text-sm text-gray-500">Open Badges 3.0 Credential Verification</p>
        </div>

        {/* Trust status banner */}
        <div className={`rounded-xl border p-6 flex items-start gap-4 ${config.colors}`}>
          <div className="shrink-0 mt-0.5">{config.icon}</div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{config.heading}</h1>
            <p className="mt-1 text-sm text-gray-600">{config.subtext}</p>
          </div>
        </div>

        {/* Credential details card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">

          {/* Credential identity */}
          <div className="p-6">
            <div className="mb-3">
              <StatusBadge status={credential.status} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{credential.name}</h2>
            <p className="mt-2 text-sm text-gray-600">{credential.description}</p>
          </div>

          {/* Metadata rows */}
          <div className="divide-y divide-gray-100">
            <MetaRow icon={<Building2 className="h-4 w-4" />} label="Issuer">
              {credential.issuer.website ? (
                <a
                  href={credential.issuer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {credential.issuer.name}
                </a>
              ) : (
                credential.issuer.name
              )}
            </MetaRow>

            <MetaRow icon={<User className="h-4 w-4" />} label="Recipient">
              {maskEmail(credential.recipient.email)}
            </MetaRow>

            <MetaRow icon={<Calendar className="h-4 w-4" />} label="Issued">
              {fmt(credential.issuedAt)}
            </MetaRow>

            {credential.expiresAt && (
              <MetaRow icon={<Calendar className="h-4 w-4" />} label="Expires">
                {fmt(credential.expiresAt)}
              </MetaRow>
            )}

            {credential.criteriaUrl && (
              <MetaRow icon={<LinkIcon className="h-4 w-4" />} label="Criteria">
                <a
                  href={credential.criteriaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {credential.criteriaUrl}
                </a>
              </MetaRow>
            )}

            {credential.evidenceUrl && (
              <MetaRow icon={<LinkIcon className="h-4 w-4" />} label="Evidence">
                <a
                  href={credential.evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {credential.evidenceUrl}
                </a>
              </MetaRow>
            )}
          </div>
        </div>

        {/* QR code + verification URL */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 flex flex-col sm:flex-row items-center gap-6">
          <QrCode url={verifyUrl} size={160} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
              Verification URL
            </p>
            <p className="text-sm text-gray-700 break-all font-mono">{verifyUrl}</p>
            <p className="mt-3 text-xs text-gray-400">
              Scan this QR code or share the URL above to allow anyone to verify this credential.
            </p>
          </div>
        </div>

        {/* Share buttons */}
        <ShareButtons
          verifyUrl={verifyUrl}
          credentialName={credential.name}
          issuerName={credential.issuer.name}
        />

        {/* Signature technical details */}
        <details className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <summary className="px-6 py-4 cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 select-none">
            Technical Details
          </summary>
          <div className="px-6 pb-6 space-y-3 text-xs text-gray-600">
            <DetailRow label="Signature scheme" value="Ed25519Signature2020" />
            <DetailRow label="Canonicalization" value="RFC 8785 JSON Canonicalization Scheme" />
            <DetailRow label="Hash" value="SHA-256" />
            <DetailRow
              label="Signature status"
              value={signatureValid ? '✓ Valid' : '✗ Invalid / missing'}
            />
            <DetailRow label="Credential status" value={credential.status} />
            <DetailRow label="Badge ID" value={badgeId} />
          </div>
        </details>

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="px-6 py-4 flex items-start gap-3">
      <span className="mt-0.5 text-gray-400 shrink-0">{icon}</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <div className="mt-0.5 text-sm text-gray-800">{children}</div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-44 shrink-0">{label}</span>
      <span className="font-mono break-all">{value}</span>
    </div>
  )
}
