# CLAUDE CODE: VeriCred MVP Build Instructions

**Project:** VeriCred (Credentials Management System)
**Scope:** Minimum Viable Product (MVP)
**Objective:** Implement a secure, standards-compliant digital credential issuance, management, and sharing platform.

---

## TECH STACK (Non-Negotiable)

| Component           | Specification                                     |
| ------------------- | ------------------------------------------------- |
| **Framework**       | Next.js 15 (App Router, Server Actions, React 19) |
| **Language**        | TypeScript (strict mode enforced)                 |
| **Database**        | PostgreSQL 15+ via Prisma ORM 6.x                 |
| **Authentication**  | NextAuth.js v5 (Credentials + Email OTP)          |
| **Crypto/Signing**  | `@noble/ed25519`, `jsonld`, `canonicalize`        |
| **Email**           | Resend or Nodemailer (MVP)                        |
| **Styling**         | Tailwind CSS + Radix UI components                |
| **Validation**      | Zod + `react-hook-form`                           |
| **Deployment**      | Vercel (MVP) + Supabase/Neon PostgreSQL           |

---

## CODING CONVENTIONS

- **Import aliases:** Use `@/` prefix for all project imports (e.g., `@/lib/prisma`, `@/components/ui`).
- **File naming:** Use kebab-case for files (`credential-card.tsx`), PascalCase for components (`CredentialCard`).
- **Server vs Client:** Default to Server Components. Only add `"use client"` when interactivity is required.
- **Data mutations:** Always use Server Actions or Route Handlers. Never mutate data from client-side fetch.
- **Error handling:** Fail fast on crypto errors. Throw explicit errors for malformed JSON-LD, invalid keys, or verification failures.
- **Documentation:** Add JSDoc comments to all cryptographic functions, API routes, and Server Actions.
- **Validation:** Validate ALL user inputs with Zod schemas before processing. No exceptions.
- **Security:** Never expose `privateKey` in client bundles. Enforce HTTPS-only cookies for sessions.

---

## REPOSITORY STRUCTURE

```
vericred-mvp/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/issuer/
│   │   ├── page.tsx                    # Issuer dashboard
│   │   ├── create/page.tsx             # Credential designer form
│   │   └── credentials/page.tsx        # Issuance list
│   ├── (dashboard)/earner/
│   │   ├── page.tsx                    # Earner dashboard
│   │   └── wallet/page.tsx             # Credential wallet gallery
│   ├── claim/[badgeId]/page.tsx        # Claim flow
│   ├── api/credentials/[id]/route.ts   # Credential CRUD API
│   ├── api/verify/[id]/route.ts        # Verification API
│   ├── verify/[id]/page.tsx            # Public verification page
│   └── layout.tsx                      # Root layout
├── lib/
│   ├── auth.ts                         # NextAuth v5 configuration
│   ├── prisma.ts                       # Prisma client singleton
│   ├── crypto.ts                       # Ed25519 signing/verification
│   ├── openbadges.ts                   # OB 3.0 JSON-LD builder
│   └── validators.ts                   # Zod schemas
├── components/
│   ├── ui/                             # Radix-based primitives
│   ├── credential-card.tsx
│   ├── credential-form.tsx
│   └── share-buttons.tsx
├── prisma/schema.prisma
├── middleware.ts                        # Role-based route protection
├── public/badges/
├── .env.local
└── CLAUDE.md
```

---

## DATABASE SCHEMA

Located at `prisma/schema.prisma`. Contains models:
- **User** — email, role (ADMIN | ISSUER | EARNER | VERIFIER)
- **IssuerProfile** — name, logo, website, Ed25519 key pair
- **IssuedCredential** — full credential record with OB 3.0 JSON-LD payload

Enums: `Role`, `Status` (PENDING | CLAIMED | REVOKED | EXPIRED)

---

## IMPLEMENTATION PHASES (Execute Sequentially)

### Phase 1: Foundation & Authentication
1. Configure `prisma/schema.prisma` (already provided).
2. Run `npx prisma db push` and generate client.
3. Implement NextAuth v5 with email OTP flow in `lib/auth.ts`.
4. Create role-based middleware at `middleware.ts` to protect `/issuer/*` and `/earner/*`.
5. Build login page at `app/(auth)/login/page.tsx`.

**✅ Validation Criteria:**
- User can register, receive OTP, log in, and see role-specific dashboard shell.
- Unauthenticated users are redirected to `/login`.
- Role mismatch redirects to correct dashboard.

**⏸ STOP. Run validation. Confirm before proceeding to Phase 2.**

---

### Phase 2: Credential Designer & Issuance
1. Build `/issuer/create` form: name, description, criteria URL, evidence upload, expiration date.
2. Generate Open Badges 3.0 JSON-LD payload using `lib/openbadges.ts` (see template below).
3. Implement bulk CSV upload parser with Zod validation, mapping to payload array.
4. Create Server Action to insert credentials into DB with `status: PENDING`.
5. Trigger invitation email with claim link (`/claim/{badgeId}`) via Resend.

