import SqliteDatabase, { type Database } from 'better-sqlite3'

// WAL: one writer (sync) + one reader (UI) without contention (architecture.md).
export function openDatabase(file: string): Database {
  const db = new SqliteDatabase(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}
