import { describe, it, expect } from 'vitest'
import { buildCredentialPayload, type CredentialData } from '@/lib/openbadges'

const mockIssuer = {
  id: 'issuer-001',
  name: 'Acme Corp',
  website: 'https://acme.example.com',
  publicKey: 'testpubkey',
}

const baseData: CredentialData = {
  badgeId: '550e8400-e29b-41d4-a716-446655440000',
  name: 'TypeScript Fundamentals',
  description: 'Demonstrates TypeScript proficiency.',
  recipientEmail: 'alice@example.com',
  issuedAt: new Date('2024-01-15T10:00:00.000Z'),
  criteriaUrl: 'https://acme.example.com/criteria/ts',
  evidenceUrl: null,
  expiresAt: null,
}

describe('buildCredentialPayload — OB 3.0 compliance', () => {
  it('includes required @context', () => {
    const payload = buildCredentialPayload(baseData, mockIssuer)
    expect(payload['@context']).toContain('https://www.imsglobal.org/spec/ob/v3p0/context-3.0.2.json')
  })

  it('sets type to AchievementCredential', () => {
    const payload = buildCredentialPayload(baseData, mockIssuer)
    expect(payload.type).toContain('AchievementCredential')
  })

  it('sets id as urn:uuid:{badgeId}', () => {
    const payload = buildCredentialPayload(baseData, mockIssuer)
    expect(payload.id).toBe(`urn:uuid:${baseData.badgeId}`)
  })

  it('sets issuer name and url', () => {
    const payload = buildCredentialPayload(baseData, mockIssuer)
    const issuer = payload.issuer as Record<string, unknown>
    expect(issuer.name).toBe('Acme Corp')
    expect(issuer.url).toBe('https://acme.example.com')
  })

  it('sets credentialSubject.id as mailto:{email}', () => {
    const payload = buildCredentialPayload(baseData, mockIssuer)
    const subject = payload.credentialSubject as Record<string, unknown>
    expect(subject.id).toBe('mailto:alice@example.com')
  })

  it('sets achievement name and description', () => {
    const payload = buildCredentialPayload(baseData, mockIssuer)
    const subject = payload.credentialSubject as Record<string, unknown>
    const achievement = subject.achievement as Record<string, unknown>
    expect(achievement.name).toBe(baseData.name)
    expect(achievement.description).toBe(baseData.description)
  })

  it('includes criteria when provided', () => {
    const payload = buildCredentialPayload(baseData, mockIssuer)
    const subject = payload.credentialSubject as Record<string, unknown>
    const achievement = subject.achievement as Record<string, unknown>
    const criteria = achievement.criteria as Record<string, unknown>
    expect(criteria.id).toBe(baseData.criteriaUrl)
  })

  it('omits criteria when not provided', () => {
    const payload = buildCredentialPayload({ ...baseData, criteriaUrl: null }, mockIssuer)
    const subject = payload.credentialSubject as Record<string, unknown>
    const achievement = subject.achievement as Record<string, unknown>
    expect(achievement.criteria).toBeUndefined()
  })

  it('includes evidence array when evidenceUrl provided', () => {
    const payload = buildCredentialPayload({ ...baseData, evidenceUrl: 'https://example.com/ev' }, mockIssuer)
    const evidence = payload.evidence as Array<Record<string, unknown>>
    expect(Array.isArray(evidence)).toBe(true)
    expect(evidence[0]?.id).toBe('https://example.com/ev')
  })

  it('omits evidence when not provided', () => {
    const payload = buildCredentialPayload(baseData, mockIssuer)
    expect(payload.evidence).toBeUndefined()
  })

  it('sets issuanceDate as ISO 8601', () => {
    const payload = buildCredentialPayload(baseData, mockIssuer)
    expect(payload.issuanceDate).toBe('2024-01-15T10:00:00.000Z')
  })

  it('sets expirationDate when provided', () => {
    const expiresAt = new Date('2025-01-15T10:00:00.000Z')
    const payload = buildCredentialPayload({ ...baseData, expiresAt }, mockIssuer)
    expect(payload.expirationDate).toBe('2025-01-15T10:00:00.000Z')
  })

  it('omits expirationDate when not provided', () => {
    const payload = buildCredentialPayload(baseData, mockIssuer)
    expect(payload.expirationDate).toBeUndefined()
  })

  it('does not include proof block (proof added by signCredential)', () => {
    const payload = buildCredentialPayload(baseData, mockIssuer)
    expect(payload.proof).toBeUndefined()
  })
})
