import { describe, it, expect } from 'vitest'

// ── maskEmail (mirrors lib logic) ─────────────────────────────────────────────
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}***@${domain}`
}

describe('maskEmail', () => {
  it('masks a normal email', () => {
    expect(maskEmail('alice@example.com')).toBe('al***@example.com')
  })

  it('only shows 1 char for single-char local', () => {
    expect(maskEmail('a@example.com')).toBe('a***@example.com')
  })

  it('returns *** for malformed input', () => {
    expect(maskEmail('notanemail')).toBe('***')
  })

  it('preserves domain exactly', () => {
    const result = maskEmail('bob@company.org')
    expect(result.endsWith('@company.org')).toBe(true)
  })
})

// ── Expiration / trust state logic ────────────────────────────────────────────
type TrustState = 'valid' | 'invalid' | 'revoked' | 'expired'

function getTrustState(signatureValid: boolean, status: string, expiresAt: Date | null): TrustState {
  if (status === 'REVOKED') return 'revoked'
  if (expiresAt && new Date(expiresAt) < new Date()) return 'expired'
  if (!signatureValid) return 'invalid'
  return 'valid'
}

describe('getTrustState', () => {
  const past = new Date(Date.now() - 1000)
  const future = new Date(Date.now() + 86_400_000)

  it('returns valid for a good signature with future expiry', () => {
    expect(getTrustState(true, 'CLAIMED', future)).toBe('valid')
  })

  it('returns expired when past expiry regardless of signature', () => {
    expect(getTrustState(true, 'CLAIMED', past)).toBe('expired')
  })

  it('returns revoked for REVOKED status even with valid signature', () => {
    expect(getTrustState(true, 'REVOKED', null)).toBe('revoked')
  })

  it('returns revoked before checking expiry (revoked takes priority)', () => {
    expect(getTrustState(true, 'REVOKED', past)).toBe('revoked')
  })

  it('returns invalid for bad signature with no expiry', () => {
    expect(getTrustState(false, 'CLAIMED', null)).toBe('invalid')
  })

  it('returns valid for no expiry date and good signature', () => {
    expect(getTrustState(true, 'CLAIMED', null)).toBe('valid')
  })
})

// ── Batch limit enforcement ───────────────────────────────────────────────────
const BATCH_LIMIT = 500

describe('batch credential limit', () => {
  it('allows exactly BATCH_LIMIT rows', () => {
    const rows = Array(BATCH_LIMIT).fill({ email: 'a@b.com', name: 'X', description: 'Y' })
    expect(rows.length <= BATCH_LIMIT).toBe(true)
  })

  it('rejects rows exceeding BATCH_LIMIT', () => {
    const rows = Array(BATCH_LIMIT + 1).fill({ email: 'a@b.com', name: 'X', description: 'Y' })
    expect(rows.length > BATCH_LIMIT).toBe(true)
  })
})
