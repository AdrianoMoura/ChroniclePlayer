import { describe, expect, it } from 'vitest'
import { MachineKeyCipher } from './machine-key-cipher'

describe('MachineKeyCipher (D-013 fallback)', () => {
  it('round-trips values', () => {
    const cipher = new MachineKeyCipher('seed-a')
    expect(cipher.decrypt(cipher.encrypt('refresh-token-value'))).toBe('refresh-token-value')
  })

  it('is stable across instances with the same machine seed', () => {
    const first = new MachineKeyCipher('seed-a').encrypt('v')
    expect(new MachineKeyCipher('seed-a').decrypt(first)).toBe('v')
  })

  it('a different machine cannot decrypt (different seed)', () => {
    const data = new MachineKeyCipher('seed-a').encrypt('v')
    expect(() => new MachineKeyCipher('seed-b').decrypt(data)).toThrow()
  })

  it('uses a fresh IV per encryption (no ciphertext reuse)', () => {
    const cipher = new MachineKeyCipher('seed-a')
    expect(cipher.encrypt('same').equals(cipher.encrypt('same'))).toBe(false)
  })

  it('detects tampering (GCM auth tag)', () => {
    const cipher = new MachineKeyCipher('seed-a')
    const data = cipher.encrypt('v')
    data[data.length - 1] ^= 0xff
    expect(() => cipher.decrypt(data)).toThrow()
  })

  it('is honest about being reversible', () => {
    expect(new MachineKeyCipher('seed-a').isSecure()).toBe(false)
  })
})
