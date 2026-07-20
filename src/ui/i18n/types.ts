import { dict as en } from './locales/en'

// `en` is the source of truth for the *set* of keys — values are widened to
// `string` (not en's own literal types) so a translation's dict can hold its
// own different string per key. Other locales are Partial<Dict>, so a
// contributor's translation can lag behind new keys without a type error —
// t() falls back to English per-key (D-054).
export type Dict = { [K in keyof typeof en]: string }
export type MessageKey = keyof Dict

export interface LocaleMeta {
  // BCP-47-ish code used for lookup and system-locale matching, e.g. 'en', 'pt-BR'.
  code: string
  // Name shown in the Settings dropdown, in that language itself (not English).
  nativeName: string
}
