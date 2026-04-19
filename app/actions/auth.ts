'use server'

import { createHash, randomInt } from 'crypto'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { sendOtpEmail } from '@/lib/email'
import { emailSchema } from '@/lib/validators'
import { rateLimit } from '@/lib/rate-limit'

/**
 * Generates and emails a 6-digit OTP for the given email address.
 * Creates the user account automatically if it does not exist (role: EARNER).
 * The OTP is stored as a SHA-256 hash with a 10-minute expiry.
 *
 * @param email - The user's email address
 * @returns { success: true } on success; throws on error
 */
export async function sendOtp(email: string): Promise<{ success: boolean; message?: string }> {
  // Server-side validation
  const parsed = emailSchema.safeParse({ email })
  if (!parsed.success) {
    return { success: false, message: 'Invalid email address.' }
  }

  const normalizedEmail = parsed.data.email

  // Rate limit: 5 OTP requests per email per 10 minutes
  const rl = rateLimit(`otp:${normalizedEmail}`, 5, 600)
  if (!rl.success) {
    return { success: false, message: 'Too many requests. Please wait before requesting another code.' }
  }

  // Also rate limit by IP: 10 OTP requests per IP per 10 minutes
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipRl = rateLimit(`otp-ip:${ip}`, 10, 600)
  if (!ipRl.success) {
    return { success: false, message: 'Too many requests from your network. Please try again later.' }
  }

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (!user) {
    user = await prisma.user.create({
      data: { email: normalizedEmail, role: 'EARNER' },
    })
  }

  // Generate 6-digit OTP (cryptographically random)
  const otp = String(randomInt(100000, 999999 + 1)).padStart(6, '0')

  // Hash OTP before storing
  const otpHash = createHash('sha256').update(otp).digest('hex')
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode: otpHash, otpExpiry },
  })

  // Send OTP email via Resend
  await sendOtpEmail(normalizedEmail, otp)

  return { success: true }
}
