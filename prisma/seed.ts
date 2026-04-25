/**
 * Seed script — creates test users, an IssuerProfile with Ed25519 keypair,
 * and sample credentials in various statuses with properly signed JSON-LD payloads.
 *
 * Run: npm run db:seed
 */

import { PrismaClient, Role, Status } from '@prisma/client'
import * as ed from '@noble/ed25519'
import bs58 from 'bs58'
import canonicalize from 'canonicalize'
import { createHash, randomUUID } from 'crypto'

// ── Setup synchronous SHA-512 so @noble/ed25519 key operations work in Node.js
ed.etc.sha512Sync = (...m: Uint8Array[]) => {
  const combined = Buffer.concat(m.map((x) => Buffer.from(x)))
  return new Uint8Array(createHash('sha512').update(combined).digest())
}

const prisma = new PrismaClient()
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'

// ── Inline sign helpers (mirrors lib/crypto.ts — no TS path aliases in tsx) ──

async function signPayload(
  payload: Record<string, unknown>,
  privateKeyBase58: string,
  issuerId: string,
): Promise<Record<string, unknown>> {
  const canonical = canonicalize(payload)
  if (canonical == null) throw new Error('Failed to canonicalize payload')
  const hash = new Uint8Array(createHash('sha256').update(canonical).digest())
  const privateKeyBytes = bs58.decode(privateKeyBase58)
  const signature = await ed.signAsync(hash, privateKeyBytes)
  const proofValue = bs58.encode(signature)
  return {
    ...payload,
    proof: {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      verificationMethod: `${APP_URL}/issuers/${issuerId}#keys-1`,
      proofPurpose: 'assertionMethod',
      proofValue,
    },
  }
}

