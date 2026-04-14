/**
 * VeriCred Cryptographic Utilities
 *
 * Signing flow:
 *   JSON-LD payload (no proof)
 *   → canonicalize() — RFC 8785 deterministic JSON
 *   → SHA-256 hash
 *   → ed25519.sign(hash, privateKey)
 *   → bs58.encode(signature) → proofValue
 *   → Attach proof object to payload
 *
 * Verification flow:
 *   Signed JSON-LD
 *   → Extract & remove proof
 *   → Re-canonicalize
 *   → SHA-256
 *   → ed25519.verify(signature, hash, publicKey)
 *
 * ⚠️ SERVER-SIDE ONLY — never import this module from client bundles.
 */

import * as ed from '@noble/ed25519'
import bs58 from 'bs58'
import { createHash } from 'crypto'

// ── Setup synchronous SHA-512 for @noble/ed25519 ──────────────────────────────
ed.etc.sha512Sync = (...m: Uint8Array[]) => {
  const combined = Buffer.concat(m.map((x) => Buffer.from(x)))
  return new Uint8Array(createHash('sha512').update(combined).digest())
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Canonicalizes a JSON-LD document using RFC 8785 JSON Canonicalization Scheme.
 *
 * RFC 8785 (via the `canonicalize` package) is used instead of URDNA2015 N-Quads because
 * URDNA2015 requires resolving the OB 3.0 `@context` URL over the network at sign/verify
 * time. If that fetch succeeds during signing but fails during verification (or vice versa),
 * the two calls produce different canonical forms and the signature check breaks — even for
 * an untampered credential.
 *
 * RFC 8785 is a deterministic in-process operation with no network dependency, guaranteeing
 * that sign → store → verify always round-trips correctly within this system.
 *
 * TODO (post-MVP): Switch to URDNA2015 with a bundled local document loader for full
 * Open Badges 3.0 spec compliance with external verifiers.
 */
async function canonicalizePayload(payload: Record<string, unknown>): Promise<string> {
  const { default: canonicalize } = await import('canonicalize')
  const result = canonicalize(payload)
  if (result == null) throw new Error('Failed to canonicalize credential payload')
  return result
}

// ── Exported API ──────────────────────────────────────────────────────────────

/**
 * Generates a fresh Ed25519 key pair.
 * @returns Base58-encoded private and public keys
 */
export function generateKeyPair(): { privateKey: string; publicKey: string } {
  const privateKeyBytes = ed.utils.randomPrivateKey()
  const publicKeyBytes = ed.getPublicKey(privateKeyBytes)
  return {
    privateKey: bs58.encode(privateKeyBytes),
    publicKey: bs58.encode(publicKeyBytes),
  }
}

/**
 * Signs a JSON-LD credential payload and attaches a proof block.
 *
 * @param payload - Unsigned JSON-LD payload (no proof field)
 * @param privateKeyBase58 - Issuer private key (base58-encoded)
 * @param issuerId - IssuerProfile.id — used to construct the verificationMethod URL
 * @returns Signed JSON-LD payload with proof attached
 */
export async function signCredential(
  payload: Record<string, unknown>,
  privateKeyBase58: string,
  issuerId: string,
): Promise<Record<string, unknown>> {
  // 1. Canonicalize
  const canonical = await canonicalizePayload(payload)

  // 2. SHA-256 hash of canonical string
  const hash = new Uint8Array(createHash('sha256').update(canonical).digest())

  // 3. Sign with Ed25519
  const privateKeyBytes = bs58.decode(privateKeyBase58)
  const signature = ed.sign(hash, privateKeyBytes)

  // 4. Encode signature as base58
  const proofValue = bs58.encode(signature)

  // 5. Attach proof to payload
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

/**
 * Verifies the Ed25519 signature of a signed JSON-LD credential.
 *
 * @param signedPayload - Full signed JSON-LD (includes proof)
 * @param publicKeyBase58 - Issuer public key (base58-encoded)
 * @returns true if the signature is valid
 */
export async function verifyCredential(
  signedPayload: Record<string, unknown>,
  publicKeyBase58: string,
): Promise<boolean> {
  const { proof, ...payloadWithoutProof } = signedPayload as {
    proof: { proofValue: string }
    [key: string]: unknown
  }

  if (!proof?.proofValue) {
    throw new Error('Credential is missing a proof.proofValue field')
  }

  // 1. Re-canonicalize payload without proof
  const canonical = await canonicalizePayload(payloadWithoutProof)

  // 2. SHA-256 hash
  const hash = new Uint8Array(createHash('sha256').update(canonical).digest())

  // 3. Decode signature and public key
  const signature = bs58.decode(proof.proofValue)
  const publicKeyBytes = bs58.decode(publicKeyBase58)

  // 4. Verify
  return ed.verify(signature, hash, publicKeyBytes)
}
