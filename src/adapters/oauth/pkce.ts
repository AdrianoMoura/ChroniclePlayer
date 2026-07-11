import { createHash, randomBytes } from 'node:crypto'

// PKCE S256 (authentication.md §OAuth flow). No SDK: the flow is simple
// enough to implement directly, which keeps it auditable.

export interface PkcePair {
  verifier: string
  challenge: string
}

export function generatePkce(): PkcePair {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function randomState(): string {
  return randomBytes(16).toString('base64url')
}
