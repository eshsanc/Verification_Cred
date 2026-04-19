import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Role-based route protection middleware.
 *
 * Uses next-auth/jwt getToken() directly — no NextAuth config, no Prisma,
 * no providers. This keeps the Edge Function bundle well under Vercel's 1 MB limit.
 *
 * Route ACL:
 *  /issuer/*   → ADMIN, ISSUER only  (redirect EARNER → /earner)
 *  /earner/*   → ADMIN, EARNER only  (redirect ISSUER → /issuer)
 *  /claim/*    → Any authenticated   (redirect unauthenticated → /login)
 *  /verify/*   → Public (no auth)
 *  /login      → Public; redirect authenticated users to their dashboard
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  })

  const role = token?.role as string | undefined

  // ── /login is always public; redirect authenticated users to their dashboard
  if (pathname === '/login') {
    if (token) {
      const dest = role === 'ISSUER' || role === 'ADMIN' ? '/issuer' : '/earner'
      return NextResponse.redirect(new URL(dest, req.url))
    }
    return NextResponse.next()
  }

  // ── Unauthenticated access to any other matched route
  if (!token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Role mismatch redirects
  if (pathname.startsWith('/issuer') && role !== 'ADMIN' && role !== 'ISSUER') {
    return NextResponse.redirect(new URL('/earner', req.url))
  }

  if (pathname.startsWith('/earner') && role !== 'ADMIN' && role !== 'EARNER') {
    return NextResponse.redirect(new URL('/issuer', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|verify|api/verify|api/auth|api/credentials|public).*)',
  ],
}
