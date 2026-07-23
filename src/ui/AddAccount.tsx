import { useEffect, useRef, useState } from 'react'
import { t } from './i18n'

// Adding an account skips the Google-console walkthrough — the OAuth client
// is already set up and shared across accounts (D-030/D-032). The full
// first-run Wizard is only for the very first account.

const TEST_USERS_URL = 'https://console.cloud.google.com/apis/credentials/consent'

interface AddAccountProps {
  onConnected: () => void
  onCancel: () => void
}

export function AddAccount({ onConnected, onCancel }: AddAccountProps) {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // No text input here to naturally take focus on open — without this, the
  // dialog's own keydown handler (Escape) would never actually receive it
  // (see AddToPlaylistDialog's own copy of this comment for the full
  // reasoning).
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  function connect(): void {
    setConnecting(true)
    setError(null)
    void window.chronicle.startAddAccount().then(({ accountId }) => {
      void window.chronicle.connectAccount(accountId).then((result) => {
        setConnecting(false)
        if (!result.ok) {
          setError(result.message)
          return
        }
        onConnected()
      })
    })
  }

  return (
    <div className="overlay-backdrop" onClick={onCancel}>
      <div
        ref={containerRef}
        tabIndex={-1}
        className="overlay add-account"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          // A dialog on top of the content owns Escape while it's open —
          // never let it bubble to whatever's underneath (the player's own
          // Esc-to-close/dock map, the feed's own keydown handler).
          event.stopPropagation()
          if (event.key === 'Escape') onCancel()
        }}
      >
        <h2>{t('addAccount.title')}</h2>
        <p>{t('addAccount.instructions')}</p>
        <a
          href={TEST_USERS_URL}
          onClick={(event) => {
            event.preventDefault()
            void window.chronicle.openExternalUrl(TEST_USERS_URL)
          }}
        >
          {t('addAccount.openTestUsersLink')}
        </a>
        {error !== null && <p className="comments-error">{error}</p>}
        <div className="add-account-actions">
          <button className="primary" disabled={connecting} onClick={connect}>
            {connecting ? t('addAccount.connecting') : t('addAccount.connectButton')}
          </button>
          <button onClick={onCancel}>{t('addAccount.cancelButton')}</button>
        </div>
      </div>
    </div>
  )
}
