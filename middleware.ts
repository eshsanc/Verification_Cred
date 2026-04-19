import { auth } from '@/lib/auth-edge'
import { NextResponse } from 'next/server'

/**
 * Role-based route protection middleware using NextAuth v5.
 *
 * Route ACL:
 *  /issuer/*   → ADMIN, ISSUER only  (redirect EARNER → /earner)
 *  /earner/*   → ADMIN, EARNER only  (redirect ISSUER → /issuer)
 *  /claim/*    → Any authenticated   (redirect unauthenticated → /login)
 *  /verify/*   → Public (no auth)
 *  /login      → Public; redirect authenticated users to their dashboard
 */
export default auth((req) => {
  const session = req.auth
  const { pathname } = req.nextUrl

  // ── /login is always public; redirect authenticated users to their dashboard
  if (pathname === '/login') {
    if (session?.user) {
      const role = session.user.role
      const dest = role === 'ISSUER' || role === 'ADMIN' ? '/issuer' : '/earner'
      return NextResponse.redirect(new URL(dest, req.url))
    }
    return NextResponse.next()
  }

  // ── Unauthenticated access to any other matched route ────────────────────
  if (!session?.user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const { role } = session.user

  // ── Role mismatch redirects ───────────────────────────────────────────────
  if (pathname.startsWith('/issuer') && role !== 'ADMIN' && role !== 'ISSUER') {
    return NextResponse.redirect(new URL('/earner', req.url))
  }

  if (pathname.startsWith('/earner') && role !== 'ADMIN' && role !== 'EARNER') {
    return NextResponse.redirect(new URL('/issuer', req.url))
  }

  return NextResponse.next()
})

export const config = {
  // Apply middleware to all routes except Next.js internals, static assets,
  // public pages (verify), and API routes that handle their own auth (credentials, verify, auth).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|verify|api/verify|api/auth|api/credentials|public).*)',
  ],
}
