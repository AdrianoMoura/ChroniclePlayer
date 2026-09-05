// D-020 exercised (local-data.md §Retention): a video published before this
// cutoff qualifies for pruning, provided it also has no state row and isn't
// in any playlist — those two checks live in the SQL (repositories.ts),
// since they need the DB; only the date arithmetic is pure enough for core.
export function pruneCutoffIso(now: Date, months: number): string {
  return new Date(now.getFullYear(), now.getMonth() - months, now.getDate()).toISOString()
}
