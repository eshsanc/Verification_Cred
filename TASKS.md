# VeriCred MVP - Task Breakdown

Each phase must be completed and validated before proceeding to the next.

---

## Phase 1: Foundation & Authentication

### 1.1 Project Initialization
- [ ] Scaffold Next.js 15 app structure inside project root (App Router, TypeScript, Tailwind)
- [ ] Install all dependencies from `package.json` (`npm install`)
- [ ] Move `schema.prisma` to `prisma/schema.prisma`
- [ ] Configure Tailwind with Radix UI support
- [ ] Create root layout (`app/layout.tsx`) with Tailwind globals and `NEXT_PUBLIC_APP_NAME`

### 1.2 Database Setup
- [ ] Create `lib/prisma.ts` — Prisma client singleton (prevent hot-reload connection leaks)
- [ ] Run `npx prisma db push` to sync schema to PostgreSQL
- [ ] Run `npx prisma generate` to generate client types
- [ ] Create `prisma/seed.ts` — seed Admin, Issuer + IssuerProfile (with Ed25519 keypair), Earner users, sample credentials
- [ ] Verify seed with `npm run db:seed` and check via `npx prisma studio`

### 1.3 Authentication (NextAuth v5 + Email OTP)
- [ ] Create `lib/email.ts` — Resend wrapper for sending OTP and invitation emails
- [ ] Create `lib/auth.ts` — NextAuth v5 config with Credentials provider (OTP-based)
- [ ] Implement `sendOtp` server action — generate 6-digit code, hash, store in `User.otpCode`/`otpExpiry`, send via Resend
- [ ] Implement `verifyOtp` server action — validate OTP hash + expiry, clear fields, return session
- [ ] Configure JWT callback to include `userId`, `email`, `role` in token/session
- [ ] Create `app/api/auth/[...nextauth]/route.ts` handler

### 1.4 Login UI
- [ ] Build `app/(auth)/login/page.tsx` — two-step form (email entry -> OTP entry)
- [ ] Wire forms with react-hook-form + Zod validation from `lib/validators.ts`
- [ ] Handle loading, error, and success states
- [ ] Auto-create user on first OTP send if email doesn't exist (default role: EARNER)

### 1.5 Role-Based Middleware
- [ ] Create `middleware.ts` — protect `/issuer/*`, `/earner/*`, `/claim/*` routes
- [ ] Redirect unauthenticated users to `/login?callbackUrl=...`
- [ ] Redirect role mismatches to their correct dashboard
- [ ] Allow public access to `/verify/*` and `/api/verify/*`

### 1.6 Dashboard Shells
- [ ] Create `app/(dashboard)/issuer/page.tsx` — issuer dashboard shell with nav
- [ ] Create `app/(dashboard)/earner/page.tsx` — earner dashboard shell with nav
- [ ] Create shared dashboard layout with sidebar/header, logout button, user info

### 1.7 Validation Checkpoint
- [ ] User can enter email, receive OTP, and log in
- [ ] Session persists across page refreshes
- [ ] Role-based routing works (ISSUER -> issuer dashboard, EARNER -> earner dashboard)
- [ ] Unauthenticated access redirects to login

---

## Phase 2: Credential Designer & Issuance

### 2.1 Zod Schemas
- [ ] Create `lib/validators.ts` — Zod schemas for credential creation, CSV row, OTP, and shared types

### 2.2 Open Badges 3.0 Builder
- [ ] Create `lib/openbadges.ts` — `buildCredentialPayload()` function
- [ ] Accept credential data + issuer profile, return unsigned JSON-LD conforming to OB 3.0 spec
- [ ] Use `NEXT_PUBLIC_APP_URL` for issuer ID and verification method URIs

### 2.3 Cryptographic Signing
- [ ] Create `lib/crypto.ts`:
  - `generateKeyPair()` — generate Ed25519 keypair, return base58-encoded strings
  - `signCredential(payload, privateKey)` — canonicalize -> SHA-256 -> sign -> attach proof
  - `verifyCredential(signedPayload, publicKey)` — extract proof -> re-canonicalize -> verify
- [ ] Use `jsonld.canonize()` for N-Quads canonicalization
- [ ] Use `bs58` for all base58 encode/decode operations
- [ ] Add JSDoc to all exported functions

### 2.4 Single Credential Issuance
- [ ] Build `app/(dashboard)/issuer/create/page.tsx` — form with name, description, criteria URL, evidence URL, expiration, recipient email
- [ ] Wire with react-hook-form + Zod resolver
- [ ] Create `createCredential` server action — validate, build payload, sign, insert DB, send invite email
- [ ] Invitation email includes `/claim/{badgeId}` link with credential name

### 2.5 Batch CSV Issuance
- [ ] Add CSV file upload component to `/issuer/create`
- [ ] Parse CSV, validate each row against Zod schema, show errors per row
- [ ] Create `batchCreateCredentials` server action — process each valid row: build, sign, insert, email
- [ ] Show progress/results summary after batch completes

### 2.6 Issuer Credentials List
- [ ] Build `app/(dashboard)/issuer/credentials/page.tsx` — table/list of all issued credentials
- [ ] Show: recipient email, credential name, status (colored badge), issued date
- [ ] Add status filter (All / Pending / Claimed / Revoked / Expired)

