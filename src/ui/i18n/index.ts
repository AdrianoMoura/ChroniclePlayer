import type { Dict, LocaleMeta, MessageKey } from './types'

export type { MessageKey, LocaleMeta }

// D-054: locale dictionaries are discovered at build time from this
// directory — contributing a translation is just adding
// `src/ui/i18n/locales/<code>.ts` (meta + a Partial<Dict> of translated
// keys) in a PR; it appears in the Settings language dropdown automatically,
// no other code change needed. `eager: true` bundles every locale (there
// are only ever a handful) instead of lazy chunk-splitting.
const modules = import.meta.glob<{ meta: LocaleMeta; dict: Partial<Dict> }>('./locales/*.ts', {
  eager: true
})

const locales = new Map<string, { meta: LocaleMeta; dict: Partial<Dict> }>()
for (const mod of Object.values(modules)) {
  locales.set(mod.meta.code, mod)
}

const english = locales.get('en')?.dict as Dict // locales/en.ts always ships, always complete

export const AVAILABLE_LOCALES: LocaleMeta[] = Array.from(locales.values())
  .map((locale) => locale.meta)
  .sort((a, b) => a.nativeName.localeCompare(b.nativeName))

function detectSystemLocale(): string {
  const preferred =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language]
  for (const candidate of preferred) {
    if (locales.has(candidate)) return candidate
  }
  for (const candidate of preferred) {
    const base = candidate.split('-')[0]
    const match = Array.from(locales.keys()).find((code) => code.split('-')[0] === base)
    if (match !== undefined) return match
  }
  return 'en'
}

// 'system' is a persisted setting value, never a lookup key — resolved to a
// real locale code here, once per call, since the OS locale doesn't change
// mid-session.
let activeCode = detectSystemLocale()

export function setLocale(language: string): void {
  activeCode = language === 'system' || !locales.has(language) ? detectSystemLocale() : language
}

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const template = locales.get(activeCode)?.dict[key] ?? english[key]
  if (vars === undefined) return template
  let result: string = template
  for (const [name, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${name}}`, String(value))
  }
  return result
}
