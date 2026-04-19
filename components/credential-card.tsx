'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toggleVisibility } from '@/app/actions/claim'
import { StatusBadge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { Status } from '@prisma/client'

export interface CredentialCardProps {
  badgeId: string
  name: string
  description: string
  issuerName: string
  issuedAt: Date
  expiresAt: Date | null
  criteriaUrl: string | null
  evidenceUrl: string | null
  status: Status
  isPublic: boolean
  verifyUrl: string
  jsonLd: unknown
}

export function CredentialCard({
  badgeId,
  name,
  description,
  issuerName,
  issuedAt,
  expiresAt,
  criteriaUrl,
  evidenceUrl,
  status,
  isPublic: initialIsPublic,
  verifyUrl,
  jsonLd,
}: CredentialCardProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [toggling, setToggling] = useState(false)
  const [jsonExpanded, setJsonExpanded] = useState(false)

  async function handleToggle(checked: boolean) {
    setToggling(true)
    setIsPublic(checked)
    const result = await toggleVisibility(badgeId, checked)
    if (!result.success) {
      setIsPublic(!checked) // revert on failure
    }
    setToggling(false)
  }

  const formattedDate = new Date(issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Dialog>
      <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col">
        {/* Clickable card body → opens modal */}
        <DialogTrigger asChild>
          <button className="flex-1 text-left p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl">
            <div className="mb-3">
              <StatusBadge status={status} />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
              {name}
            </h3>
            <p className="text-xs text-gray-500">{issuerName}</p>
            <p className="text-xs text-gray-400 mt-1">{formattedDate}</p>
          </button>
        </DialogTrigger>

        {/* Card footer — privacy toggle + verify link */}
        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
          <Switch
            id={`visibility-${badgeId}`}
            checked={isPublic}
            onCheckedChange={handleToggle}
            disabled={toggling || status !== 'CLAIMED'}
            label={isPublic ? 'Public' : 'Private'}
          />
          <Link
            href={verifyUrl}
            target="_blank"
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Verify ↗
          </Link>
        </div>
      </div>

      {/* Detail modal */}
      <DialogContent>
        <DialogHeader>
          <div className="mb-2">
            <StatusBadge status={status} />
          </div>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>Issued by {issuerName}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Description */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Description</p>
            <p className="text-sm text-gray-700">{description}</p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Issued</p>
              <p className="text-sm text-gray-700">{formattedDate}</p>
            </div>
            {expiresAt && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Expires</p>
                <p className="text-sm text-gray-700">
                  {new Date(expiresAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Criteria */}
          {criteriaUrl && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Criteria</p>
              <a
                href={criteriaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {criteriaUrl}
              </a>
            </div>
          )}

          {/* Evidence */}
          {evidenceUrl && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Evidence</p>
              <a
                href={evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {evidenceUrl}
              </a>
            </div>
          )}

          {/* Verify link */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Verification URL</p>
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all"
            >
              {verifyUrl}
            </a>
          </div>

          {/* JSON-LD preview (collapsible) */}
          <div>
            <button
              onClick={() => setJsonExpanded(!jsonExpanded)}
              className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span>{jsonExpanded ? '▼' : '▶'}</span>
              <span>JSON-LD Payload</span>
            </button>
            {jsonExpanded && (
              <pre className="mt-2 rounded-md bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(jsonLd, null, 2)}
              </pre>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
