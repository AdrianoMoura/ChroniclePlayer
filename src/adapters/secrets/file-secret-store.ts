import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { SecretStore } from '../../core/ports'

// D-013 (recommended option exercised): secrets live in one encrypted file
// in the app data dir; the cipher is injected — the platform provides
// Electron safeStorage (OS-keychain-backed where available). isSecure()
// surfaces whether real OS encryption backs it, so settings can show the
// honest warning when it doesn't. Values are never stored in plaintext.

export interface SecretCipher {
  encrypt(plain: string): Buffer
  decrypt(data: Buffer): string
  isSecure(): boolean
}

export class FileSecretStore implements SecretStore {
  private entries: Record<string, string> | null = null

  constructor(
    private readonly file: string,
    private readonly cipher: SecretCipher
  ) {}

  get(key: string): string | null {
    const encoded = this.load()[key]
    if (encoded === undefined) return null
    return this.cipher.decrypt(Buffer.from(encoded, 'base64'))
  }

  set(key: string, value: string): void {
    const entries = this.load()
    entries[key] = this.cipher.encrypt(value).toString('base64')
    this.persist(entries)
  }

  delete(key: string): void {
    const entries = this.load()
    delete entries[key]
    this.persist(entries)
  }

  isSecure(): boolean {
    return this.cipher.isSecure()
  }

  private load(): Record<string, string> {
    if (this.entries !== null) return this.entries
    try {
      this.entries = JSON.parse(readFileSync(this.file, 'utf8')) as Record<string, string>
    } catch {
      this.entries = {}
    }
    return this.entries
  }

  private persist(entries: Record<string, string>): void {
    this.entries = entries
    mkdirSync(dirname(this.file), { recursive: true })
    writeFileSync(this.file, JSON.stringify(entries, null, 2), { mode: 0o600 })
  }
}
