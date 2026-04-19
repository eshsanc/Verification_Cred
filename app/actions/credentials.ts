'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildCredentialPayload } from '@/lib/openbadges'
import { signCredential } from '@/lib/crypto'
import { sendInvitationEmail } from '@/lib/email'
import { credentialSchema, csvRowSchema, type CredentialInput } from '@/lib/validators'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/** Asserts the caller is an authenticated ISSUER or ADMIN. */
async function assertIssuer() {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthenticated')
  if (session.user.role !== 'ISSUER' && session.user.role !== 'ADMIN') {
    throw new Error('Forbidden: ISSUER or ADMIN role required')
  }
  return session.user
}

/** Returns the first IssuerProfile, creating a placeholder if none exists. */
async function getIssuerProfile() {
  const profile = await prisma.issuerProfile.findFirst()
  if (!profile) throw new Error('No IssuerProfile found. Run the seed script first.')
  return profile
}

/** Finds or creates a User with EARNER role by email. */
async function upsertEarner(email: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, role: 'EARNER' },
  })
}

// ── Single credential issuance ────────────────────────────────────────────────

export interface CreateCredentialResult {
  success: boolean
  badgeId?: string
  claimUrl?: string
  error?: string
}

/**
 * Creates, signs, and emails a single Open Badges 3.0 credential.
 *
 * @param input - Validated credential form data
 */
export async function createCredential(
  input: CredentialInput,
): Promise<CreateCredentialResult> {
  try {
    await assertIssuer()

    // Server-side validation
    const data = credentialSchema.parse(input)

    const issuerProfile = await getIssuerProfile()
    const recipient = await upsertEarner(data.recipientEmail)

    const badgeId = randomUUID()
    const now = new Date()
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null

    // Build unsigned OB 3.0 JSON-LD payload
    const payload = buildCredentialPayload(
      {
        badgeId,
        name: data.name,
        description: data.description,
        criteriaUrl: data.criteriaUrl || null,
        evidenceUrl: data.evidenceUrl || null,
        recipientEmail: data.recipientEmail,
        issuedAt: now,
        expiresAt,
      },
      issuerProfile,
    )

    // Sign the payload (canonicalize → SHA-256 → Ed25519 → base58 proof)
    const signedPayload = await signCredential(payload, issuerProfile.privateKey, issuerProfile.id)

    // Persist to database
    await prisma.issuedCredential.create({
      data: {
        badgeId,
        name: data.name,
        description: data.description,
        criteriaUrl: data.criteriaUrl || null,
        evidenceUrl: data.evidenceUrl || null,
        expiresAt,
        status: 'PENDING',
        isPublic: false,
        jsonLd: signedPayload as object,
        recipientId: recipient.id,
        issuerId: issuerProfile.id,
      },
    })

    // Send invitation email
    const claimUrl = `${APP_URL}/claim/${badgeId}`
    await sendInvitationEmail(data.recipientEmail, data.name, issuerProfile.name, claimUrl)

    revalidatePath('/issuer/credentials')
    revalidatePath('/issuer')

    return { success: true, badgeId, claimUrl }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

// ── Batch CSV issuance ────────────────────────────────────────────────────────

export interface BatchRow {
  email: string
  name: string
  description: string
  criteriaUrl?: string
  evidenceUrl?: string
  expiresAt?: string
}

export interface BatchResult {
  total: number
  succeeded: number
  failed: number
  errors: Array<{ row: number; email: string; error: string }>
}

/**
 * Creates, signs, and emails credentials for multiple recipients from CSV data.
 * Processes rows sequentially; continues on row-level errors.
 *
 * @param rows - Pre-validated CSV rows from the client
 */
const BATCH_LIMIT = 500

export async function batchCreateCredentials(rows: BatchRow[]): Promise<BatchResult> {
  await assertIssuer()

  if (rows.length > BATCH_LIMIT) {
    return {
      total: rows.length,
      succeeded: 0,
      failed: rows.length,
      errors: [{ row: 0, email: '', error: `Batch exceeds maximum of ${BATCH_LIMIT} rows. Split into smaller files.` }],
    }
  }

  const issuerProfile = await getIssuerProfile()
  const result: BatchResult = { total: rows.length, succeeded: 0, failed: 0, errors: [] }

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i]!
    const rowNumber = i + 1

    try {
      // Validate row
      const parsed = csvRowSchema.safeParse({
        email: rawRow.email,
        name: rawRow.name,
        description: rawRow.description,
        criteriaUrl: rawRow.criteriaUrl ?? '',
        evidenceUrl: rawRow.evidenceUrl ?? '',
        expiresAt: rawRow.expiresAt ?? '',
      })

      if (!parsed.success) {
        const msg = parsed.error.errors.map((e) => e.message).join('; ')
        throw new Error(msg)
      }

      const data = parsed.data
      const recipient = await upsertEarner(data.email)
      const badgeId = randomUUID()
      const now = new Date()
      const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null

      const payload = buildCredentialPayload(
        {
          badgeId,
          name: data.name,
          description: data.description,
          criteriaUrl: data.criteriaUrl || null,
          evidenceUrl: data.evidenceUrl || null,
          recipientEmail: data.email,
          issuedAt: now,
          expiresAt,
        },
        issuerProfile,
      )

      const signedPayload = await signCredential(payload, issuerProfile.privateKey, issuerProfile.id)

      await prisma.issuedCredential.create({
        data: {
          badgeId,
          name: data.name,
          description: data.description,
          criteriaUrl: data.criteriaUrl || null,
          evidenceUrl: data.evidenceUrl || null,
          expiresAt,
          status: 'PENDING',
          isPublic: false,
          jsonLd: signedPayload as object,
          recipientId: recipient.id,
          issuerId: issuerProfile.id,
        },
      })

      const claimUrl = `${APP_URL}/claim/${badgeId}`
      await sendInvitationEmail(data.email, data.name, issuerProfile.name, claimUrl)

      result.succeeded++
    } catch (err) {
      result.failed++
      result.errors.push({
        row: rowNumber,
        email: rawRow?.email ?? '(unknown)',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  revalidatePath('/issuer/credentials')
  revalidatePath('/issuer')

  return result
}

// ── Revoke credential ─────────────────────────────────────────────────────────

export interface RevokeResult {
  success: boolean
  error?: string
}

/**
 * Revokes a credential by setting its status to REVOKED.
 * Only ISSUER and ADMIN roles can revoke.
 *
 * @param badgeId - The unique badge identifier
 */
export async function revokeCredential(badgeId: string): Promise<RevokeResult> {
  try {
    await assertIssuer()

    const issuerProfile = await getIssuerProfile()

    const credential = await prisma.issuedCredential.findUnique({
      where: { badgeId },
    })

    if (!credential) return { success: false, error: 'Credential not found' }
    if (credential.issuerId !== issuerProfile.id) return { success: false, error: 'Forbidden' }
    if (credential.status === 'REVOKED') return { success: false, error: 'Already revoked' }

    await prisma.issuedCredential.update({
      where: { badgeId },
      data: { status: 'REVOKED' },
    })

    revalidatePath('/issuer/credentials')
    revalidatePath(`/verify/${badgeId}`)

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
