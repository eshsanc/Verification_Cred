import { cn } from '@/lib/utils'

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-gray-200', className)} />
  )
}

/** Skeleton for a single credential card in the wallet grid */
export function CredentialCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
      <div className="flex-1 p-5 space-y-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  )
}

/** Skeleton for the wallet page grid */
export function WalletSkeleton() {
  return (
    <div className="p-8">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CredentialCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/** Skeleton for stat cards on dashboards */
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-16" />
    </div>
  )
}

/** Skeleton for the issuer credentials table */
export function CredentialsTableSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-t border-gray-100 px-4 py-3 flex gap-4 items-center">
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Skeleton for the verify page */
export function VerifyPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
          <div className="p-6 space-y-3">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-full" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-6 py-4 flex gap-3">
              <Skeleton className="h-4 w-4 mt-1 shrink-0" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
