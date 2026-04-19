import { describe, it, expect } from 'vitest'
import { csvRowSchema } from '@/lib/validators'

// Mirror the parseCSV function from the credential form for testing
function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = (lines[0] ?? '').split(',').map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const fields: string[] = []
    let current = ''
    let inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { fields.push(current.trim()); current = '' }
      else { current += ch }
    }
    fields.push(current.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = fields[i] ?? '' })
    return row
  })
}

const VALID_CSV = `email,name,description,criteriaUrl,evidenceUrl,expiresAt
alice@example.com,TypeScript Basics,Learn TS fundamentals,https://example.com/criteria,,
bob@example.com,React Patterns,"Advanced hooks, context, and perf",https://example.com/react,,2025-12-31`

describe('CSV parser', () => {
  it('parses a valid CSV with 2 rows', () => {
    const rows = parseCSV(VALID_CSV)
    expect(rows).toHaveLength(2)
  })

  it('extracts email correctly', () => {
    const rows = parseCSV(VALID_CSV)
    expect(rows[0]?.email).toBe('alice@example.com')
    expect(rows[1]?.email).toBe('bob@example.com')
  })

  it('handles quoted fields with commas', () => {
    const rows = parseCSV(VALID_CSV)
    expect(rows[1]?.description).toBe('Advanced hooks, context, and perf')
  })

  it('returns empty array for CSV with only headers', () => {
    const rows = parseCSV('email,name,description,criteriaUrl,evidenceUrl,expiresAt')
    expect(rows).toHaveLength(0)
  })

  it('returns empty array for empty string', () => {
    const rows = parseCSV('')
    expect(rows).toHaveLength(0)
  })
})

describe('csvRowSchema validation', () => {
  it('accepts a valid row', () => {
    const result = csvRowSchema.safeParse({
      email: 'alice@example.com',
      name: 'TypeScript Basics',
      description: 'Learn TS',
      criteriaUrl: 'https://example.com/criteria',
      evidenceUrl: '',
      expiresAt: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = csvRowSchema.safeParse({
      email: 'not-an-email',
      name: 'Test',
      description: 'Desc',
      criteriaUrl: '',
      evidenceUrl: '',
      expiresAt: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = csvRowSchema.safeParse({
      email: 'alice@example.com',
      name: '',
      description: 'Desc',
      criteriaUrl: '',
      evidenceUrl: '',
      expiresAt: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty description', () => {
    const result = csvRowSchema.safeParse({
      email: 'alice@example.com',
      name: 'Test',
      description: '',
      criteriaUrl: '',
      evidenceUrl: '',
      expiresAt: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid criteriaUrl', () => {
    const result = csvRowSchema.safeParse({
      email: 'alice@example.com',
      name: 'Test',
      description: 'Desc',
      criteriaUrl: 'not-a-url',
      evidenceUrl: '',
      expiresAt: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty optional fields', () => {
    const result = csvRowSchema.safeParse({
      email: 'alice@example.com',
      name: 'Test',
      description: 'Desc',
      criteriaUrl: '',
      evidenceUrl: '',
      expiresAt: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid expiresAt date', () => {
    const result = csvRowSchema.safeParse({
      email: 'alice@example.com',
      name: 'Test',
      description: 'Desc',
      criteriaUrl: '',
      evidenceUrl: '',
      expiresAt: 'not-a-date',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid expiresAt date', () => {
    const result = csvRowSchema.safeParse({
      email: 'alice@example.com',
      name: 'Test',
      description: 'Desc',
      criteriaUrl: '',
      evidenceUrl: '',
      expiresAt: '2025-12-31',
    })
    expect(result.success).toBe(true)
  })
})
