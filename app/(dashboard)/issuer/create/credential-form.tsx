'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { credentialSchema, type CredentialInput } from '@/lib/validators'
import { createCredential, batchCreateCredentials, type BatchRow } from '@/app/actions/credentials'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ── Single Credential Form ────────────────────────────────────────────────────

function SingleCredentialForm() {
  const [result, setResult] = useState<{ claimUrl?: string; error?: string } | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CredentialInput>({ resolver: zodResolver(credentialSchema) })

  async function onSubmit(data: CredentialInput) {
    setResult(null)
    const res = await createCredential(data)
    if (res.success && res.claimUrl) {
      setResult({ claimUrl: res.claimUrl })
      reset()
    } else {
      setResult({ error: res.error ?? 'Failed to create credential' })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Recipient */}
      <div className="space-y-2">
        <Label htmlFor="recipientEmail">Recipient Email *</Label>
        <Input
          id="recipientEmail"
          type="email"
          placeholder="recipient@example.com"
          {...register('recipientEmail')}
        />
        {errors.recipientEmail && (
          <p className="text-xs text-red-600">{errors.recipientEmail.message}</p>
        )}
      </div>

      {/* Credential Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Credential Name *</Label>
        <Input id="name" placeholder="e.g. TypeScript Fundamentals" {...register('name')} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="What does this credential certify?"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Criteria URL */}
      <div className="space-y-2">
        <Label htmlFor="criteriaUrl">Criteria URL</Label>
        <Input
          id="criteriaUrl"
          type="url"
          placeholder="https://example.com/criteria"
          {...register('criteriaUrl')}
        />
        {errors.criteriaUrl && (
          <p className="text-xs text-red-600">{errors.criteriaUrl.message}</p>
        )}
      </div>

      {/* Evidence URL */}
      <div className="space-y-2">
        <Label htmlFor="evidenceUrl">Evidence URL</Label>
        <Input
          id="evidenceUrl"
          type="url"
          placeholder="https://example.com/evidence"
          {...register('evidenceUrl')}
        />
        {errors.evidenceUrl && (
          <p className="text-xs text-red-600">{errors.evidenceUrl.message}</p>
        )}
      </div>

      {/* Expiry Date */}
      <div className="space-y-2">
        <Label htmlFor="expiresAt">Expiry Date (optional)</Label>
        <Input id="expiresAt" type="date" {...register('expiresAt')} />
      </div>

      {/* Feedback */}
      {result?.error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {result.error}
        </div>
      )}
      {result?.claimUrl && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          <p className="font-medium mb-1">Credential issued! Invitation email sent.</p>
          <p className="text-xs">Claim link: <span className="font-mono break-all">{result.claimUrl}</span></p>
        </div>
      )}

      <Button type="submit" isLoading={isSubmitting} className="w-full">
        {isSubmitting ? 'Issuing…' : 'Issue Credential'}
      </Button>
    </form>
  )
}

// ── CSV parsing ────────────────────────────────────────────────────────────────

const CSV_HEADERS = ['email', 'name', 'description', 'criteriaUrl', 'evidenceUrl', 'expiresAt']

function parseCSV(text: string): BatchRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = (lines[0] ?? '').split(',').map((h) => h.trim().toLowerCase())

  return lines.slice(1).map((line) => {
    // Handle quoted fields with commas
    const fields: string[] = []
    let current = ''
    let inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { fields.push(current.trim()); current = '' }
      else { current += ch }
    }
    fields.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = fields[i] ?? '' })

    return {
      email: row['email'] ?? '',
      name: row['name'] ?? '',
      description: row['description'] ?? '',
      criteriaUrl: row['criteriaurl'] ?? row['criteriaUrl'] ?? '',
      evidenceUrl: row['evidenceurl'] ?? row['evidenceUrl'] ?? '',
      expiresAt: row['expiresat'] ?? row['expiresAt'] ?? '',
    }
  })
}

// ── Batch CSV Form ────────────────────────────────────────────────────────────

function BatchCSVForm() {
  const [rows, setRows] = useState<BatchRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [batchResult, setBatchResult] = useState<{
    total: number; succeeded: number; failed: number
    errors: Array<{ row: number; email: string; error: string }>
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)
    setBatchResult(null)

    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a .csv file')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        setParseError('No data rows found. Check the CSV format.')
      } else {
        setRows(parsed)
      }
    }
    reader.readAsText(file)
  }

  async function handleBatchSubmit() {
    if (rows.length === 0) return
    setIsSubmitting(true)
    setBatchResult(null)
    try {
      const result = await batchCreateCredentials(rows)
      setBatchResult(result)
      setRows([])
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* CSV format guide */}
      <div className="rounded-md bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
        <p className="font-medium mb-1">Required CSV format</p>
        <code className="text-xs block">{CSV_HEADERS.join(',')}</code>
        <p className="text-xs mt-1 text-blue-600">criteriaUrl, evidenceUrl, expiresAt are optional</p>
      </div>

      {/* File input */}
      <div className="space-y-2">
        <Label htmlFor="csvFile">Upload CSV File</Label>
        <Input
          id="csvFile"
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="cursor-pointer"
        />
        {parseError && <p className="text-xs text-red-600">{parseError}</p>}
      </div>

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">{rows.length} row(s) ready to import</p>
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Email', 'Name', 'Description'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[160px]">{row.email}</td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[160px]">{row.name}</td>
                    <td className="px-3 py-2 text-gray-500 truncate max-w-[200px]">{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 10 && (
              <p className="px-3 py-2 text-xs text-gray-400">…and {rows.length - 10} more</p>
            )}
          </div>

          <Button onClick={handleBatchSubmit} isLoading={isSubmitting} className="w-full">
            {isSubmitting ? `Issuing ${rows.length} credentials…` : `Issue ${rows.length} Credentials`}
          </Button>
        </div>
      )}

      {/* Batch result */}
      {batchResult && (
        <div className={`rounded-md border px-4 py-3 text-sm ${
          batchResult.failed === 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'
        }`}>
          <p className="font-medium mb-1">
            Batch complete: {batchResult.succeeded}/{batchResult.total} credentials issued
          </p>
          {batchResult.errors.map((e) => (
            <p key={e.row} className="text-xs">Row {e.row} ({e.email}): {e.error}</p>
          ))}
        </div>
      )}

      {/* Download template */}
      <a
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_HEADERS.join(',') + '\n')}`}
        download="vericred-template.csv"
        className="inline-flex text-sm text-blue-600 hover:text-blue-700 hover:underline"
      >
        ↓ Download CSV template
      </a>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function CredentialForm() {
  return (
    <Tabs defaultValue="single">
      <TabsList>
        <TabsTrigger value="single">Single Credential</TabsTrigger>
        <TabsTrigger value="batch">Batch CSV</TabsTrigger>
      </TabsList>

      <TabsContent value="single">
        <Card>
          <CardHeader>
            <CardTitle>Issue a Credential</CardTitle>
            <CardDescription>
              Send an Open Badges 3.0 credential to one recipient. They will receive an email
              with a claim link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SingleCredentialForm />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="batch">
        <Card>
          <CardHeader>
            <CardTitle>Batch CSV Import</CardTitle>
            <CardDescription>
              Upload a CSV file to issue credentials to multiple recipients at once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BatchCSVForm />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
