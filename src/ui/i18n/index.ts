import { en } from './en'

// B-017: all UI copy lives here, not inline in components. Only English
// ships today; a future locale is a new dict matching `Dict`'s keys (TS
// enforces parity) plus a line in `activeDict` below — no component change.
type Dict = typeof en
export type MessageKey = keyof Dict

const activeDict: Dict = en

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const template = activeDict[key]
  if (vars === undefined) return template
  let result: string = template
  for (const [name, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${name}}`, String(value))
  }
  return result
}
