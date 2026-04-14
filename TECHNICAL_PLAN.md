# VeriCred MVP - Technical Design Plan

**Project:** VeriCred (Digital Credentials Management System)
**Scope:** MVP - Secure, standards-compliant credential issuance, management, and sharing
**Standard:** Open Badges 3.0 (IMS Global)

---

## 1. Architecture Overview

### System Architecture

```
Client (Browser)
    |
Next.js 15 App Router (Server Components + Server Actions)
    |
    +-- NextAuth v5 (Auth Layer - Email OTP)
    +-- API Routes (/api/credentials, /api/verify)
    +-- Server Actions (Issuance, Claim, Revoke)
    |
Prisma ORM 6.x
    |
PostgreSQL 15+ (Supabase/Neon)
```

### Tech Stack

| Layer            | Technology                                        |
| ---------------- | ------------------------------------------------- |
| Framework        | Next.js 15 (App Router, React 19, Server Actions) |
| Language         | TypeScript (strict mode, `noUncheckedIndexedAccess`) |
| Database         | PostgreSQL 15+ via Prisma ORM 6.x                 |
| Authentication   | NextAuth.js v5 (Email OTP)                        |
| Crypto           | `@noble/ed25519`, `jsonld`, `canonicalize`, `bs58`|
| Email            | Resend (primary) / Nodemailer (fallback)          |
| UI               | Tailwind CSS + Radix UI (dialog, dropdown, label, switch, tabs, toast, tooltip) |
| Validation       | Zod + react-hook-form + @hookform/resolvers       |
| QR Code          | `qrcode` library                                  |
| Deployment       | Vercel + Supabase/Neon PostgreSQL                 |

### Coding Conventions

- **Imports:** `@/` prefix for all project imports (e.g., `@/lib/prisma`)
- **File naming:** kebab-case for files (`credential-card.tsx`), PascalCase for components (`CredentialCard`)
- **Components:** Server Components by default; `"use client"` only when interactivity is required
- **Data mutations:** Server Actions or Route Handlers only. No client-side data mutations
- **Documentation:** JSDoc on all crypto functions, API routes, and Server Actions
- **Validation:** All user inputs validated with Zod schemas via `lib/validators.ts`

---

## 2. Data Model Design

### Entity Relationship

```
User (1) ---< (N) IssuedCredential (N) >--- (1) IssuerProfile
```

### Models (defined in `schema.prisma`)

**User** (`users` table)
- `id` (cuid), `email` (unique), `name` (optional), `role` (enum)
- `otpCode`, `otpExpiry` - OTP fields stored directly on user for auth
- `credentials` - relation to IssuedCredential[]
- `createdAt`, `updatedAt`

**IssuerProfile** (`issuer_profiles` table)
- `id`, `name`, `logoUrl`, `website`
- `publicKey` (base58 Ed25519), `privateKey` (base58 Ed25519, server-only)
- `credentials` - relation to IssuedCredential[]
- `createdAt`, `updatedAt`

**IssuedCredential** (`issued_credentials` table)
- `id`, `badgeId` (unique UUID for claim URLs and JSON-LD `id`)
- `name`, `description`, `criteriaUrl`, `evidenceUrl`
- `issuedAt`, `expiresAt`, `status` (PENDING | CLAIMED | REVOKED | EXPIRED)
- `isPublic` (boolean, default false) - privacy toggle for public visibility
- `jsonLd` (JSON) - Full signed Open Badges 3.0 payload
- `recipientId` (FK -> User, cascade delete), `issuerId` (FK -> IssuerProfile, cascade delete)
- `createdAt`, `updatedAt`
- Indexes on: `recipientId`, `issuerId`, `status`

### Database Conventions

- All table names use snake_case via `@@map`
- All column names use snake_case via `@map`
- Cascade deletes on foreign keys
- Performance indexes on frequently queried foreign keys and status

### Status Lifecycle

```
PENDING --> CLAIMED --> REVOKED
                   --> EXPIRED (time-based)
```

---

## 3. Authentication & Authorization Design

### Auth Flow (NextAuth v5 + Email OTP)

OTP is stored directly on the `User` model (`otpCode`, `otpExpiry`) - no separate verification token table.

1. User enters email on `/login`
2. Server Action: generate 6-digit OTP, hash it, store in `User.otpCode` with 10-min expiry in `User.otpExpiry`
3. Send plain OTP to user's email via Resend (from `EMAIL_FROM` env var)
4. User enters OTP on login page (same page, step 2 form)
5. Server Action: find user by email, compare OTP hash, check expiry
6. On success: clear OTP fields, create session via NextAuth with JWT strategy
7. JWT payload includes `userId`, `email`, and `role`

### Role-Based Access Control

