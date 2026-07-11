import { useCallback, useEffect, useState } from 'react'
import type { ChronicleEventDto, WizardStateDto } from '../../ipc/contract'
import { STEP_ASSETS, type WizardStepId } from './assets'

// The onboarding wizard (onboarding.md) — a flagship feature: every step
// explains WHY, opens the exact Google page, copies any value the user must
// paste, and validates where technically possible (D-014: checkboxes for
// console steps 1–5, real validation at 6–7 with failure→step mapping).

interface StepDefinition {
  id: WizardStepId
  label: string // "1"…"8", "4b"
  title: string
  why: string
  url?: { label: string; href: string }
  copy?: { label: string; value: string }
  confirmLabel?: string
  variations?: string
}

const CONSOLE_STEPS: StepDefinition[] = [
  {
    id: 'project',
    label: '1',
    title: 'Create a Google Cloud project',
    why: 'Google groups API access into “projects”. You need one to hold your own key — it is free, and no billing account is required for the YouTube API’s default quota.',
    url: { label: 'Open the project creation page', href: 'https://console.cloud.google.com/projectcreate' },
    copy: { label: 'Suggested project name', value: 'chronicle-player' },
    confirmLabel: 'I created the project.',
    variations:
      'If Google asks for an organization, choose “No organization”. If you already have projects, the page may open a picker first — use “New project”.'
  },
  {
    id: 'enable-api',
    label: '2',
    title: 'Enable the YouTube Data API v3',
    why: 'Projects start with every API disabled; you are turning on just the one Chronicle needs — read-only YouTube data.',
    url: {
      label: 'Open the YouTube Data API page',
      href: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com'
    },
    confirmLabel: 'I clicked Enable.',
    variations:
      'Make sure your new project is selected in the blue top bar before clicking Enable. If the button reads “Manage”, the API is already enabled — you are done here.'
  },
  {
    id: 'consent',
    label: '3',
    title: 'Configure the OAuth consent screen',
    why: 'This is the permission screen you will see when connecting. Because it is your own project, you are both the developer and the only user.',
    url: {
      label: 'Open the consent screen settings',
      href: 'https://console.cloud.google.com/apis/credentials/consent'
    },
    copy: { label: 'Suggested app name', value: 'Chronicle' },
    confirmLabel: 'I configured the consent screen (External, my email in both contact fields).',
    variations:
      'User type: External (Internal only exists for Workspace organizations). No logo and no scopes need to be added — Chronicle requests its read-only scope at connect time. Skip every optional section. Google occasionally renames this page “Audience” / “Branding” inside “Google Auth Platform”.'
  },
  {
    id: 'test-user',
    label: '4',
    title: 'Add yourself as a Test user',
    why: 'While the project is in “Testing” mode, only listed test users can sign in — that is you.',
    url: {
      label: 'Open the consent screen (Test users section)',
      href: 'https://console.cloud.google.com/apis/credentials/consent'
    },
    confirmLabel: 'I added my email as a Test user.',
    variations:
      'In the newer “Google Auth Platform” layout the list lives under Audience → Test users. Use exactly the Google account you will connect with.'
  },
  {
    id: 'publish',
    label: '4b',
    title: 'Publish the app (recommended)',
    why: 'In Testing mode, Google expires your connection every 7 days. Clicking “Publish app” makes your token permanent. You may see an “unverified app” warning when connecting — that is expected: the “unverified developer” is you.',
    url: {
      label: 'Open the consent screen (Publish app)',
      href: 'https://console.cloud.google.com/apis/credentials/consent'
    },
    variations:
      'Publishing with only the read-only YouTube scope does not require Google’s verification review. If you skip this, Chronicle will detect the weekly expiry and offer a two-click reconnect — plus a link back to this step.'
  },
  {
    id: 'client',
    label: '5',
    title: 'Create a Desktop OAuth client',
    why: 'This creates the actual key file Chronicle will use — it identifies your Chronicle install to your project.',
    url: { label: 'Open the credentials page', href: 'https://console.cloud.google.com/apis/credentials' },
    copy: { label: 'Suggested client name', value: 'Chronicle Desktop' },
    confirmLabel: 'I created the Desktop client and downloaded the JSON file.',
    variations:
      'Create credentials → OAuth client ID → Application type must be “Desktop app” (not “Web application”). The download is usually named client_secret_… .json and lands in your Downloads folder.'
  }
]

export const STEP_SEQUENCE: WizardStepId[] = [
  'welcome',
  'project',
  'enable-api',
  'consent',
  'test-user',
  'publish',
  'client',
  'import',
  'connect',
  'first-sync'
]

