import { useRef, useState } from 'react'
import type { AuthStatusDto } from '../ipc/contract'

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
      setReadError('Could not read the file.')
    }
  }

  return (
    <div className="connect-panel">
      <h1>Connect Chronicle to your YouTube account</h1>
      <p>
        Chronicle ships with no credentials: you bring your own Google Cloud project, so
        your data and API quota belong to you alone. The one-time setup takes about ten
        minutes — see <code>docs/setup.md</code> in the repository for the step-by-step
        guide to creating the project and downloading your <code>client_secret.json</code>.
      </p>

      <ol className="connect-steps">
        <li className={auth.state !== 'unconfigured' ? 'done' : ''}>
          <span className="step-title">Import your OAuth client</span>
          <span className="step-detail">
            {auth.state !== 'unconfigured'
              ? 'client_secret.json imported.'
              : 'Select the client_secret.json you downloaded from your Google Cloud console (Desktop app type).'}
          </span>
          <button className="primary" onClick={() => fileInput.current?.click()}>
            {auth.state !== 'unconfigured' ? 'Replace file…' : 'Select client_secret.json…'}
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
          <span className="step-title">Authorize in your browser</span>
          <span className="step-detail">
            Your default browser opens Google’s consent screen; Chronicle listens locally
            (127.0.0.1) for the answer. Tokens never leave this machine.
          </span>
          <button
            className="primary"
            disabled={auth.state === 'unconfigured' || connecting}
            onClick={onConnect}
          >
            {connecting ? 'Waiting for the browser…' : 'Connect Google'}
          </button>
        </li>
      </ol>

      {!auth.secureStorage && (
        <p className="storage-warning">
          Heads-up: no OS keychain was detected, so your token will be stored with
          reversible local encryption — anyone with access to your user account could
          read it. (D-013 fallback.)
        </p>
      )}
    </div>
  )
}
