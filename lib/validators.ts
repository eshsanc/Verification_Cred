import { z } from 'zod'

// ── Auth ──────────────────────────────────────────────────────────────────────

export const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase(),
})

export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
})

export type EmailInput = z.infer<typeof emailSchema>
export type OtpInput = z.infer<typeof otpSchema>

// ── Credential (Phase 2) ──────────────────────────────────────────────────────

// Accept optional URL: either a valid URL string or empty string
const optionalUrl = z.string().url('Must be a valid URL').optional().or(z.literal(''))

// Accept YYYY-MM-DD (from <input type="date">) or ISO datetime or empty
const optionalDate = z
  .string()
  .refine((v) => !v || !isNaN(Date.parse(v)), { message: 'Invalid date' })
  .optional()
  .or(z.literal(''))

export const credentialSchema = z.object({
  recipientEmail: z.string().email('Please enter a valid recipient email').toLowerCase(),
  name: z.string().min(1, 'Credential name is required').max(200),
  description: z.string().min(1, 'Description is required').max(2000),
  criteriaUrl: optionalUrl,
  evidenceUrl: optionalUrl,
  expiresAt: optionalDate,
})

export const csvRowSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  description: z.string().min(1),
  criteriaUrl: optionalUrl,
  evidenceUrl: optionalUrl,
  expiresAt: optionalDate,
})

export type CredentialInput = z.infer<typeof credentialSchema>
export type CsvRowInput = z.infer<typeof csvRowSchema>
