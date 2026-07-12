import { useRef, useState } from 'react'
import { PLAYBACK_RATES, type AuthStatusDto, type SettingsDto } from '../ipc/contract'

// Settings surface (M5). One column, five quiet sections — every control
// maps to a spec decision: D-016 interval, theme (ui.md), D-018 view
// counts, D-038 default speed (playback.md), D-013 storage honesty,
// export/delete (local-data.md). Layout and item size (D-022, D-037) live
// inline in the feed topbar instead — see App.tsx — not here.

interface SettingsViewProps {
  auth: AuthStatusDto | null
  settings: SettingsDto
  onSettingsChange: (settings: SettingsDto) => void
  onReconnect: () => void
  onReplaceKey: () => void
  onFixWeeklyLogout: () => void
  onSignOut: () => void
  onBanner: (text: string) => void
}

export function SettingsView({
  auth,
  settings,
  onSettingsChange,
  onReconnect,
  onReplaceKey,
  onFixWeeklyLogout,
  onSignOut,
  onBanner
}: SettingsViewProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const confirmTimer = useRef<number | null>(null)

  const set = <K extends keyof SettingsDto>(key: K, value: SettingsDto[K]): void =>
    onSettingsChange({ ...settings, [key]: value })

  async function exportData(): Promise<void> {
    const result = await window.chronicle.exportData()
    if (result.ok) {
      onBanner(
        `Exported ${result.value.videos} videos and ${result.value.states} states to ${result.value.path}`
      )
    } else if (result.errorKind !== 'canceled') {
      onBanner(`Export failed: ${result.message}`)
    }
  }

  function deleteAll(): void {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      confirmTimer.current = window.setTimeout(() => setConfirmingDelete(false), 6000)
      return
    }
    if (confirmTimer.current !== null) window.clearTimeout(confirmTimer.current)
    void window.chronicle.deleteAllData() // relaunches into first-run
  }

  return (
    <div className="settings-view">
      <section>
        <h2>Connection</h2>
        <p className="settings-line">
          {auth?.state === 'connected'
            ? 'Connected to your Google account.'
            : auth?.state === 'disconnected'
              ? 'API key imported, but not connected.'
              : 'No API key imported yet.'}
        </p>
        <p className="settings-line dim">
          Granted scope: <strong>YouTube read-only</strong> — used solely to list your
          subscriptions and fetch video metadata. Chronicle never writes to your YouTube
          account (local states stay local).{' '}
          <a
            href="https://myaccount.google.com/permissions"
            onClick={(event) => {
              event.preventDefault()
              void window.chronicle.openExternalUrl('https://myaccount.google.com/permissions')
            }}
          >
            Revoke anytime ↗
          </a>
        </p>
        <p className="settings-line dim">
          {auth?.secureStorage
            ? 'Your key and token are stored in your system keychain.'
            : 'No OS keychain detected: your token is stored with reversible local encryption — anyone with access to your user account can read it (D-013 fallback).'}
        </p>
        <p className="settings-line dim">
          The embedded player uses its own browser session, separate from this connection —
          if you use YouTube Premium, sign in once inside the player for ad-free playback.
        </p>
        <div className="settings-actions">
          <button className="primary" onClick={onReconnect}>
            Reconnect Google account
          </button>
          <button className="primary" onClick={onReplaceKey}>
            Replace API key
          </button>
          <button className="primary" onClick={onFixWeeklyLogout}>
            Fix weekly logout
          </button>
          <button className="primary" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </section>

      <section>
        <h2>Sync</h2>
        <label className="settings-row">
          <span>Background refresh</span>
          <select
            value={settings.refreshMinutes}
            onChange={(event) => set('refreshMinutes', Number(event.target.value))}
          >
            <option value={15}>Every 15 minutes</option>
            <option value={30}>Every 30 minutes</option>
            <option value={60}>Every hour</option>
            <option value={0}>Manual only</option>
          </select>
        </label>
        <p className="settings-line dim">
          Every refresh also re-checks your subscription list, so a new subscription shows
          up on the very next sync — nothing to do here.
        </p>
      </section>

      <section>
        <h2>Playback</h2>
        <label className="settings-row">
          <span>Default speed</span>
          <select
            value={settings.defaultPlaybackRate}
            onChange={(event) => set('defaultPlaybackRate', Number(event.target.value))}
          >
            {PLAYBACK_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate === 1 ? 'Normal' : `${rate}×`}
              </option>
            ))}
          </select>
        </label>
        <p className="settings-line dim">
          The player opens already set to this speed. You can still change it per video
          from the embed's own controls — that never changes this default.
        </p>
      </section>

      <section>
        <h2>Appearance</h2>
        <label className="settings-row">
          <span>Theme</span>
          <select
            value={settings.theme}
            onChange={(event) => set('theme', event.target.value as SettingsDto['theme'])}
          >
            <option value="system">Follow system</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label className="settings-row">
          <span>Show view counts</span>
          <input
            type="checkbox"
            checked={settings.showViewCounts}
            onChange={(event) => set('showViewCounts', event.target.checked)}
          />
        </label>
        <label className="settings-row">
          <span>Show Shorts</span>
          <input
            type="checkbox"
            checked={settings.showShorts}
            onChange={(event) => set('showShorts', event.target.checked)}
          />
        </label>
      </section>

      <section>
        <h2>Data</h2>
        <p className="settings-line dim">
          Everything Chronicle knows lives on this computer. The export is a single
          documented JSON file (see FORMAT.md in the repository) — you can leave with
          everything, anytime. The SQLite file itself is also a legitimate backup.
        </p>
        <div className="settings-actions">
          <button className="primary" onClick={() => void exportData()}>
            Export data…
          </button>
          <button className={`primary${confirmingDelete ? ' danger' : ''}`} onClick={deleteAll}>
            {confirmingDelete
              ? 'Click again to wipe the database and your key'
              : 'Delete all local data'}
          </button>
        </div>
      </section>
    </div>
  )
}
