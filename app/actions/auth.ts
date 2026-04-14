'use server'

import { createHash, randomInt } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendOtpEmail } from '@/lib/email'
import { emailSchema } from '@/lib/validators'

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
