'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, getSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { sendOtp } from '@/app/actions/auth'
import { emailSchema, otpSchema, type EmailInput, type OtpInput } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Step = 'email' | 'otp'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/earner'

  const [step, setStep] = useState<Step>('email')
  const [emailValue, setEmailValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Step 1: Email form ───────────────────────────────────────────────────
  const emailForm = useForm<EmailInput>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  async function handleEmailSubmit(data: EmailInput) {
    setIsLoading(true)
    setError(null)
    try {
      const result = await sendOtp(data.email)
      if (result.success) {
        setEmailValue(data.email)
        setStep('otp')
      } else {
        setError(result.message ?? 'Failed to send code. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Step 2: OTP form ─────────────────────────────────────────────────────
  const otpForm = useForm<OtpInput>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  })

  async function handleOtpSubmit(data: OtpInput) {
    setIsLoading(true)
    setError(null)
    try {
      const result = await signIn('credentials', {
        email: emailValue,
        otp: data.otp,
        redirect: false,
      })

      if (!result || result.error) {
        setError('Invalid or expired code. Go back and request a new one.')
      } else {
        // Resolve role-aware destination: use callbackUrl if explicitly set,
        // otherwise route by role so issuers don't bounce through /earner first.
        const session = await getSession()
        const role = (session?.user as { role?: string } | undefined)?.role
        const dest = callbackUrl !== '/earner'
          ? callbackUrl
          : (role === 'ISSUER' || role === 'ADMIN' ? '/issuer' : '/earner')
        router.push(dest)
        router.refresh()
      }
    } catch {
      setError('Authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {step === 'email' ? 'Sign in to your account' : 'Check your email'}
        </CardTitle>
        <CardDescription>
          {step === 'email'
            ? 'Enter your email address to receive a one-time login code.'
            : `We sent a 6-digit code to ${emailValue}. Enter it below.`}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Email Step ─────────────────────────────────────────────── */}
        {step === 'email' && (
          <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                {...emailForm.register('email')}
              />
              {emailForm.formState.errors.email && (
                <p className="text-xs text-red-600">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              {isLoading ? 'Sending code…' : 'Send login code'}
            </Button>
          </form>
        )}

        {/* ── OTP Step ───────────────────────────────────────────────── */}
        {step === 'otp' && (
          <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">One-time code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                autoComplete="one-time-code"
                autoFocus
                className="text-center text-2xl tracking-[0.5em]"
                {...otpForm.register('otp')}
              />
              {otpForm.formState.errors.otp && (
                <p className="text-xs text-red-600">
                  {otpForm.formState.errors.otp.message}
                </p>
              )}
              <p className="text-xs text-gray-400">Code expires in 10 minutes.</p>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              {isLoading ? 'Verifying…' : 'Sign in'}
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep('email')
                setError(null)
                otpForm.reset()
              }}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              ← Use a different email
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
