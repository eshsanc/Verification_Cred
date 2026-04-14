# CLAUDE CODE: MVP BUILD INSTRUCTIONS

**Project:** VeriCred (Credentials Management System)  
**Scope:** Minimum Viable Product (MVP)  
**Objective:** Implement a secure, standards-compliant digital credential issuance, management, and sharing platform.  

---

## 1. TECHNICAL STACK & INITIALIZATION

| Component               | Specification                                     |
| ----------------------- | ------------------------------------------------- |
| **Framework**           | Next.js 15 (App Router, Server Actions, React 19) |
| **Language**            | TypeScript (strict mode)                          |
| **Database**            | PostgreSQL 15+ via Prisma ORM 6.x                 |
| **Authentication**      | NextAuth.js v5 (Credentials + Email OTP)          |
| **Crypto/Signing**      | `@noble/ed25519`, `jsonld`, `canonicalize`        |
| **Email/Notifications** | Resend or Nodemailer (MVP)                        |
| **Styling**             | Tailwind CSS + Radix UI components                |
| **Validation**          | Zod + `react-hook-form`                           |
| **Deployment**          | Vercel (MVP) + Supabase/Neon PostgreSQL           |

**Initialization Commands:**

```bash
npx create-next-app@latest vericred-mvp --typescript --tailwind --app --eslint
cd vericred-mvp
npm install prisma @prisma/client next-auth@beta zod @hookform/resolvers react-hook-form @noble/ed25519 jsonld canonicalize resend lucide-react clsx tailwind-merge
npx prisma init
```

---

## 2. REPOSITORY STRUCTURE

```
vericred-mvp/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/issuer/...
│   ├── (dashboard)/earner/...
│   ├── api/credentials/[id]/route.ts
│   ├── api/verify/[id]/route.ts
│   ├── verify/[id]/page.tsx
│   └── layout.tsx
├── lib/
│   ├── auth.ts
│   ├── prisma.ts
│   ├── crypto.ts
│   └── openbadges.ts
├── prisma/schema.prisma
├── public/badges/
├── components/
├── middleware.ts
└── .env.local
```

---

## 3. DATABASE SCHEMA (PRISMA)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  role          Role     @default(EARNER)
  credentials   IssuedCredential[]
  createdAt     DateTime @default(now())
}

model IssuerProfile {
  id          String   @id @default(cuid())
  name        String
  logoUrl     String?
  website     String?
  publicKey   String
  privateKey  String   // Store encrypted in production; use env for MVP
  credentials IssuedCredential[]
}

model IssuedCredential {
  id          String   @id @default(cuid())
  badgeId     String   @unique
  recipientId String
  recipient   User     @relation(fields: [recipientId], references: [id])
  issuerId    String
  issuer      IssuerProfile @relation(fields: [issuerId], references: [id])
  name        String
  description String
  criteriaUrl String?
  evidenceUrl String?
  issuedAt    DateTime @default(now())
  expiresAt   DateTime?
  status      Status   @default(PENDING)
  jsonLd      Json     // Open Badges 3.0 payload
  createdAt   DateTime @default(now())
}

