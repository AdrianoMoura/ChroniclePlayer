import { describe, expect, it } from 'vitest'
import { isNewerVersion } from './version'

describe('isNewerVersion', () => {
  it('detects a newer patch/minor/major', () => {
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(true)
    expect(isNewerVersion('1.0.0', '1.1.0')).toBe(true)
    expect(isNewerVersion('1.0.0', '2.0.0')).toBe(true)
  })

  it('is false for equal or older versions', () => {
    expect(isNewerVersion('1.2.3', '1.2.3')).toBe(false)
    expect(isNewerVersion('1.2.3', '1.2.2')).toBe(false)
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(false)
  })

  it('ignores a leading v on either side', () => {
    expect(isNewerVersion('v1.0.0', 'v1.0.1')).toBe(true)
    expect(isNewerVersion('1.0.0', 'v1.0.1')).toBe(true)
  })

  it('handles differing segment counts', () => {
    expect(isNewerVersion('1.0', '1.0.1')).toBe(true)
    expect(isNewerVersion('1.0.0', '1.0')).toBe(false)
  })
})
