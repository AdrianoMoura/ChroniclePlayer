// Closed set of typed domain errors (architecture.md §Error-handling).
// Adapters translate transport failures into these; the UI decides
// presentation. Nothing else crosses the adapter boundary as an error.

export type DomainErrorKind =
  | 'auth-expired'
  | 'quota-exceeded'
  | 'network-unavailable'
  | 'channel-unavailable'
  | 'invalid-client-secret'
  | 'api-not-enabled'
  | 'internal'

export class DomainError extends Error {
  constructor(
    readonly kind: DomainErrorKind,
    message: string,
    readonly cause?: unknown
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export const authExpired = (message = 'authorization expired or revoked'): DomainError =>
  new DomainError('auth-expired', message)

export const quotaExceeded = (message = 'daily API quota exceeded'): DomainError =>
  new DomainError('quota-exceeded', message)

export const networkUnavailable = (cause?: unknown): DomainError =>
  new DomainError('network-unavailable', 'network unavailable', cause)

export const channelUnavailable = (channelId: string): DomainError =>
  new DomainError('channel-unavailable', `channel unavailable: ${channelId}`)

export const invalidClientSecret = (message: string): DomainError =>
  new DomainError('invalid-client-secret', message)

export const apiNotEnabled = (): DomainError =>
  new DomainError('api-not-enabled', 'YouTube Data API not enabled in the Google project')

export const internal = (message: string, cause?: unknown): DomainError =>
  new DomainError('internal', message, cause)

export function isDomainError(value: unknown, kind?: DomainErrorKind): value is DomainError {
  return value instanceof DomainError && (kind === undefined || value.kind === kind)
}
