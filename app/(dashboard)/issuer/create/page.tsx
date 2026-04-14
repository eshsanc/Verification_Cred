import CredentialForm from './credential-form'

export const metadata = { title: 'Issue Credential' }

/**
 * /issuer/create — Credential designer page.
 * Renders as a server component shell; the interactive form is a client component.
 */
export default function CreateCredentialPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Issue a Credential</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create and sign an Open Badges 3.0 credential. The recipient will receive an
          invitation email with a claim link.
        </p>
      </div>
      <CredentialForm />
    </div>
  )
}
