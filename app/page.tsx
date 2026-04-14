import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

/**
 * Root page — detects session role and routes to the correct dashboard.
 * Unauthenticated users are sent to /login.
 */
export default async function RootPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const { role } = session.user
  if (role === 'ISSUER' || role === 'ADMIN') {
    redirect('/issuer')
  }

  redirect('/earner')
}
