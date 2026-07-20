import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { SecretStore } from '../../core/ports'

// Secrets live in one encrypted file in the app data dir; the cipher is
// injected — Electron safeStorage when a real keychain backs it, else a
// machine-derived-key fallback (D-013). isSecure() reports which one so
// settings can show an honest warning. Values are never stored in plaintext.
//
// The file pins the cipher that wrote it (`cipher` field), so entries keep
// decrypting correctly even if the machine later gains a keychain.

export interface SecretCipher {
  encrypt(plain: string): Buffer
  decrypt(data: Buffer): string
  isSecure(): boolean
}

interface StoreFile {
  cipher: string
  entries: Record<string, string>
}

export class FileSecretStore implements SecretStore {
  private cache: StoreFile | null = null

  constructor(
    private readonly file: string,
    private readonly cipher: SecretCipher,
    private readonly cipherId: string = 'default'
  ) {}

  // Which cipher wrote an existing store file (null = no file yet).
  static storedCipherId(file: string): string | null {
    try {
      if (!existsSync(file)) return null
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<StoreFile>
      return typeof parsed.cipher === 'string' ? parsed.cipher : null
    } catch {
      return null
    }
  }

  get(key: string): string | null {
    const encoded = this.load().entries[key]
    if (encoded === undefined) return null
    return this.cipher.decrypt(Buffer.from(encoded, 'base64'))
  }

  set(key: string, value: string): void {
    const store = this.load()
    store.entries[key] = this.cipher.encrypt(value).toString('base64')
    this.persist(store)
  }

  delete(key: string): void {
    const store = this.load()
    delete store.entries[key]
    this.persist(store)
  }

  isSecure(): boolean {
    return this.cipher.isSecure()
  }

  private load(): StoreFile {
    if (this.cache !== null) return this.cache
    try {
      const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<StoreFile>
      this.cache = {
        cipher: typeof parsed.cipher === 'string' ? parsed.cipher : this.cipherId,
        entries: parsed.entries ?? {}
      }
    } catch {
      this.cache = { cipher: this.cipherId, entries: {} }
    }
    return this.cache
  }

  private persist(store: StoreFile): void {
    this.cache = store
    mkdirSync(dirname(this.file), { recursive: true })
    writeFileSync(this.file, JSON.stringify(store, null, 2), { mode: 0o600 })
  }
}
