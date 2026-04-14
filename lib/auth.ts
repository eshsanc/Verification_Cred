import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import type { Role } from '@prisma/client'

// ── Type Augmentation ─────────────────────────────────────────────────────────

declare module 'next-auth' {
  interface User {
    role: Role
  }
  interface Session {
    user: {
      id: string
      email: string
      role: Role
      name?: string | null
      image?: string | null
    }
  }
}

// next-auth/jwt re-exports from @auth/core/jwt — augment the source module
declare module '@auth/core/jwt' {
  interface JWT {
    userId: string
    role: Role
  }
}

// ── NextAuth v5 Config ────────────────────────────────────────────────────────

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Email OTP',
      credentials: {
        email: { label: 'Email', type: 'email' },
        otp: { label: 'One-Time Password', type: 'text' },
      },

      /**
       * Verifies OTP and returns the authenticated user.
       * OTP is stored as a SHA-256 hash in the database.
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) return null

        const email = String(credentials.email).toLowerCase().trim()
        const otp = String(credentials.otp).trim()

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.otpCode || !user.otpExpiry) return null

        // Check expiry
        if (new Date() > user.otpExpiry) {
          await prisma.user.update({
            where: { id: user.id },
            data: { otpCode: null, otpExpiry: null },
          })
          return null
        }

        // Verify OTP hash
        const otpHash = createHash('sha256').update(otp).digest('hex')
        if (otpHash !== user.otpCode) return null

        // Clear OTP fields after successful verification
        await prisma.user.update({
          where: { id: user.id },
          data: { otpCode: null, otpExpiry: null },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id!
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      // Cast through unknown to satisfy the overloaded session callback signature
      // that NextAuth v5 uses for both JWT and database strategies.
      const s = session as unknown as {
        user: { id: string; role: Role; name?: string | null; email: string; image?: string | null }
        expires: string
      }
      s.user.id = token.userId
      s.user.role = token.role
      return s as unknown as typeof session
    },
  },

  pages: {
    signIn: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  trustHost: true,
})
