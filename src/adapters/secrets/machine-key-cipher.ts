import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { hostname, userInfo } from 'node:os'
import type { SecretCipher } from './file-secret-store'

// D-013 fallback: when no OS keychain exists (headless Linux, minimal WMs),
// secrets are encrypted with a key derived from stable machine facts. This is
// obfuscation, not protection against the local user — isSecure() reports it
// so the UI can show an honest warning. Still better than plaintext.

const KEY_CONTEXT = 'chronicle-secret-store-v1'
const IV_LENGTH = 12
const TAG_LENGTH = 16

export class MachineKeyCipher implements SecretCipher {
  private readonly key: Buffer

  constructor(machineSeed: string = defaultMachineSeed()) {
    this.key = scryptSync(machineSeed, KEY_CONTEXT, 32)
  }

  encrypt(plain: string): Buffer {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted])
  }

  decrypt(data: Buffer): string {
    const iv = data.subarray(0, IV_LENGTH)
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH)
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  }

  isSecure(): boolean {
    return false
  }
}

function defaultMachineSeed(): string {
  let machineId = ''
  try {
    machineId = readFileSync('/etc/machine-id', 'utf8').trim()
  } catch {
    // non-Linux or unreadable — hostname/username still bind to the machine
  }
  return `${machineId}|${hostname()}|${userInfo().username}`
}
