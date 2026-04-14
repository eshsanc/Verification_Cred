'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  const credential = await prisma.issuedCredential.findUnique({
    where: { badgeId },
    select: { status: true },
  })

  if (!credential) redirect('/earner/wallet')

  if (credential.status !== 'PENDING') redirect('/earner/wallet')

  await prisma.issuedCredential.update({
    where: { badgeId },
    data: {
      status: 'CLAIMED',
      recipientId: session.user.id,
      isPublic: true,
    },
  })

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
