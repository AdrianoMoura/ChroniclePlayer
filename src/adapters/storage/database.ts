import { DatabaseSync } from 'node:sqlite'

// node:sqlite: built into Electron's Node runtime, no native rebuild, and
// contract tests run under the system Node in Vitest. WAL: one writer (sync)
// + one reader (UI) without contention (architecture.md).
export function openDatabase(file: string): DatabaseSync {
  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  return db
}
