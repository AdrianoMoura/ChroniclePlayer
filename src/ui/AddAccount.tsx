import { useEffect, useState } from 'react'
import { t } from './i18n'

// B-003: adding an additional account skips the Google-console walkthrough
// entirely — the OAuth client is already set up and shared across accounts
// (D-030/D-032's "just add yourself as a Test user" model). Distinct from
// the full first-run Wizard, which only the very first account ever needs.

const TEST_USERS_URL = 'https://console.cloud.google.com/apis/credentials/consent'

interface AddAccountProps {
  onConnected: () => void
  onCancel: () => void
}

export function AddAccount({ onConnected, onCancel }: AddAccountProps) {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // B-043: matches every other overlay (Help, URL prompt) — Esc closes it,
  // not just the backdrop click.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

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
      <div className="overlay add-account" onClick={(event) => event.stopPropagation()}>
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
