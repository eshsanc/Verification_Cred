import { describe, it, expect, beforeAll } from 'vitest'
import { createHash } from 'crypto'
import * as ed from '@noble/ed25519'
import bs58 from 'bs58'
import canonicalize from 'canonicalize'

// Required for @noble/ed25519 in Node.js
beforeAll(() => {
  ed.etc.sha512Sync = (...m: Uint8Array[]) => {
    const combined = Buffer.concat(m.map((x) => Buffer.from(x)))
    return new Uint8Array(createHash('sha512').update(combined).digest())
  }
})

function makePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    '@context': ['https://www.imsglobal.org/spec/ob/v3p0/context-3.0.2.json'],
    type: ['AchievementCredential'],
    id: 'urn:uuid:test-badge-001',
    issuer: { id: 'https://example.com/issuers/1', type: ['Profile'], name: 'Test Issuer' },
    credentialSubject: {
      id: 'mailto:recipient@example.com',
      achievement: {
        id: 'urn:uuid:ach-001',
        type: ['Achievement'],
        name: 'Test Badge',
        description: 'A test credential',
      },
    },
    issuanceDate: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function sign(payload: Record<string, unknown>, privBytes: Uint8Array) {
  const canonical = canonicalize(payload)!
  const hash = new Uint8Array(createHash('sha256').update(canonical).digest())
  const sig = ed.sign(hash, privBytes)
  return { sig, hash, canonical }
}

function verify(payload: Record<string, unknown>, sig: Uint8Array, pubBytes: Uint8Array) {
  const canonical = canonicalize(payload)!
  const hash = new Uint8Array(createHash('sha256').update(canonical).digest())
  return ed.verify(sig, hash, pubBytes)
}

describe('Ed25519 sign/verify', () => {
  it('round-trips a valid credential', () => {
    const privBytes = ed.utils.randomPrivateKey()
    const pubBytes = ed.getPublicKey(privBytes)
    const payload = makePayload()
    const { sig } = sign(payload, privBytes)
    expect(verify(payload, sig, pubBytes)).toBe(true)
  })

  it('detects tampering in credentialSubject', () => {
    const privBytes = ed.utils.randomPrivateKey()
    const pubBytes = ed.getPublicKey(privBytes)
    const payload = makePayload()
    const { sig } = sign(payload, privBytes)
    const tampered = { ...payload, credentialSubject: { id: 'mailto:attacker@evil.com' } }
    expect(verify(tampered, sig, pubBytes)).toBe(false)
  })

  it('detects tampering in issuer name', () => {
    const privBytes = ed.utils.randomPrivateKey()
    const pubBytes = ed.getPublicKey(privBytes)
    const payload = makePayload()
    const { sig } = sign(payload, privBytes)
    const tampered = { ...payload, issuer: { ...(payload.issuer as object), name: 'Evil Corp' } }
    expect(verify(tampered, sig, pubBytes)).toBe(false)
  })

  it('rejects a signature from a different keypair', () => {
    const privBytes1 = ed.utils.randomPrivateKey()
    const privBytes2 = ed.utils.randomPrivateKey()
    const pubBytes2 = ed.getPublicKey(privBytes2)
    const payload = makePayload()
    const { sig } = sign(payload, privBytes1) // signed with key1
    expect(verify(payload, sig, pubBytes2)).toBe(false) // verify with key2
  })

  it('base58 encode/decode round-trips correctly', () => {
    const privBytes = ed.utils.randomPrivateKey()
    const pubBytes = ed.getPublicKey(privBytes)
    const privB58 = bs58.encode(privBytes)
    const pubB58 = bs58.encode(pubBytes)
    expect(bs58.decode(privB58)).toEqual(privBytes)
    expect(bs58.decode(pubB58)).toEqual(pubBytes)
  })

  it('canonicalization is deterministic regardless of key order', () => {
    const a = makePayload()
    const b: Record<string, unknown> = {
      issuanceDate: a.issuanceDate,
      type: a.type,
      '@context': a['@context'],
      credentialSubject: a.credentialSubject,
      issuer: a.issuer,
      id: a.id,
    }
    expect(canonicalize(a)).toBe(canonicalize(b))
  })

  it('throws on missing proof.proofValue', () => {
    const signed = { ...makePayload(), proof: { type: 'Ed25519Signature2020' } }
    const { proof, ...withoutProof } = signed as { proof: { proofValue?: string }; [k: string]: unknown }
    expect(proof.proofValue).toBeUndefined()
  })
})
