// Chronicle only ever compares its own tags (vMAJOR.MINOR.PATCH, no
// pre-release suffixes in practice), so a minimal numeric comparison is
// enough — no need for a full semver dependency.
export function isNewerVersion(current: string, candidate: string): boolean {
  const strip = (v: string): number[] =>
    v
      .replace(/^v/, '')
      .split('.')
      .map((part) => Number.parseInt(part, 10) || 0)
  const a = strip(candidate)
  const b = strip(current)
  const length = Math.max(a.length, b.length)
  for (let i = 0; i < length; i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}
