'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export interface ClaimResult {
  success: boolean
  error?: string
}

/**
 * Claims a pending credential for the authenticated user.
 * Updates status to CLAIMED, links recipientId to current user,
 * and sets isPublic to true. Redirects to /earner/wallet on success.
 *
 * @param badgeId - The unique badge identifier from the claim URL
 */
export async function claimCredential(badgeId: string): Promise<void> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Rate limit: 10 claim attempts per user per hour
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = rateLimit(`claim:${session.user.id ?? ip}`, 10, 3600)
  if (!rl.success) redirect('/earner/wallet')

  const credential = await prisma.issuedCredential.findUnique({
    where: { badgeId },
    select: { status: true, recipient: { select: { email: true } } },
  })

  if (!credential) redirect('/earner/wallet')

  if (credential.status !== 'PENDING') redirect('/earner/wallet')

  // Verify the authenticated user's email matches the intended recipient.
  // This prevents a user who has the claim URL from stealing another person's credential.
  if (credential.recipient.email.toLowerCase() !== session.user.email.toLowerCase()) {
    redirect('/earner/wallet')
  }

  // Atomic update: WHERE clause ensures status is still PENDING at write time,
  // preventing a double-claim race condition.
  const updated = await prisma.issuedCredential.updateMany({
    where: { badgeId, status: 'PENDING' },
    data: {
      status: 'CLAIMED',
      recipientId: session.user.id,
      isPublic: true,
    },
  })

  // If count is 0 the credential was claimed between our read and write — treat as already claimed
  if (updated.count === 0) redirect('/earner/wallet')

  revalidatePath('/earner/wallet')
  revalidatePath('/earner')
  revalidatePath(`/verify/${badgeId}`)

  redirect('/earner/wallet')
}

/**
 * Toggles public/private visibility for a credential.
 * Only the credential's recipient can change visibility.
 *
 * @param badgeId  - The unique badge identifier
 * @param isPublic - New visibility state
 */
export async function toggleVisibility(badgeId: string, isPublic: boolean): Promise<ClaimResult> {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Unauthenticated' }

    const credential = await prisma.issuedCredential.findUnique({
      where: { badgeId },
      select: { recipientId: true },
    })

    if (!credential) return { success: false, error: 'Credential not found' }
    if (credential.recipientId !== session.user.id) return { success: false, error: 'Forbidden' }

    await prisma.issuedCredential.update({
      where: { badgeId },
      data: { isPublic },
    })

    revalidatePath('/earner/wallet')
    revalidatePath(`/verify/${badgeId}`)

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