async function main() {
  console.log('🌱  Seeding VeriCred database...\n')

  // ── Clean slate ────────────────────────────────────────────────────────────
  await prisma.issuedCredential.deleteMany()
  await prisma.issuerProfile.deleteMany()
  await prisma.user.deleteMany()

  // ── Ed25519 keypair for the issuer ─────────────────────────────────────────
  const privateKeyBytes = ed.utils.randomPrivateKey()
  const publicKeyBytes = ed.getPublicKey(privateKeyBytes)
  const privateKeyBase58 = bs58.encode(privateKeyBytes)
  const publicKeyBase58 = bs58.encode(publicKeyBytes)

  // ── Users ──────────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: { email: 'admin@vericred.dev', name: 'Admin User', role: Role.ADMIN },
  })

  const issuerUser = await prisma.user.create({
    data: { email: 's.sanchit8192@gmail.com', name: 'Acme Corp Issuer', role: Role.ISSUER },
  })

  const alice = await prisma.user.create({
    data: { email: 'alice@example.com', name: 'Alice Johnson', role: Role.EARNER },
  })

  const bob = await prisma.user.create({
    data: { email: 'bob@example.com', name: 'Bob Smith', role: Role.EARNER },
  })

  // ── IssuerProfile ──────────────────────────────────────────────────────────
  const issuerProfile = await prisma.issuerProfile.create({
    data: {
      name: 'Acme Corp',
      website: 'https://acme.example.com',
      publicKey: publicKeyBase58,
      privateKey: privateKeyBase58,
    },
  })

  // ── Helper: build unsigned OB 3.0 payload then sign it ───────────────────
  async function buildSignedJsonLd(
    badgeId: string,
    credName: string,
    description: string,
    recipientEmail: string,
    criteriaUrl?: string,
  ) {
    const payload: Record<string, unknown> = {
      '@context': ['https://www.imsglobal.org/spec/ob/v3p0/context-3.0.2.json'],
      type: ['AchievementCredential'],
      id: `urn:uuid:${badgeId}`,
      issuer: {
        id: `${APP_URL}/issuers/${issuerProfile.id}`,
        type: ['Profile'],
        name: issuerProfile.name,
        url: issuerProfile.website,
      },
      credentialSubject: {
        id: `mailto:${recipientEmail}`,
        achievement: {
          id: `urn:uuid:${randomUUID()}`,
          type: ['Achievement'],
          name: credName,
          description,
          ...(criteriaUrl ? { criteria: { id: criteriaUrl } } : {}),
        },
      },
      issuanceDate: new Date().toISOString(),
    }
    return signPayload(payload, privateKeyBase58, issuerProfile.id)
  }

  // ── Sample credentials ─────────────────────────────────────────────────────

  // PENDING — Alice has not yet claimed this
  const pendingBadgeId = randomUUID()
  await prisma.issuedCredential.create({
    data: {
      badgeId: pendingBadgeId,
      name: 'TypeScript Fundamentals',
      description: 'Demonstrates proficiency in TypeScript type system and language features.',
      criteriaUrl: 'https://acme.example.com/criteria/typescript',
      status: Status.PENDING,
      isPublic: false,
      jsonLd: await buildSignedJsonLd(
        pendingBadgeId,
        'TypeScript Fundamentals',
        'Demonstrates proficiency in TypeScript type system and language features.',
        alice.email,
        'https://acme.example.com/criteria/typescript',
      ) as object,
      recipientId: alice.id,
      issuerId: issuerProfile.id,
    },
  })

  // CLAIMED — Alice has claimed this (signed, publicly verifiable)
  const claimedBadgeId = randomUUID()
  await prisma.issuedCredential.create({
    data: {
      badgeId: claimedBadgeId,
      name: 'React Advanced Patterns',
      description: 'Mastery of advanced React patterns including hooks, context, and performance optimisation.',
      criteriaUrl: 'https://acme.example.com/criteria/react-advanced',
      status: Status.CLAIMED,
      isPublic: true,
      jsonLd: await buildSignedJsonLd(
        claimedBadgeId,
        'React Advanced Patterns',
        'Mastery of advanced React patterns including hooks, context, and performance optimisation.',
        alice.email,
        'https://acme.example.com/criteria/react-advanced',
      ) as object,
      recipientId: alice.id,
      issuerId: issuerProfile.id,
    },
  })

  // REVOKED — Bob's credential was revoked
  const revokedBadgeId = randomUUID()
  await prisma.issuedCredential.create({
    data: {
      badgeId: revokedBadgeId,
      name: 'Python Data Science',
      description: 'Proficiency in Python for data science applications and machine learning workflows.',
      criteriaUrl: 'https://acme.example.com/criteria/python-ds',
      status: Status.REVOKED,
      isPublic: false,
      jsonLd: await buildSignedJsonLd(
        revokedBadgeId,
        'Python Data Science',
        'Proficiency in Python for data science applications and machine learning workflows.',
        bob.email,
        'https://acme.example.com/criteria/python-ds',
      ) as object,
      recipientId: bob.id,
      issuerId: issuerProfile.id,
    },
  })

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('✅  Seed complete!\n')
  console.log('👤  Test users (log in via OTP at /login):')
  console.log(`    Admin   → ${admin.email}`)
  console.log(`    Issuer  → ${issuerUser.email}  ← use this to log in`)
  console.log(`    Earner1 → ${alice.email}`)
  console.log(`    Earner2 → ${bob.email}`)
  console.log('\n🔑  Issuer Ed25519 keypair (stored in DB, issuer_profiles table):')
  console.log(`    Public key  (base58): ${publicKeyBase58}`)
  console.log(`    Private key (base58): ${privateKeyBase58}`)
  console.log('\n📋  Sample credentials:')
  console.log(`    PENDING  → /claim/${pendingBadgeId}`)
  console.log(`    CLAIMED  → /verify/${claimedBadgeId}   ← test "Credential Verified"`)
  console.log(`    REVOKED  → /verify/${revokedBadgeId}   ← test "Credential Revoked"`)
  console.log('\n⚠️   The seed generates fresh keys each run.')
  console.log('     Any credentials issued via the app UI use the key stored in DB,')
  console.log('     not ISSUER_PRIVATE_KEY from .env (that env var is unused in MVP).')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
