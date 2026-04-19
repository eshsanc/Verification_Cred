/**
 * Lightweight NextAuth v5 config for Edge middleware ONLY.
 *
 * The middleware runs in the Vercel Edge Runtime which has a 1 MB bundle limit.
 * Importing the full lib/auth.ts pulls in @prisma/client, the Credentials
 * provider, and crypto — all of which blow past that limit.
 *
 * This file imports ONLY next-auth/jwt (no providers, no DB) to decode the
 * session JWT cookie and extract the user role for route protection.
 * The full auth config stays in lib/auth.ts for use in Server Components and
 * Server Actions where the Node.js runtime has no size limit.
 */

import NextAuth from 'next-auth'
import type { Role } from '@prisma/client'

declare module '@auth/core/jwt' {
  interface JWT {
    userId: string
    role: Role
  }
}

export const { auth } = NextAuth({
  providers: [],
  callbacks: {
    jwt({ token }) {
      return token
    },
  },
  session: { strategy: 'jwt' },
  trustHost: true,
})
