import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FileSecretStore, type SecretCipher } from './file-secret-store'

// Reversible fake cipher: enough to prove the store round-trips through the
// cipher and never writes plaintext.
const fakeCipher: SecretCipher = {
  encrypt: (plain) => Buffer.from([...Buffer.from(plain, 'utf8')].map((b) => b ^ 0x5a)),
  decrypt: (data) => Buffer.from([...data].map((b) => b ^ 0x5a)).toString('utf8'),
  isSecure: () => false
}

function tempFile(): string {
  return join(mkdtempSync(join(tmpdir(), 'chronicle-secrets-')), 'secrets.json')
}

describe('FileSecretStore', () => {
  it('round-trips values and survives a reload from disk', () => {
    const file = tempFile()
    const store = new FileSecretStore(file, fakeCipher)
    store.set('default/refresh-token', 'rt-secret')
    expect(store.get('default/refresh-token')).toBe('rt-secret')

    const reloaded = new FileSecretStore(file, fakeCipher)
    expect(reloaded.get('default/refresh-token')).toBe('rt-secret')
  })

  it('never writes the plaintext to disk', () => {
    const file = tempFile()
    new FileSecretStore(file, fakeCipher).set('k', 'super-sensitive-value')
    expect(readFileSync(file, 'utf8')).not.toContain('super-sensitive-value')
  })

  it('deletes entries and reports missing keys as null', () => {
    const store = new FileSecretStore(tempFile(), fakeCipher)
    expect(store.get('missing')).toBeNull()
    store.set('k', 'v')
    store.delete('k')
    expect(store.get('k')).toBeNull()
  })

  it('exposes the cipher security level for the D-013 warning', () => {
    expect(new FileSecretStore(tempFile(), fakeCipher).isSecure()).toBe(false)
  })
})
