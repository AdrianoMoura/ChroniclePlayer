import { useRef, useState } from 'react'
import type { AuthStatusDto } from '../ipc/contract'
import { t } from './i18n'

interface ConnectPanelProps {
  auth: AuthStatusDto
  connecting: boolean
  onImportSecret: (json: string) => void
  onConnect: () => void
}

// Wizard-less M2 connect surface (the real 8-step wizard is M4). Teaches the
// own-credentials model (D-001) and walks the two local steps: import
// client_secret.json, then authorize in the browser. Full instructions live
// in docs/setup.md until the wizard exists.
export function ConnectPanel({ auth, connecting, onImportSecret, onConnect }: ConnectPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [readError, setReadError] = useState<string | null>(null)

  async function readFile(file: File): Promise<void> {
    try {
      onImportSecret(await file.text())
      setReadError(null)
    } catch {
      setReadError(t('connect.readError'))
    }
  }

  return (
    <div className="connect-panel">
      <h1>{t('connect.title')}</h1>
      <p>
        {t('connect.intro.part1')} <code>docs/setup.md</code> {t('connect.intro.part2')}{' '}
        <code>client_secret.json</code>
        {t('connect.intro.part3')}
      </p>

      <ol className="connect-steps">
        <li className={auth.state !== 'unconfigured' ? 'done' : ''}>
          <span className="step-title">{t('connect.step1.title')}</span>
          <span className="step-detail">
            {auth.state !== 'unconfigured'
              ? t('connect.step1.detailDone')
              : t('connect.step1.detailPending')}
          </span>
          <button className="primary" onClick={() => fileInput.current?.click()}>
            {auth.state !== 'unconfigured' ? t('connect.step1.buttonDone') : t('connect.step1.button')}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void readFile(file)
              event.target.value = ''
            }}
          />
          {readError !== null && <span className="step-error">{readError}</span>}
        </li>
        <li>
          <span className="step-title">{t('connect.step2.title')}</span>
          <span className="step-detail">{t('connect.step2.detail')}</span>
          <button
            className="primary"
            disabled={auth.state === 'unconfigured' || connecting}
            onClick={onConnect}
          >
            {connecting ? t('connect.step2.buttonConnecting') : t('connect.step2.button')}
          </button>
        </li>
      </ol>

      {!auth.secureStorage && <p className="storage-warning">{t('connect.storageWarning')}</p>}
    </div>
  )
}