| Route Pattern       | Allowed Roles      | Middleware Action         |
| ------------------- | ------------------ | ------------------------- |
| `/issuer/*`         | ADMIN, ISSUER      | Redirect to `/earner`     |
| `/earner/*`         | ADMIN, EARNER      | Redirect to `/issuer`     |
| `/verify/*`         | PUBLIC             | No auth required          |
| `/api/credentials`  | ADMIN, ISSUER      | Return 401                |
| `/claim/*`          | Any authenticated  | Redirect to `/login`      |

### Middleware Strategy (`middleware.ts`)

- Intercept all requests matching protected route patterns
- Extract JWT from session cookie, decode role
- Compare role against route ACL; redirect or 401 on mismatch
- Unauthenticated users on protected routes -> redirect to `/login?callbackUrl=...`

---

## 4. Credential Issuance Design

### Single Credential Flow

1. Issuer fills form at `/issuer/create` (name, description, criteria URL, evidence upload, expiration date)
2. Client-side validation via react-hook-form + Zod schema from `lib/validators.ts`
3. Server Action `createCredential`:
   - Re-validate with Zod server-side
   - Generate UUID v4 as `badgeId`
   - Build Open Badges 3.0 JSON-LD payload via `lib/openbadges.ts`
   - Sign payload via `lib/crypto.ts` (see Section 6)
   - Insert `IssuedCredential` with `status: PENDING`
   - Send invitation email with claim link `/claim/{badgeId}` via Resend

### Batch Issuance (CSV Upload)

1. Issuer uploads CSV at `/issuer/create` (columns: email, name, description, criteriaUrl, evidenceUrl, expiresAt)
2. Parse CSV rows, validate each with Zod schema
3. Server Action `batchCreateCredentials`:
   - Generate individual JSON-LD payloads per row
   - Sign each payload individually (unique badgeId per credential)
   - Bulk insert into DB
   - Send invitation email for each recipient

### JSON-LD Payload Structure (Open Badges 3.0)

```json
{
  "@context": ["https://www.imsglobal.org/spec/ob/v3p0/context-3.0.2.json"],
  "type": ["AchievementCredential"],
  "id": "urn:uuid:{badgeId}",
  "issuer": {
    "id": "{NEXT_PUBLIC_APP_URL}/issuers/{issuerId}",
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
    "verificationMethod": "{NEXT_PUBLIC_APP_URL}/issuers/{issuerId}#keys-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "{base58_signature}"
  }
}
```

---

## 5. Earner Wallet & Claim Flow Design

### Claim Flow (`/claim/[badgeId]`)

1. Earner receives email with `/claim/{badgeId}` link
2. If not logged in -> redirect to `/login?callbackUrl=/claim/{badgeId}`
3. Page fetches credential by `badgeId`, verifies `status === PENDING`
4. Display credential preview: name, issuer name/logo, description, issuance date
5. Earner accepts terms, clicks "Claim"
6. Server Action `claimCredential`:
   - Validate `badgeId` exists and `status === PENDING`
   - Update `recipientId` to current user's ID
   - Set `status: CLAIMED`
   - Return shareable verification URL (`/verify/{badgeId}`)

### Wallet (`/earner/wallet`)

- Gallery grid of claimed credentials (responsive card layout)
- Card: badge name, issuer name, issuance date, status badge (colored)
- Click card -> Radix Dialog modal with full metadata:
  - Description, criteria link, evidence link, expiry date
  - Collapsible JSON-LD preview
  - Share buttons and verification link
- Privacy toggle per credential via Radix Switch (`isPublic` field)
- Server Action `toggleVisibility` updates `isPublic` boolean

---

## 6. Cryptographic Signing & Verification Design

### Dependencies

- `@noble/ed25519` - Ed25519 sign/verify
- `jsonld` - JSON-LD canonicalization (RDF normalization)
- `canonicalize` - RFC 8785 JSON Canonicalization Scheme
- `bs58` - Base58 encoding/decoding for keys and signatures

### Signing Flow (`lib/crypto.ts`)

```
JSON-LD Payload (without proof)
    |
    v
jsonld.canonize() -> canonical N-Quads string
    |
    v
SHA-256 Hash (Web Crypto / Node crypto)
    |
    v
ed25519.sign(hash, privateKey) using @noble/ed25519
    |
    v
bs58.encode(signature) -> base58 string
    |
    v
Attach proof object with proofValue -> Complete signed JSON-LD
```

### Verification Flow

1. `GET /api/verify/[id]` fetches credential by `badgeId`
2. Extract `proof` object from JSON-LD
3. Reconstruct payload without `proof`
4. Re-canonicalize -> SHA-256 hash
5. `ed25519.verify(signature, hash, publicKey)` using issuer's public key
6. Check credential `status` (CLAIMED = valid, REVOKED/EXPIRED = flagged)
7. Return `{ valid: boolean, status: string, metadata: object }`

