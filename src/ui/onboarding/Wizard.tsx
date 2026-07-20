import { useCallback, useState } from 'react'
import type { WizardStateDto } from '../../ipc/contract'
import { STEP_ASSETS, type WizardStepId } from './assets'
import { AVAILABLE_LOCALES, t } from '../i18n'

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

// A function, not a module-level array — must re-resolve against whichever
// language is active *right now*, not whatever `t()` returned once at
// import time (D-054; same reasoning as Sidebar.tsx's viewLabel).
function getConsoleSteps(): StepDefinition[] {
  return [
    {
      id: 'project',
      label: '1',
      title: t('wizard.step.project.title'),
      why: t('wizard.step.project.why'),
      url: {
        label: t('wizard.step.project.urlLabel'),
        href: 'https://console.cloud.google.com/projectcreate'
      },
      copy: { label: t('wizard.step.project.copyLabel'), value: 'chronicle-player' },
      confirmLabel: t('wizard.step.project.confirmLabel'),
      variations: t('wizard.step.project.variations')
    },
    {
      id: 'enable-api',
      label: '2',
      title: t('wizard.step.enableApi.title'),
      why: t('wizard.step.enableApi.why'),
      url: {
        label: t('wizard.step.enableApi.urlLabel'),
        href: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com'
      },
      confirmLabel: t('wizard.step.enableApi.confirmLabel'),
      variations: t('wizard.step.enableApi.variations')
    },
    {
      id: 'consent',
      label: '3',
      title: t('wizard.step.consent.title'),
      why: t('wizard.step.consent.why'),
      url: {
        label: t('wizard.step.consent.urlLabel'),
        href: 'https://console.cloud.google.com/apis/credentials/consent'
      },
      copy: { label: t('wizard.step.consent.copyLabel'), value: 'Chronicle' },
      confirmLabel: t('wizard.step.consent.confirmLabel'),
      variations: t('wizard.step.consent.variations')
    },
    {
      id: 'test-user',
      label: '4',
      title: t('wizard.step.testUser.title'),
      why: t('wizard.step.testUser.why'),
      url: {
        label: t('wizard.step.testUser.urlLabel'),
        href: 'https://console.cloud.google.com/apis/credentials/consent'
      },
      confirmLabel: t('wizard.step.testUser.confirmLabel'),
      variations: t('wizard.step.testUser.variations')
    },
    {
      id: 'publish',
      label: '4b',
      title: t('wizard.step.publish.title'),
      why: t('wizard.step.publish.why'),
      url: {
        label: t('wizard.step.publish.urlLabel'),
        href: 'https://console.cloud.google.com/apis/credentials/consent'
      },
      variations: t('wizard.step.publish.variations')
    },
    {
      id: 'client',
      label: '5',
      title: t('wizard.step.client.title'),
      why: t('wizard.step.client.why'),
      url: {
        label: t('wizard.step.client.urlLabel'),
        href: 'https://console.cloud.google.com/apis/credentials'
      },
      copy: { label: t('wizard.step.client.copyLabel'), value: 'Chronicle Desktop' },
      confirmLabel: t('wizard.step.client.confirmLabel'),
      variations: t('wizard.step.client.variations')
    }
  ]
}

// No 'first-sync' step: connecting (Step 7) already triggers the first sync
// in the backend, so a second, wizard-owned "start sync and wait" step was
// both redundant and a source of its own bugs — see decisions.md D-044.
export const STEP_SEQUENCE: WizardStepId[] = [
  'welcome',
  'project',
  'enable-api',
  'consent',
  'test-user',
  'publish',
  'client',
  'import',
  'connect'
]

interface WizardProps {
  state: WizardStateDto
  onStateChange: (state: WizardStateDto) => void
  onQuickPath: () => void
  onDone: () => void
  // Present only for Settings re-entry (onboarding.md §Re-entry points).
  onExit?: () => void
  // D-054: the wizard runs before Settings is reachable at all, so it needs
  // its own language switcher rather than relying solely on system
  // detection — same persisted setting (SettingsDto.language), just a
  // second place to change it.
  language: string
  onLanguageChange: (language: string) => void
}

