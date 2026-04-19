import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCredential } from '@/lib/crypto'
import { rateLimit, getRequestKey } from '@/lib/rate-limit'

/**
 * GET /api/verify/[id]
 *
 * Public endpoint. Verifies the Ed25519 signature on a credential and returns
 * its trust status. Rate limited to 30 requests per minute per IP.
 *
 * @param params.id - The badgeId of the credential
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = rateLimit(getRequestKey(request, 'verify'), 30, 60)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const { id: badgeId } = await params

  const credential = await prisma.issuedCredential.findUnique({
    where: { badgeId },
    select: {
      name: true,
      status: true,
      issuedAt: true,
      expiresAt: true,
      jsonLd: true,
      issuer: { select: { name: true, publicKey: true } },
      recipient: { select: { email: true } },
    },
  })

  if (!credential) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Check expiration before crypto — an expired credential is invalid regardless of signature.
  if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
    return NextResponse.json({
      valid: false,
      status: 'EXPIRED',
      metadata: buildMetadata(credential),
    })
  }

  // If the credential is revoked we can skip crypto — trust is already broken.
  if (credential.status === 'REVOKED') {
    return NextResponse.json({
      valid: false,
      status: 'REVOKED',
      metadata: buildMetadata(credential),
    })
  }

  // Verify the Ed25519 signature.
  let valid = false
  let verifyError: string | undefined

  try {
    valid = await verifyCredential(
      credential.jsonLd as Record<string, unknown>,
      credential.issuer.publicKey,
    )
  } catch (err) {
    verifyError = err instanceof Error ? err.message : 'Verification failed'
    valid = false
  }

  return NextResponse.json({
    valid,
    status: credential.status,
    metadata: buildMetadata(credential),
    ...(verifyError ? { error: verifyError } : {}),
  })
}

/** Masks an email address to protect recipient privacy on public endpoints (e.g. a***@example.com). */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}***@${domain}`
}

function buildMetadata(credential: {
  name: string
  issuedAt: Date
  expiresAt: Date | null
  issuer: { name: string }
  recipient: { email: string }
}) {
  return {
    name: credential.name,
    issuerName: credential.issuer.name,
    issuedAt: credential.issuedAt.toISOString(),
    expiresAt: credential.expiresAt?.toISOString() ?? null,
    recipientEmail: maskEmail(credential.recipient.email),
  }
}
