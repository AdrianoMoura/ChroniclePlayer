import { describe, expect, it } from 'vitest'
import { pruneCutoffIso } from './retention'

describe('pruneCutoffIso', () => {
  it('subtracts whole months from the given date', () => {
    const now = new Date(2026, 8, 4) // 2026-09-04, local
    const cutoff = new Date(pruneCutoffIso(now, 6))
    expect(cutoff.getFullYear()).toBe(2026)
    expect(cutoff.getMonth()).toBe(2) // March
    expect(cutoff.getDate()).toBe(4)
  })

  it('rolls back across a year boundary', () => {
    const now = new Date(2026, 1, 15) // 2026-02-15
    const cutoff = new Date(pruneCutoffIso(now, 24))
    expect(cutoff.getFullYear()).toBe(2024)
    expect(cutoff.getMonth()).toBe(1)
    expect(cutoff.getDate()).toBe(15)
  })
})