export function Wizard({
  state,
  onStateChange,
  onQuickPath,
  onDone,
  onExit,
  language,
  onLanguageChange
}: WizardProps) {
  const stepId = STEP_SEQUENCE[Math.min(state.step, STEP_SEQUENCE.length - 1)]
  const consoleSteps = getConsoleSteps()

  const update = useCallback(
    (partial: Partial<WizardStateDto>) => onStateChange({ ...state, ...partial }),
    [state, onStateChange]
  )
  const goTo = useCallback(
    (id: WizardStepId) => update({ step: STEP_SEQUENCE.indexOf(id) }),
    [update]
  )
  const next = useCallback(() => update({ step: state.step + 1 }), [state.step, update])
  const back = useCallback(
    () => update({ step: Math.max(0, state.step - 1) }),
    [state.step, update]
  )

  return (
    <div className="wizard">
      {onExit && (
        <button className="wizard-quiet wizard-exit" onClick={onExit}>
          {t('wizard.exitButton')}
        </button>
      )}
      {stepId !== 'welcome' && (
        <div className="wizard-progress">
          {STEP_SEQUENCE.slice(1).map((id) => {
            const label =
              id === 'import'
                ? '6'
                : id === 'connect'
                  ? '7'
                  : consoleSteps.find((s) => s.id === id)?.label
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

      {stepId === 'welcome' && (
        <WelcomeStep
          onStart={next}
          onQuickPath={onQuickPath}
          language={language}
          onLanguageChange={onLanguageChange}
        />
      )}
      {consoleSteps.some((s) => s.id === stepId) && (
        <ConsoleStep
          definition={consoleSteps.find((s) => s.id === stepId) as StepDefinition}
          state={state}
          update={update}
          next={next}
          back={back}
        />
      )}
      {stepId === 'import' && <ImportStep next={next} back={back} goTo={goTo} />}
      {stepId === 'connect' && <ConnectStep onDone={onDone} back={back} goTo={goTo} />}
    </div>
  )
}

function Screenshot({ stepId }: { stepId: WizardStepId }) {
  const asset = STEP_ASSETS[stepId]
  if (!asset) {
    return (
      <div className="wizard-shot placeholder">
        <span>{t('wizard.screenshot.placeholder')}</span>
      </div>
    )
  }
  return (
    <figure className="wizard-shot">
      <img src={asset.src} alt={asset.alt} />
      <figcaption>{t('wizard.screenshot.verifiedOn', { date: asset.verifiedOn })}</figcaption>
    </figure>
  )
}

function WelcomeStep({
  onStart,
  onQuickPath,
  language,
  onLanguageChange
}: {
  onStart: () => void
  onQuickPath: () => void
  language: string
  onLanguageChange: (language: string) => void
}) {
  return (
    <div className="wizard-step welcome">
      <label className="wizard-language">
        <span>{t('settings.language.label')}</span>
        <select value={language} onChange={(event) => onLanguageChange(event.target.value)}>
          <option value="system">{t('settings.language.system')}</option>
          {AVAILABLE_LOCALES.map((locale) => (
            <option key={locale.code} value={locale.code}>
              {locale.nativeName}
            </option>
          ))}
        </select>
      </label>
      <h1>{t('wizard.welcome.heading')}</h1>
      <p>
        {t('wizard.welcome.intro.pre')} <strong>{t('wizard.welcome.intro.strong')}</strong>
        {t('wizard.welcome.intro.post')}
      </p>
      <ul>
        <li>{t('wizard.welcome.bullet.quota')}</li>
        <li>{t('wizard.welcome.bullet.noThirdParty')}</li>
        <li>{t('wizard.welcome.bullet.revocable')}</li>
      </ul>
      <p className="wizard-dim">{t('wizard.welcome.dim')}</p>
      <div className="wizard-nav">
        <button className="primary" onClick={onStart}>
          {t('wizard.welcome.startButton')}
        </button>
        <button className="wizard-quiet" onClick={onQuickPath}>
          {t('wizard.welcome.quickPathButton')}
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
          <h1>{t('wizard.step.heading', { label: definition.label, title: definition.title })}</h1>
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
              <label htmlFor="wizard-email">{t('wizard.step.testUser.emailLabel')}</label>
              <input
                id="wizard-email"
                className="filter"
                placeholder={t('wizard.step.testUser.emailPlaceholder')}
                value={state.email}
                onChange={(event) => update({ email: event.target.value })}
              />
              {state.email.length > 3 && (
                <CopyRow label={t('wizard.step.testUser.copyEmailLabel')} value={state.email} />
              )}
              <p className="wizard-dim">{t('wizard.step.testUser.emailNote')}</p>
            </div>
          )}

          {definition.variations && (
            <details className="wizard-variations">
              <summary>{t('wizard.step.variationsSummary')}</summary>
              <p>{definition.variations}</p>
            </details>
          )}

          {definition.confirmLabel && (
            <label className="wizard-confirm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) =>
                  update({
                    confirmed: { ...state.confirmed, [definition.id]: event.target.checked }
                  })
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
          {t('wizard.nav.back')}
        </button>
        {isPublishStep ? (
          <>
            <button
              className="primary"
              onClick={() => update({ published: 'yes', step: state.step + 1 })}
            >
              {t('wizard.step.publish.publishedButton')}
            </button>
            <button
              className="wizard-quiet"
              onClick={() => update({ published: 'skipped', step: state.step + 1 })}
            >
              {t('wizard.step.publish.skipButton')}
            </button>
          </>
        ) : (
          <button className="primary" disabled={!confirmed} onClick={next}>
            {t('wizard.nav.next')}
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
        {copied ? t('wizard.copyRow.copied') : t('wizard.copyRow.copy')}
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
      <h1>{t('wizard.import.heading')}</h1>
      <p className="wizard-why">
        {t('wizard.import.why.part1')} <code>client_secret_… .json</code>{' '}
        {t('wizard.import.why.part2')}
      </p>

      <FileDrop onFile={(file) => void importFile(file)} />

      {error !== null && (
        <div className="wizard-error">
          <p>{error}</p>
          {wrongType && (
            <button className="wizard-quiet" onClick={() => goTo('client')}>
              {t('wizard.import.backToClientStep')}
            </button>
          )}
        </div>
      )}

      {status === 'ok' && (
        <div className="wizard-ok">
          <p>{t('wizard.import.okMessage')}</p>
          <p className="wizard-dim">{t('wizard.import.okNote')}</p>
          {!secure && <p className="storage-warning">{t('wizard.import.storageWarning')}</p>}
        </div>
      )}

      <div className="wizard-nav">
        <button className="wizard-quiet" onClick={back}>
          {t('wizard.nav.back')}
        </button>
        <button className="primary" disabled={status !== 'ok'} onClick={next}>
          {t('wizard.nav.next')}
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
      {t('wizard.import.drop.part1')} <code>client_secret.json</code>{' '}
      {t('wizard.import.drop.part2')}
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
  onDone,
  back,
  goTo
}: {
  onDone: () => void
  back: () => void
  goTo: (id: WizardStepId) => void
}) {
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'connected'>('idle')
  const [identity, setIdentity] = useState<string | null>(null)
  const [failure, setFailure] = useState<{ message: string; route: WizardStepId | null } | null>(
    null
  )

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
      setFailure({ message: t('wizard.connect.apiNotEnabledError'), route: 'enable-api' })
    } else {
      setIdentity(null)
      setPhase('connected') // token works; identity display is best-effort
    }
  }

  return (
    <div className="wizard-step">
      <h1>{t('wizard.connect.heading')}</h1>
      <p className="wizard-why">{t('wizard.connect.why')}</p>

      <div className="wizard-variations open">
        <strong>{t('wizard.connect.warningTitle')}</strong>
        <p>
          {t('wizard.connect.warning.part1')} <em>{t('wizard.connect.warning.quote')}</em>
          {t('wizard.connect.warning.part2')} <em>{t('wizard.connect.warning.you')}</em>
          {t('wizard.connect.warning.part3')}{' '}
          <strong>{t('wizard.connect.warning.advanced')}</strong> →{' '}
          <strong>{t('wizard.connect.warning.goUnsafe')}</strong>
          {t('wizard.connect.warning.part4')}
        </p>
      </div>

      {phase !== 'connected' && (
        <button className="primary" disabled={phase === 'waiting'} onClick={() => void connect()}>
          {phase === 'waiting' ? t('wizard.connect.buttonWaiting') : t('wizard.connect.button')}
        </button>
      )}

      {failure !== null && (
        <div className="wizard-error">
          <p>{failure.message}</p>
          {failure.route === 'test-user' && (
            <p className="wizard-dim">{t('wizard.connect.testUserHint')}</p>
          )}
          {failure.route !== null && (
            <button className="wizard-quiet" onClick={() => goTo(failure.route as WizardStepId)}>
              {t('wizard.connect.fixItButton', {
                step: failure.route === 'enable-api' ? '2' : '4'
              })}
            </button>
          )}
        </div>
      )}

      {phase === 'connected' && (
        <div className="wizard-ok">
          <p>
            {identity !== null
              ? t('wizard.connect.connectedAs', { name: identity })
              : t('wizard.connect.connectedPlain')}
          </p>
          <p className="wizard-dim">{t('wizard.connect.closingNote')}</p>
        </div>
      )}

      <div className="wizard-nav">
        <button className="wizard-quiet" onClick={back}>
          {t('wizard.nav.back')}
        </button>
        <button className="primary" disabled={phase !== 'connected'} onClick={onDone}>
          {t('wizard.connect.openChronicleButton')}
        </button>
      </div>
    </div>
  )
}
