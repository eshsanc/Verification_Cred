import { Suspense } from 'react'
import LoginForm from './login-form'

/**
 * Login page — wraps the interactive form in Suspense so that
 * useSearchParams (callbackUrl) works correctly in Next.js 15.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600">VeriCred</h1>
          <p className="mt-2 text-sm text-gray-500">
            Secure digital credential management
          </p>
        </div>

        <Suspense fallback={<div className="text-center text-sm text-gray-400">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