**✅ Validation Criteria:**
- Issuer can create single credential via form.
- Issuer can batch-create credentials via CSV upload.
- Credentials appear in issuance list with correct status.
- Invitation email is sent with valid claim link.

**⏸ STOP. Run validation. Confirm before proceeding to Phase 3.**

---

### Phase 3: Earner Wallet & Claim Flow
1. Build `/claim/{badgeId}` page: verify token, display credential preview, accept terms.
2. On claim, update `status: CLAIMED`, link to `User.id`, generate shareable URL.
3. Build `/earner/wallet` gallery with metadata modal.
4. Implement privacy toggle (public/private visibility per credential).

**✅ Validation Criteria:**
- User receives claim link, sees credential preview, and can claim it.
- Claimed credential appears in earner's wallet.
- Privacy toggle hides/shows credential on public verification page.

**⏸ STOP. Run validation. Confirm before proceeding to Phase 4.**

---

### Phase 4: Cryptographic Signing & Verification
1. Implement `lib/crypto.ts`:
   - Canonicalize JSON-LD using `jsonld` + `canonicalize`.
   - Hash canonical payload with SHA-256.
   - Sign hash using `@noble/ed25519`.
   - Encode signature in base58, attach to `proof.proofValue`.
2. Create `/verify/{id}` public page: fetch credential JSON, verify signature against issuer public key, display trust status.
3. Generate QR code pointing to verification URL.

**✅ Validation Criteria:**
- Signature generation succeeds and round-trips correctly.
- Verification page displays valid/invalid/revoked states.
- Tampered payloads fail verification.
- QR code resolves to correct verification URL.

**⏸ STOP. Run validation. Confirm before proceeding to Phase 5.**

---

### Phase 5: Sharing & Distribution
1. Implement Open Graph meta tags on `/verify/{id}` for social previews.
2. Add share buttons:
   - LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url={verifyUrl}`
   - Twitter/X: `https://twitter.com/intent/tweet?text={encodedText}&url={verifyUrl}`
   - Email: `mailto:?subject={title}&body={verifyUrl}`
3. Add copy-to-clipboard for embed snippet (`<iframe>` or `<a>` tag).

**✅ Validation Criteria:**
- Social previews render correctly (test with og-image debuggers).
- Share links open with pre-filled data on each platform.
- Copy-to-clipboard works for embed snippet.

---

## OPEN BADGES 3.0 JSON-LD TEMPLATE

```json
{
  "@context": ["https://www.imsglobal.org/spec/ob/v3p0/context-3.0.2.json"],
  "type": ["AchievementCredential"],
  "id": "urn:uuid:{badgeId}",
  "issuer": {
    "id": "https://vericred.example/issuers/{issuerId}",
    "type": ["Profile"],
    "name": "{issuerName}",
    "url": "{issuerWebsite}"
  },
  "credentialSubject": {
    "id": "mailto:{recipientEmail}",
    "achievement": {
      "id": "urn:uuid:{achievementId}",
      "type": ["Achievement"],
      "name": "{credentialName}",
      "description": "{description}",
      "criteria": { "id": "{criteriaUrl}" }
    }
  },
  "issuanceDate": "{ISO8601}",
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "{ISO8601}",
    "verificationMethod": "https://vericred.example/issuers/{issuerId}#keys-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "{base58_signature}"
  }
}
```

---

## CRYPTOGRAPHIC SIGNING FLOW

1. Build JSON-LD payload (without `proof`).
2. Canonicalize using `jsonld.canonize()` with `canonicalize` for deterministic output.
3. Hash the canonical string with SHA-256.
4. Sign hash with `@noble/ed25519.sign()` using issuer private key.
5. Encode signature as base58.
6. Attach `proof` object to JSON-LD.
7. Store complete signed JSON-LD in `IssuedCredential.jsonLd`.

## VERIFICATION FLOW

1. Fetch credential JSON from `/api/credentials/{id}`.
2. Extract and remove `proof` object from payload.
3. Re-canonicalize the payload (without proof).
4. Hash the canonical string with SHA-256.
5. Verify signature using `@noble/ed25519.verify()` against issuer's public key.
6. Return `{ valid: boolean, status: string, metadata: object }`.

---

## SECURITY GATES

- **Private keys:** Never in client bundles. Server-side only via `process.env`.
- **Rate limiting:** Enforce on `/api/verify/*` and `/claim/*` routes.
- **Input sanitization:** All inputs validated with Zod before touching DB.
- **Sessions:** HTTPS-only cookies. Enforce via NextAuth config.
- **CSRF:** Handled by NextAuth's built-in CSRF protection.

---

## ENVIRONMENT VARIABLES

See `.env.local` for required values. All must be set before running the app.

---

## EXECUTION DIRECTIVES

1. **Execute sequentially.** Complete each phase, run validation, then proceed.
2. **Maintain standards compliance.** All credential payloads MUST conform to Open Badges 3.0.
3. **Use Server Actions & Route Handlers.** No client-side data mutations.
4. **Document inline.** JSDoc on all crypto functions and API routes.
5. **Fail fast on crypto errors.** Explicit error messages for debugging.
6. **Output per phase:** File diffs, migration commands, and verification steps.