interface WizardProps {
  state: WizardStateDto
  onStateChange: (state: WizardStateDto) => void
  onQuickPath: () => void
  onDone: () => void
  // Present only for Settings re-entry (onboarding.md §Re-entry points).
  onExit?: () => void
}

export function Wizard({ state, onStateChange, onQuickPath, onDone, onExit }: WizardProps) {
  const stepId = STEP_SEQUENCE[Math.min(state.step, STEP_SEQUENCE.length - 1)]

  const update = useCallback(
    (partial: Partial<WizardStateDto>) => onStateChange({ ...state, ...partial }),
    [state, onStateChange]
  )
  const goTo = useCallback(
    (id: WizardStepId) => update({ step: STEP_SEQUENCE.indexOf(id) }),
    [update]
  )
  const next = useCallback(() => update({ step: state.step + 1 }), [state.step, update])
  const back = useCallback(() => update({ step: Math.max(0, state.step - 1) }), [state.step, update])

  return (
    <div className="wizard">
      {onExit && (
        <button className="wizard-quiet wizard-exit" onClick={onExit}>
          ✕ Close
        </button>
      )}
      {stepId !== 'welcome' && (
        <div className="wizard-progress">
          {STEP_SEQUENCE.slice(1).map((id) => {
            const label = id === 'import' ? '6' : id === 'connect' ? '7' : id === 'first-sync' ? '8' : CONSOLE_STEPS.find((s) => s.id === id)?.label
            const index = STEP_SEQUENCE.indexOf(id)
            return (
              <span
                key={id}
                className={`wizard-dot${index === state.step ? ' current' : index < state.step ? ' done' : ''}`}
              >
                {label}
              </span>
            )
          })}
        </div>
      )}

      {stepId === 'welcome' && <WelcomeStep onStart={next} onQuickPath={onQuickPath} />}
      {CONSOLE_STEPS.some((s) => s.id === stepId) && (
        <ConsoleStep
          definition={CONSOLE_STEPS.find((s) => s.id === stepId) as StepDefinition}
          state={state}
          update={update}
          next={next}
          back={back}
        />
      )}
      {stepId === 'import' && <ImportStep next={next} back={back} goTo={goTo} />}
      {stepId === 'connect' && <ConnectStep next={next} back={back} goTo={goTo} />}
      {stepId === 'first-sync' && <FirstSyncStep onDone={onDone} />}
    </div>
  )
}

function Screenshot({ stepId }: { stepId: WizardStepId }) {
  const asset = STEP_ASSETS[stepId]
  if (!asset) {
    return (
      <div className="wizard-shot placeholder">
        <span>Screenshot pending capture — the text on the left is the full guidance.</span>
      </div>
    )
  }
  return (
    <figure className="wizard-shot">
      <img src={asset.src} alt={asset.alt} />
      <figcaption>verified on {asset.verifiedOn}</figcaption>
    </figure>
  )
}

function WelcomeStep({ onStart, onQuickPath }: { onStart: () => void; onQuickPath: () => void }) {
  return (
    <div className="wizard-step welcome">
      <h1>Chronicle doesn’t have a server or an API key. You’ll create your own.</h1>
      <p>
        It is free, takes about <strong>10 minutes, one time only</strong>, and it means
        your data and your access belong to you alone:
      </p>
      <ul>
        <li>Your own API quota — shared with nobody.</li>
        <li>No third party in the loop — Chronicle’s developers never touch your account.</li>
        <li>Revocable by you, anytime, in your own Google console.</li>
      </ul>
      <p className="wizard-dim">You’ll need a Google account. No billing account is required.</p>
      <div className="wizard-nav">
        <button className="primary" onClick={onStart}>
          Let’s set it up
        </button>
        <button className="wizard-quiet" onClick={onQuickPath}>
          I’ve done this before — just import my key
        </button>
      </div>
    </div>
  )
}

