// Bounded-concurrency map (youtube-api.md politeness: ≤ 8 parallel RSS
// fetches, bounded Shorts probes). Failures don't abort the pool — each
// item settles independently, mirroring per-channel failure isolation.

export type PoolResult<R> = { ok: true; value: R } | { ok: false; error: unknown }

export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<PoolResult<R>[]> {
  const results = new Array<PoolResult<R>>(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    for (;;) {
      const index = nextIndex++
      if (index >= items.length) return
      try {
        results[index] = { ok: true, value: await fn(items[index]) }
      } catch (error) {
        results[index] = { ok: false, error }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
