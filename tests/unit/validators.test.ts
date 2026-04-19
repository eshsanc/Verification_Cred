import { describe, it, expect } from 'vitest'
import { emailSchema, otpSchema, credentialSchema } from '@/lib/validators'

describe('emailSchema', () => {
  it('accepts valid email and lowercases it', () => {
    const result = emailSchema.safeParse({ email: 'Alice@Example.COM' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('alice@example.com')
  })

  it('rejects missing email', () => {
    expect(emailSchema.safeParse({}).success).toBe(false)
  })

  it('rejects non-email string', () => {
    expect(emailSchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
  })

  it('rejects empty string', () => {
    expect(emailSchema.safeParse({ email: '' }).success).toBe(false)
  })
})

describe('otpSchema', () => {
  it('accepts 6-digit numeric OTP', () => {
    expect(otpSchema.safeParse({ otp: '123456' }).success).toBe(true)
  })

  it('rejects OTP shorter than 6 digits', () => {
    expect(otpSchema.safeParse({ otp: '12345' }).success).toBe(false)
  })

  it('rejects OTP longer than 6 digits', () => {
    expect(otpSchema.safeParse({ otp: '1234567' }).success).toBe(false)
  })

  it('rejects OTP with letters', () => {
    expect(otpSchema.safeParse({ otp: '12345a' }).success).toBe(false)
  })

  it('rejects OTP with spaces', () => {
    expect(otpSchema.safeParse({ otp: '123 45' }).success).toBe(false)
  })
})

describe('credentialSchema', () => {
  const validInput = {
    recipientEmail: 'alice@example.com',
    name: 'TypeScript Fundamentals',
    description: 'Demonstrates TypeScript proficiency.',
    criteriaUrl: 'https://example.com/criteria',
    evidenceUrl: '',
    expiresAt: '',
  }

  it('accepts a fully valid input', () => {
    expect(credentialSchema.safeParse(validInput).success).toBe(true)
  })

  it('lowercases recipientEmail', () => {
    const result = credentialSchema.safeParse({ ...validInput, recipientEmail: 'Alice@Example.COM' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.recipientEmail).toBe('alice@example.com')
  })

  it('rejects invalid recipientEmail', () => {
    expect(credentialSchema.safeParse({ ...validInput, recipientEmail: 'notanemail' }).success).toBe(false)
  })

  it('rejects empty name', () => {
    expect(credentialSchema.safeParse({ ...validInput, name: '' }).success).toBe(false)
  })

  it('rejects name over 200 chars', () => {
    expect(credentialSchema.safeParse({ ...validInput, name: 'a'.repeat(201) }).success).toBe(false)
  })

  it('rejects empty description', () => {
    expect(credentialSchema.safeParse({ ...validInput, description: '' }).success).toBe(false)
  })

  it('rejects invalid criteriaUrl', () => {
    expect(credentialSchema.safeParse({ ...validInput, criteriaUrl: 'not-a-url' }).success).toBe(false)
  })

  it('accepts empty criteriaUrl', () => {
    expect(credentialSchema.safeParse({ ...validInput, criteriaUrl: '' }).success).toBe(true)
  })

  it('accepts undefined optional fields', () => {
    const { criteriaUrl, evidenceUrl, expiresAt, ...minimal } = validInput
    expect(credentialSchema.safeParse(minimal).success).toBe(true)
  })

  it('rejects invalid expiresAt', () => {
    expect(credentialSchema.safeParse({ ...validInput, expiresAt: 'not-a-date' }).success).toBe(false)
  })

  it('accepts valid expiresAt', () => {
    expect(credentialSchema.safeParse({ ...validInput, expiresAt: '2025-12-31' }).success).toBe(true)
  })
})
