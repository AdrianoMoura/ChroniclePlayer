import { useCallback, useEffect, useRef, useState } from 'react'
import type { ResultDto } from '../ipc/contract'
import { t } from './i18n'

// Wraps a write action (like/subscribe/comment) so a missing incremental
// write-scope grant surfaces as an in-app dialog explaining what's about to
// happen before the system browser opens for Google's consent screen. On
// confirm, requests the scope and retries the action; on cancel, resolves
// as 'cancelled'.
export function useWriteScopeGate() {
  const [pending, setPending] = useState<{ onDecide: (proceed: boolean) => void } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // No text input here to naturally take focus on open — without this, the
  // dialog's own keydown handler (Escape) would never actually receive it
  // (see AddToPlaylistDialog's own copy of this comment for the full
  // reasoning).
  useEffect(() => {
    if (pending !== null) containerRef.current?.focus()
  }, [pending])

  const run = useCallback(<T,>(
    action: () => Promise<ResultDto<T>>,
    // Unsubscribe needs the owning account's grant, not necessarily the
    // primary account's — callers pass a narrower request when the default
    // (primary-account) consent wouldn't apply.
    requestScope: () => Promise<ResultDto<void>> = () => window.chronicle.requestWriteScope()
  ): Promise<ResultDto<T>> => {
    return action().then((result) => {
      if (result.ok || result.errorKind !== 'write-scope-required') return result
      return new Promise<ResultDto<T>>((resolve) => {
        setPending({
          onDecide: (proceed) => {
            setPending(null)
            if (!proceed) {
              resolve({ ok: false, errorKind: 'cancelled', message: 'cancelled by user' })
              return
            }
            void requestScope().then((consent) => {
              if (!consent.ok) {
                resolve({ ok: false, errorKind: consent.errorKind, message: consent.message })
                return
              }
              resolve(action())
            })
          }
        })
      })
    })
  }, [])

  const dialog =
    pending !== null ? (
      <div className="overlay-backdrop" onClick={() => pending.onDecide(false)}>
        <div
          ref={containerRef}
          tabIndex={-1}
          className="overlay write-scope-dialog"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            // A dialog on top of the content owns Escape while it's open —
            // never let it bubble to whatever's underneath (the player's own
            // Esc-to-close/dock map, the feed's own keydown handler).
            event.stopPropagation()
            if (event.key === 'Escape') pending.onDecide(false)
          }}
        >
          <p>{t('app.writeScopeDialog.body')}</p>
          <div className="write-scope-dialog-actions">
            <button onClick={() => pending.onDecide(false)}>{t('app.writeScopeDialog.cancel')}</button>
            <button className="primary" onClick={() => pending.onDecide(true)}>
              {t('app.writeScopeDialog.continue')}
            </button>
          </div>
        </div>
      </div>
    ) : null

  return { run, dialog }
}