function ConsoleStep({
  definition,
  state,
  update,
  next,
  back
}: {
  definition: StepDefinition
  state: WizardStateDto
  update: (partial: Partial<WizardStateDto>) => void
  next: () => void
  back: () => void
}) {
  const confirmed = state.confirmed[definition.id] === true
  const isPublishStep = definition.id === 'publish'
  const isTestUserStep = definition.id === 'test-user'

  return (
    <div className="wizard-step">
      <div className="wizard-columns">
        <div className="wizard-text">
          <h1>
            Step {definition.label} — {definition.title}
          </h1>
          <p className="wizard-why">{definition.why}</p>

          {definition.url && (
            <button
              className="primary"
              onClick={() => void window.chronicle.openExternalUrl(definition.url!.href)}
            >
              {definition.url.label} ↗
            </button>
          )}

          {definition.copy && (
            <CopyRow label={definition.copy.label} value={definition.copy.value} />
          )}

          {isTestUserStep && (
            <div className="wizard-email">
              <label htmlFor="wizard-email">Which Google account will you use?</label>
              <input
                id="wizard-email"
                className="filter"
                placeholder="you@gmail.com"
                value={state.email}
                onChange={(event) => update({ email: event.target.value })}
              />
              {state.email.length > 3 && <CopyRow label="Copy it for the Test users list" value={state.email} />}
              <p className="wizard-dim">Stored only on this machine, only for this wizard.</p>
            </div>
          )}

          {definition.variations && (
            <details className="wizard-variations">
              <summary>Something looks different?</summary>
              <p>{definition.variations}</p>
            </details>
          )}

          {definition.confirmLabel && (
            <label className="wizard-confirm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) =>
                  update({ confirmed: { ...state.confirmed, [definition.id]: event.target.checked } })
                }
              />
              {definition.confirmLabel}
            </label>
          )}
        </div>
        <Screenshot stepId={definition.id} />
      </div>

      <div className="wizard-nav">
        <button className="wizard-quiet" onClick={back}>
          ← Back
        </button>
        {isPublishStep ? (
          <>
            <button className="primary" onClick={() => update({ published: 'yes', step: state.step + 1 })}>
              I published it
            </button>
            <button
              className="wizard-quiet"
              onClick={() => update({ published: 'skipped', step: state.step + 1 })}
            >
              Skip — I accept reconnecting weekly
            </button>
          </>
        ) : (
          <button className="primary" disabled={!confirmed} onClick={next}>
            Next →
          </button>
        )}
      </div>
    </div>
  )
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="wizard-copy">
      <span className="wizard-dim">{label}:</span>
      <code>{value}</code>
      <button
        className="wizard-quiet"
        onClick={() => {
          void navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  )
}

function ImportStep({
  next,
  back,
  goTo
}: {
  next: () => void
  back: () => void
  goTo: (id: WizardStepId) => void
}) {
  const [status, setStatus] = useState<'idle' | 'ok'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [wrongType, setWrongType] = useState(false)
  const [secure, setSecure] = useState(true)

  async function importFile(file: File): Promise<void> {
    const result = await window.chronicle.importClientSecret(await file.text())
    if (result.ok) {
      setStatus('ok')
      setError(null)
      setWrongType(false)
      setSecure(result.value.secureStorage)
    } else {
      setStatus('idle')
      setWrongType(result.message.includes('Desktop app'))
      setError(result.message)
    }
  }

  return (
    <div className="wizard-step">
      <h1>Step 6 — Import your key file</h1>
      <p className="wizard-why">
        Select the <code>client_secret_… .json</code> you downloaded. Chronicle extracts the
        key into your system keychain — it never leaves this machine and never touches a
        server.
      </p>

      <FileDrop onFile={(file) => void importFile(file)} />

      {error !== null && (
        <div className="wizard-error">
          <p>{error}</p>
          {wrongType && (
            <button className="wizard-quiet" onClick={() => goTo('client')}>
              ← Back to Step 5 (create a Desktop client)
            </button>
          )}
        </div>
      )}

      {status === 'ok' && (
        <div className="wizard-ok">
          <p>✓ Key imported — Chronicle stores it in your system keychain, never online.</p>
          <p className="wizard-dim">
            You may delete the downloaded file now if you wish; Chronicle never touches
            your files.
          </p>
          {!secure && (
            <p className="storage-warning">
              No OS keychain was detected, so the key is stored with reversible local
              encryption — anyone with access to your user account could read it.
            </p>
          )}
        </div>
      )}

      <div className="wizard-nav">
        <button className="wizard-quiet" onClick={back}>
          ← Back
        </button>
        <button className="primary" disabled={status !== 'ok'} onClick={next}>
          Next →
        </button>
      </div>
    </div>
  )
}

