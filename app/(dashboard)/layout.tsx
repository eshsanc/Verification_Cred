import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

/**
 * Shared layout for all dashboard routes (/issuer, /earner).
 * Renders a sidebar with role-appropriate navigation and a sign-out button.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const { role, name, email } = session.user
  const isIssuer = role === 'ISSUER' || role === 'ADMIN'
  const isEarner = role === 'EARNER' || role === 'ADMIN'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
        {/* Brand */}
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <span className="text-xl font-bold text-blue-600">VeriCred</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {isIssuer && (
            <div>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Issuer
              </p>
              <ul className="space-y-1">
                <NavItem href="/issuer" label="Dashboard" />
                <NavItem href="/issuer/create" label="Issue Credential" />
                <NavItem href="/issuer/credentials" label="All Credentials" />
              </ul>
            </div>
          )}

          {isEarner && (
            <div>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Earner
              </p>
              <ul className="space-y-1">
                <NavItem href="/earner" label="Dashboard" />
                <NavItem href="/earner/wallet" label="My Wallet" />
              </ul>
            </div>
          )}
        </nav>

        {/* User info + Sign out */}
        <div className="border-t border-gray-200 p-4">
          <div className="mb-3 px-1">
            <p className="text-sm font-medium text-gray-900 truncate">{name ?? email}</p>
            <p className="text-xs text-gray-400">{role}</p>
          </div>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <button
              type="submit"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        {label}
      </Link>
    </li>
  )
}