### 2.7 Validation Checkpoint
- [ ] Single credential creation works end-to-end (form -> DB -> email sent)
- [ ] CSV batch upload parses, validates, creates multiple credentials
- [ ] Credentials list shows all issued credentials with correct statuses
- [ ] Invitation emails contain valid claim links

---

## Phase 3: Earner Wallet & Claim Flow

### 3.1 Claim Page
- [ ] Build `app/claim/[badgeId]/page.tsx`
- [ ] Fetch credential by `badgeId`, verify `status === PENDING`
- [ ] Show credential preview: name, issuer (name + logo), description, issued date
- [ ] Show "Accept & Claim" button with terms text
- [ ] Handle edge cases: already claimed, revoked, expired, not found

### 3.2 Claim Action
- [ ] Create `claimCredential` server action
- [ ] Validate: credential exists, status is PENDING, user is authenticated
- [ ] Update `recipientId` to current user, set `status: CLAIMED`
- [ ] Redirect to wallet or show success with verification link

### 3.3 Earner Wallet
- [ ] Build `app/(dashboard)/earner/wallet/page.tsx` — responsive card grid
- [ ] `components/credential-card.tsx` — card with name, issuer, date, status badge
- [ ] Click card -> Radix Dialog modal with full metadata
- [ ] Modal includes: description, criteria link, evidence, expiry, JSON-LD preview (collapsible)

### 3.4 Privacy Toggle
- [ ] Add Radix Switch per credential card for public/private visibility
- [ ] Create `toggleVisibility` server action — toggle `isPublic` boolean
- [ ] `GET /api/credentials/[id]` respects `isPublic` (404 for private credentials on public access)

### 3.5 Validation Checkpoint
- [ ] Claim link from email works for authenticated user
- [ ] Credential transitions from PENDING to CLAIMED
- [ ] Claimed credential appears in earner wallet
- [ ] Privacy toggle hides credential from public API access

---

## Phase 4: Verification System

### 4.1 Verification API Route
- [ ] Build `app/api/verify/[id]/route.ts` — GET handler
- [ ] Fetch credential by `badgeId`, call `verifyCredential()` from `lib/crypto.ts`
- [ ] Return JSON: `{ valid, status, credential metadata, issuer info }`
- [ ] Handle not found, revoked, expired states

### 4.2 Public Verification Page
- [ ] Build `app/verify/[id]/page.tsx` — no auth required
- [ ] Call verification API, render result based on state
- [ ] Visual states: Valid (green), Invalid (red), Revoked (orange), Expired (gray), Not Found (404)
- [ ] Display: credential name, issuer, recipient, description, issuance/expiry dates

### 4.3 QR Code
- [ ] Generate QR code on verification page using `qrcode` library
- [ ] QR encodes the verification page's own URL
- [ ] Add "Download QR" button (PNG export)

### 4.4 Revocation
- [ ] Add "Revoke" button per credential on issuer credentials list
- [ ] Create `revokeCredential` server action — set `status: REVOKED`
- [ ] Confirmation dialog before revocation
- [ ] Verification page immediately reflects revoked state

### 4.5 Validation Checkpoint
- [ ] Valid credential shows green verification with full details
- [ ] Tampered/modified payload shows invalid signature
- [ ] Revoked credential shows revoked state on verification page
- [ ] QR code resolves to correct verification URL
- [ ] Round-trip: sign -> store -> fetch -> verify succeeds

---

## Phase 5: Sharing & Distribution

### 5.1 Open Graph Meta Tags
- [ ] Add `generateMetadata()` to `app/verify/[id]/page.tsx`
- [ ] Set `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card`
- [ ] Test with social preview debugger tools

### 5.2 Share Buttons
- [ ] Create `components/share-buttons.tsx`
- [ ] LinkedIn share (share-offsite URL with verification link)
- [ ] Twitter/X share (intent/tweet with text + URL)
- [ ] Email share (mailto: with subject and body)
- [ ] Style with lucide-react icons

### 5.3 Embed Snippet
- [ ] Generate `<iframe>` embed code for credential verification page
- [ ] Generate `<a>` link embed with badge title
- [ ] Copy-to-clipboard button with success feedback (Radix Toast)

### 5.4 Validation Checkpoint
- [ ] OG tags render correct social previews
- [ ] Share links open with pre-filled data on LinkedIn, Twitter, Email
- [ ] Embed snippets copy to clipboard and render correctly when pasted

---

## Phase 6: Security Hardening & Polish

### 6.1 Security
- [x] Rate limiting on `/api/verify/*` and `/claim/*` endpoints
- [x] Audit: confirm no private keys in client bundles (check build output)
- [x] Verify all Zod validation is server-side (not just client)
- [x] Enforce HTTPS-only cookies in NextAuth config
- [x] Rate limit OTP attempts per email

### 6.2 Error Handling
- [x] Error boundary components for dashboard and public pages
- [x] User-friendly messages: expired OTP, already claimed, invalid badge, revoked credential
- [x] Loading skeletons for async data fetches

### 6.3 Testing
- [x] Unit: Ed25519 sign/verify round-trip
- [x] Unit: JSON-LD builder output matches OB 3.0 schema
- [x] Unit: CSV parser validates and rejects bad rows
- [x] Unit: Zod schemas accept valid / reject invalid inputs
- [ ] E2E: OTP login flow (requires Playwright + running server)
- [ ] E2E: Issue -> Claim -> Verify full lifecycle (requires Playwright + running server)
