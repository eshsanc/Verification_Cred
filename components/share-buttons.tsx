'use client'

import { useState } from 'react'
import { Linkedin, Twitter, Mail, Link2, Check, Code } from 'lucide-react'

interface ShareButtonsProps {
  verifyUrl: string
  credentialName: string
  issuerName: string
}

/**
 * Social share buttons and copy-to-clipboard utilities for a credential
 * verification URL. Renders LinkedIn, Twitter/X, Email, direct link copy,
 * and an embed snippet copy button.
 */
export function ShareButtons({ verifyUrl, credentialName, issuerName }: ShareButtonsProps) {
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)

  const encodedUrl = encodeURIComponent(verifyUrl)
  const tweetText = encodeURIComponent(
    `I earned the "${credentialName}" credential from ${issuerName}! Verify it here:`,
  )
  const emailSubject = encodeURIComponent(`My credential: ${credentialName}`)
  const emailBody = encodeURIComponent(
    `Hi,\n\nI wanted to share my "${credentialName}" credential issued by ${issuerName}.\n\nVerify it here: ${verifyUrl}`,
  )

  const embedSnippet = `<a href="${verifyUrl}" target="_blank" rel="noopener noreferrer">${credentialName} — Verified by VeriCred</a>`

  async function copyToClipboard(text: string, type: 'url' | 'embed') {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'url') {
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 2000)
      } else {
        setCopiedEmbed(true)
        setTimeout(() => setCopiedEmbed(false), 2000)
      }
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      if (type === 'url') {
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 2000)
      } else {
        setCopiedEmbed(true)
        setTimeout(() => setCopiedEmbed(false), 2000)
      }
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Share</h2>

      {/* Social share row */}
      <div className="flex flex-wrap gap-3">
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] transition-colors"
          aria-label="Share on LinkedIn"
        >
          <Linkedin className="h-4 w-4" />
          LinkedIn
        </a>

        <a
          href={`https://twitter.com/intent/tweet?text=${tweetText}&url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-black hover:text-white hover:border-black transition-colors"
          aria-label="Share on Twitter / X"
        >
          <Twitter className="h-4 w-4" />
          Twitter / X
        </a>

        <a
          href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-800 hover:text-white hover:border-gray-800 transition-colors"
          aria-label="Share via Email"
        >
          <Mail className="h-4 w-4" />
          Email
        </a>
      </div>

      {/* Copy verification URL */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Copy Link
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600 font-mono truncate">
            {verifyUrl}
          </code>
          <button
            onClick={() => copyToClipboard(verifyUrl, 'url')}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            aria-label="Copy verification URL"
          >
            {copiedUrl ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Copy embed snippet */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Embed Snippet
        </p>
        <div className="flex items-start gap-2">
          <pre className="flex-1 rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600 font-mono whitespace-pre-wrap break-all">
            {embedSnippet}
          </pre>
          <button
            onClick={() => copyToClipboard(embedSnippet, 'embed')}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors mt-0.5"
            aria-label="Copy embed snippet"
          >
            {copiedEmbed ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Code className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
