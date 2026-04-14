import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/credentials/[id]
 *
 * Returns the full signed JSON-LD payload for a credential.
 * - Public credentials (isPublic=true): accessible without authentication.
 * - Private credentials: only accessible to the credential's recipient.
 *
 * @param params.id - The badgeId of the credential
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: badgeId } = await params

  const credential = await prisma.issuedCredential.findUnique({
    where: { badgeId },
    select: {
      isPublic: true,
      recipientId: true,
      jsonLd: true,
      status: true,
    },
  })

  if (!credential) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Private credentials require the authenticated recipient
  if (!credential.isPublic) {
    const session = await auth()
    if (!session?.user || session.user.id !== credential.recipientId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  return NextResponse.json(credential.jsonLd)
}
