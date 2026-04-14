import { randomUUID } from 'crypto'
import type { IssuerProfile } from '@prisma/client'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export interface CredentialData {
  badgeId: string
  name: string
  description: string
  criteriaUrl?: string | null
  evidenceUrl?: string | null
  recipientEmail: string
  issuedAt: Date
  expiresAt?: Date | null
}

/**
 * Builds an Open Badges 3.0 AchievementCredential JSON-LD payload WITHOUT the proof.
 * The proof block is attached by `signCredential()` in lib/crypto.ts after signing.
 *
 * @see https://www.imsglobal.org/spec/ob/v3p0
 */
export function buildCredentialPayload(
  data: CredentialData,
  issuer: Pick<IssuerProfile, 'id' | 'name' | 'website' | 'publicKey'>,
): Record<string, unknown> {
  const achievementId = randomUUID()

  const payload: Record<string, unknown> = {
    '@context': ['https://www.imsglobal.org/spec/ob/v3p0/context-3.0.2.json'],
    type: ['AchievementCredential'],
    id: `urn:uuid:${data.badgeId}`,
    issuer: {
      id: `${APP_URL}/issuers/${issuer.id}`,
      type: ['Profile'],
      name: issuer.name,
      ...(issuer.website ? { url: issuer.website } : {}),
    },
    credentialSubject: {
      id: `mailto:${data.recipientEmail}`,
      achievement: {
        id: `urn:uuid:${achievementId}`,
        type: ['Achievement'],
        name: data.name,
        description: data.description,
        ...(data.criteriaUrl ? { criteria: { id: data.criteriaUrl } } : {}),
      },
    },
    issuanceDate: data.issuedAt.toISOString(),
    ...(data.expiresAt ? { expirationDate: data.expiresAt.toISOString() } : {}),
  }

  if (data.evidenceUrl) {
    payload['evidence'] = [{ id: data.evidenceUrl, type: ['Evidence'] }]
  }

  return payload
}