function FileDrop({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false)
  return (
    <label
      className={`wizard-drop${dragging ? ' dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        const file = event.dataTransfer.files[0]
        if (file) onFile(file)
      }}
    >
      Drop <code>client_secret.json</code> here, or click to pick it
      <input
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
          event.target.value = ''
        }}
      />
    </label>
  )
}

function ConnectStep({
  next,
  back,
  goTo
}: {
  next: () => void
  back: () => void
  goTo: (id: WizardStepId) => void
}) {
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'connected'>('idle')
  const [identity, setIdentity] = useState<string | null>(null)
  const [failure, setFailure] = useState<{ message: string; route: WizardStepId | null } | null>(null)

  async function connect(): Promise<void> {
    setFailure(null)
    setPhase('waiting')
    const result = await window.chronicle.connectGoogle()
    if (!result.ok) {
      setPhase('idle')
      setFailure({
        message: result.message,
        route: result.message.includes('refused') ? 'test-user' : null
      })
      return
    }
    // Validation: one channels.list call proves the token works and the API
    // is enabled; failures map back to the responsible step (D-014).
    const who = await window.chronicle.getConnectedChannel()
    if (who.ok) {
      setIdentity(who.value.title)
      setPhase('connected')
    } else if (who.errorKind === 'api-not-enabled') {
      setPhase('idle')
      setFailure({ message: 'The YouTube Data API is not enabled in your project.', route: 'enable-api' })
    } else {
      setIdentity(null)
      setPhase('connected') // token works; identity display is best-effort
    }
  }

  return (
    <div className="wizard-step">
      <h1>Step 7 — Connect to Google</h1>
      <p className="wizard-why">
        Your browser will open Google’s consent screen. Chronicle listens locally
        (127.0.0.1) for the answer — tokens never leave this machine.
      </p>

      <div className="wizard-variations open">
        <strong>Heads-up: the “unverified app” warning.</strong>
        <p>
          Google may show <em>“Google hasn’t verified this app”</em>. That is expected —
          the unverified developer is <em>you</em>. Click <strong>Advanced</strong> →{' '}
          <strong>Go to Chronicle (unsafe)</strong>. It is safe here because you are
          trusting your own project.
        </p>
      </div>

      {phase !== 'connected' && (
        <button className="primary" disabled={phase === 'waiting'} onClick={() => void connect()}>
          {phase === 'waiting' ? 'Waiting for the browser…' : 'Connect Google'}
        </button>
      )}

      {failure !== null && (
        <div className="wizard-error">
          <p>{failure.message}</p>
          {failure.route === 'test-user' && (
            <p className="wizard-dim">
              If Google blocked the sign-in, the usual cause is a missing Test user (Step
              4) while the project is in Testing mode.
            </p>
          )}
          {failure.route !== null && (
            <button className="wizard-quiet" onClick={() => goTo(failure.route as WizardStepId)}>
              ← Fix it in Step {failure.route === 'enable-api' ? '2' : '4'}
            </button>
          )}
        </div>
      )}

      {phase === 'connected' && (
        <div className="wizard-ok">
          <p>✓ Connected{identity !== null ? ` as ${identity}` : ''}.</p>
        </div>
      )}

      <div className="wizard-nav">
        <button className="wizard-quiet" onClick={back}>
          ← Back
        </button>
        <button className="primary" disabled={phase !== 'connected'} onClick={next}>
          Next →
        </button>
      </div>
    </div>
  )
}

function FirstSyncStep({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [statusLine, setStatusLine] = useState('')
  const [summary, setSummary] = useState<{ channels: number; videos: number } | null>(null)

  useEffect(() => {
    return window.chronicle.onEvent((event: ChronicleEventDto) => {
      if (event.type === 'refresh:progress') {
        setStatusLine(
          event.phase === 'shorts'
            ? `Filtering Shorts — ${event.checked} of ${event.total} checked…`
            : `Checking ${event.checked} of ${event.total} channels…`
        )
      }
      if (event.type === 'refresh:done') {
        setPhase('done')
        setSummary({ channels: event.report.channelsPolled, videos: event.report.videosNew })
      }
    })
  }, [])

  function start(): void {
    setPhase('running')
    setStatusLine('Importing your subscriptions…')
    void window.chronicle.refreshFeed()
  }

  return (
    <div className="wizard-step">
      <h1>Step 8 — First sync</h1>
      <p className="wizard-why">
        Chronicle imports your subscriptions and fetches their recent uploads. The first
        run also filters Shorts, which takes a few minutes on large accounts — a one-time
        cost.
      </p>

      {phase === 'idle' && (
        <button className="primary" onClick={start}>
          Import my subscriptions
        </button>
      )}
      {phase === 'running' && <p className="wizard-dim">{statusLine || 'Working…'}</p>}
      {phase === 'done' && summary !== null && (
        <div className="wizard-ok">
          <p>
            ✓ Found {summary.channels} subscriptions and {summary.videos} recent videos.
          </p>
          <p className="wizard-dim">
            Everything Chronicle knows is stored on this computer. Your key can be revoked
            anytime at myaccount.google.com/permissions.
          </p>
        </div>
      )}

      <div className="wizard-nav">
        <button className="primary" disabled={phase !== 'done'} onClick={onDone}>
          Open my feed →
        </button>
      </div>
    </div>
  )
}
