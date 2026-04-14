import * as React from 'react'
import { cn } from '@/lib/utils'
import type { Status } from '@prisma/client'

const variantClasses: Record<Status, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CLAIMED: 'bg-green-100 text-green-800 border-green-200',
  REVOKED: 'bg-red-100 text-red-800 border-red-200',
  EXPIRED: 'bg-gray-100 text-gray-600 border-gray-200',
}

interface StatusBadgeProps {
  status: Status
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variantClasses[status],
        className,
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline'
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-blue-100 text-blue-800',
        variant === 'secondary' && 'bg-gray-100 text-gray-700',
        variant === 'outline' && 'border border-gray-300 text-gray-700',
        className,
      )}
      {...props}
    />
  )
}