### Verification Page States (`/verify/[id]`)

| State     | Display                                       |
| --------- | --------------------------------------------- |
| Valid     | Green checkmark, credential details, issuer   |
| Invalid   | Red X, "Signature verification failed"        |
| Revoked   | Orange warning, "Credential has been revoked" |
| Expired   | Gray, "Credential expired on {date}"          |
| Not Found | 404, "Credential not found"                   |

### QR Code Generation

- Use `qrcode` library to generate QR on verification page
- QR points to the verification page's own URL
- Downloadable as PNG image

---

## 7. Sharing & Distribution Design

### Open Graph Meta Tags (`generateMetadata` in `/verify/[id]`)

- `og:title` = Credential name
- `og:description` = "{description} - Issued by {issuerName}"
- `og:image` = Badge image or auto-generated credential card
- `og:url` = Verification page URL

### Share Buttons (`components/share-buttons.tsx`)

- LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url={verifyUrl}`
- Twitter/X: `https://twitter.com/intent/tweet?text={encodedText}&url={verifyUrl}`
- Email: `mailto:?subject={title}&body={verifyUrl}`
- Icons via `lucide-react`

### Embed Snippet

- Generate `<iframe>` embed code targeting verification page
- Generate `<a>` link embed with badge preview
- Copy-to-clipboard button for each snippet

---

## 8. Security Design

| Concern              | Mitigation                                                 |
| -------------------- | ---------------------------------------------------------- |
| Private key leakage  | Server-only via `process.env`; never in client bundles     |
| Input injection      | Zod validation on all inputs via `lib/validators.ts`       |
| Rate limiting        | Middleware rate limit on `/api/verify/*` and `/claim/*`    |
| Session security     | HTTPS-only cookies, JWT strategy with short expiry         |
| CSRF                 | NextAuth built-in CSRF + Server Action CSRF protection     |
| Role escalation      | Middleware + server-side role checks on every action        |
| OTP brute force      | 10-min expiry, clear after use, rate limit login attempts  |
| Cascade integrity    | `onDelete: Cascade` on FK relations                        |

---

## 9. API & Server Action Design

### API Routes

| Method | Route                    | Purpose                      | Auth   |
| ------ | ------------------------ | ---------------------------- | ------ |
| GET    | `/api/credentials/[id]`  | Fetch credential JSON-LD     | Public (respects `isPublic`) |
| POST   | `/api/credentials`       | Create credential            | Issuer |
| GET    | `/api/verify/[id]`       | Verify credential signature  | Public |
| PATCH  | `/api/credentials/[id]`  | Update status (revoke)       | Issuer |

### Server Actions

| Action                   | Location              | Purpose                      |
| ------------------------ | --------------------- | ---------------------------- |
| `createCredential`       | `app/actions/`        | Single credential issuance   |
| `batchCreateCredentials` | `app/actions/`        | CSV batch processing         |
| `claimCredential`        | `app/actions/`        | Earner claim flow            |
| `toggleVisibility`       | `app/actions/`        | Privacy toggle (isPublic)    |
| `revokeCredential`       | `app/actions/`        | Issuer revocation            |
| `sendOtp`                | `app/actions/`        | OTP generation & email       |
| `verifyOtp`              | `app/actions/`        | OTP validation & login       |

---

## 10. Key Library Files

| File                 | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `lib/auth.ts`        | NextAuth v5 config (JWT strategy, OTP provider)      |
| `lib/prisma.ts`      | Prisma client singleton (avoid multiple instances)   |
| `lib/crypto.ts`      | Ed25519 signing, verification, key utilities         |
| `lib/openbadges.ts`  | Open Badges 3.0 JSON-LD payload builder              |
| `lib/validators.ts`  | Centralized Zod schemas for all inputs               |
| `lib/email.ts`       | Resend email wrapper (OTP, invitation emails)        |
| `middleware.ts`       | Role-based route protection                          |

---

## 11. Environment Configuration

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vericred"

# NextAuth
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"

# Ed25519 Keys (base58-encoded)
ISSUER_PRIVATE_KEY="<base58-ed25519-private-key>"
ISSUER_PUBLIC_KEY="<base58-ed25519-public-key>"

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="VeriCred"
```

---

## 12. Seed Data Strategy

A seed script at `prisma/seed.ts` (run via `npm run db:seed` / `tsx prisma/seed.ts`) will create:
- 1 Admin user
- 1 Issuer user + corresponding IssuerProfile with a generated Ed25519 keypair
- 2 Earner users
- Sample credentials in various statuses (PENDING, CLAIMED, REVOKED)

This enables immediate local development and testing of all flows without manual setup.
