'use client'

import { SessionProvider } from 'next-auth/react'

/**
 * Client-side providers wrapper.
 * Enables next-auth/react hooks (useSession, signIn, signOut) throughout the app.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