enum Role { ADMIN, ISSUER, EARNER, VERIFIER }
enum Status { PENDING, CLAIMED, REVOKED, EXPIRED }
```

---

## 4. IMPLEMENTATION PHASES (SEQUENTIAL)

### Phase 1: Foundation & Authentication

1. Configure `prisma/schema.prisma` with the schema above.
2. Run `npx prisma db push` and generate client.
3. Implement NextAuth v5 with email OTP flow.
4. Create role-based middleware to route `/issuer/*` and `/earner/*`.
5. **Validation Criteria:** User can register, receive OTP, log in, and see role-specific dashboard shell.

### Phase 2: Credential Designer & Issuance

1. Build `/issuer/create` form: name, description, criteria URL, evidence upload, expiration date.
2. Generate Open Badges 3.0 JSON-LD payload (see Section 5).
3. Implement bulk CSV upload parser (Zod validation, map to payload array).
4. Create server action to insert credentials into DB with `status: PENDING`.
5. Trigger invitation email with claim link (`/claim/{badgeId}`).
6. **Validation Criteria:** Issuer can create single/batch credentials, view issuance list, and trigger email.

### Phase 3: Earner Wallet & Claim Flow

1. Build `/claim/{badgeId}` page: verify token, display credential preview, accept terms.
2. On claim, update `status: CLAIMED`, link to `User.id`, generate shareable URL.
3. Build `/earner/wallet` gallery with metadata modal.
4. Implement privacy toggle (public/private visibility).
5. **Validation Criteria:** User receives link, claims credential, views it in wallet, toggles visibility.

### Phase 4: Cryptographic Signing & Verification

1. Implement `lib/crypto.ts`: sign JSON-LD payload using Ed25519 private key, attach proof.
2. Create `/verify/{id}` public page: fetch credential JSON, verify signature against issuer public key, display trust status.
3. Generate QR code pointing to verification URL.
4. **Validation Criteria:** Signature generation succeeds, verification page displays valid/invalid/revoked states, QR resolves correctly.

### Phase 5: Sharing & Distribution

1. Implement Open Graph meta tags on `/verify/{id}` for social previews.
2. Add one-click share buttons:
   - LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url={verifyUrl}`
   - Twitter/X: `https://twitter.com/intent/tweet?text={encodedText}&url={verifyUrl}`
   - Email: `mailto:?subject={title}&body={verifyUrl}`
3. Add copy-to-clipboard for embed snippet (`<iframe>` or `<a>`).
4. **Validation Criteria:** Social previews render correctly, share links open with pre-filled data, copy works.

---

## 5. CORE TECHNICAL SPECIFICATIONS

### 5.1 Open Badges 3.0 JSON-LD Template

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

### 5.2 Cryptographic Signing Flow

1. Canonicalize JSON-LD using `jsonld` + `canonicalize`.
2. Hash canonical payload with SHA-256.
3. Sign hash using `@noble/ed25519`.
4. Encode signature in base58, attach to `proof.proofValue`.
5. Store full JSON-LD in `jsonLd` column.

### 5.3 Verification Logic

1. Fetch credential JSON via public route.
2. Extract `proof` object.
3. Re-canonicalize payload without `proofValue`.
4. Verify signature against `issuer.publicKey`.
5. Return `{ valid: boolean, status: string, metadata: object }`.

---

## 6. TESTING & VALIDATION PROTOCOL

| Phase    | Automated Test                                 | Manual Validation                 |
| -------- | ---------------------------------------------- | --------------------------------- |
| Auth     | Playwright: OTP login flow                     | Session persistence, role routing |
| Issuance | Jest: CSV parser, JSON-LD schema validation    | Batch upload, email delivery      |
| Claim    | Cypress: Token redemption, status update       | Wallet gallery visibility         |
| Crypto   | Jest: Sign/verify round-trip, tamper detection | Revocation flag propagation       |
| Sharing  | Lighthouse: OG meta tags, social preview       | Platform share link behavior      |

**Security Gates:**

- Never expose `privateKey` in client bundles.
- Implement rate limiting on `/api/verify/*` and `/claim/*`.
- Sanitize all user inputs with Zod.
- Enforce HTTPS-only cookies for sessions.

---

## 7. EXECUTION DIRECTIVES FOR CLAUDE CODE

1. **Execute sequentially.** Complete Phase 1, run validation, then proceed. Do not skip phases.
2. **Maintain standards compliance.** All credential payloads must conform to Open Badges 3.0 schema.
3. **Use Server Actions & Route Handlers.** Avoid client-side data mutations for issuance/verification.
4. **Document inline.** Add JSDoc to cryptographic functions and API routes.
5. **Fail fast on crypto errors.** Throw explicit errors for malformed JSON-LD, invalid keys, or verification failures.
6. **Output structure per phase:** Provide file diffs, migration commands, and verification steps before proceeding.
7. **Environment variables required:**
   
   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_SECRET=...
   ISSUER_PRIVATE_KEY=base58_encoded_ed25519_private_key
   ISSUER_PUBLIC_KEY=base58_encoded_ed25519_public_key
   RESEND_API_KEY=...
   ```

---

**Instruction to Claude Code:**  
Begin with Phase 1. Generate all necessary files, configurations, and database migrations. Provide explicit terminal commands to execute, followed by a verification checklist. Await confirmation before proceeding to Phase 2. Maintain formal documentation standards throughout.
