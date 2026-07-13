import { useRef, useState } from 'react'
import { PLAYBACK_RATES, type AuthStatusDto, type SettingsDto } from '../ipc/contract'
import { t } from './i18n'

// Settings surface (M5). One column, five quiet sections — every control
// maps to a spec decision: D-016 interval, theme (ui.md), D-018 view
// counts, D-038 default speed (playback.md), D-013 storage honesty,
// export/delete (local-data.md). Layout and item size (D-022, D-037) live
// inline in the feed topbar instead — see App.tsx — not here.

interface SettingsViewProps {
  auth: AuthStatusDto | null
  settings: SettingsDto
  appVersion: string
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
  appVersion,
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
        t('settings.data.exportedBanner', {
          videos: result.value.videos,
          states: result.value.states,
          path: result.value.path
        })
      )
    } else if (result.errorKind !== 'canceled') {
      onBanner(t('settings.data.exportFailedBanner', { message: result.message }))
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
        <h2>{t('settings.connection.heading')}</h2>
        <p className="settings-line">
          {auth?.state === 'connected'
            ? t('settings.connection.stateConnected')
            : auth?.state === 'disconnected'
              ? t('settings.connection.stateDisconnected')
              : t('settings.connection.stateUnconfigured')}
        </p>
        <p className="settings-line dim">
          {t('settings.connection.scopeGrantedPrefix')}{' '}
          <strong>
            {t(
              auth?.writeScopeGranted
                ? 'settings.connection.scopeName.readonlyPlusWrite'
                : 'settings.connection.scopeName.readonly'
            )}
          </strong>{' '}
          {t(
            auth?.writeScopeGranted
              ? 'settings.connection.scopeGrantedSuffix.readonlyPlusWrite'
              : 'settings.connection.scopeGrantedSuffix.readonly'
          )}{' '}
          <a
            href="https://myaccount.google.com/permissions"
            onClick={(event) => {
              event.preventDefault()
              void window.chronicle.openExternalUrl('https://myaccount.google.com/permissions')
            }}
          >
            {t('settings.connection.revokeLink')}
          </a>
        </p>
        <p className="settings-line dim">
          {auth?.secureStorage
            ? t('settings.connection.keychainOk')
            : t('settings.connection.keychainFallback')}
        </p>
        <p className="settings-line dim">{t('settings.connection.playerSessionNote')}</p>
        <div className="settings-actions">
          <button className="primary" onClick={onReconnect}>
            {t('settings.connection.reconnectButton')}
          </button>
          <button className="primary" onClick={onReplaceKey}>
            {t('settings.connection.replaceKeyButton')}
          </button>
          <button className="primary" onClick={onFixWeeklyLogout}>
            {t('settings.connection.fixWeeklyLogoutButton')}
          </button>
          <button className="primary" onClick={onSignOut}>
            {t('settings.connection.signOutButton')}
          </button>
        </div>
      </section>

      <section>
        <h2>{t('settings.sync.heading')}</h2>
        <label className="settings-row">
          <span>{t('settings.sync.backgroundRefresh')}</span>
          <select
            value={settings.refreshMinutes}
            onChange={(event) => set('refreshMinutes', Number(event.target.value))}
          >
            <option value={15}>{t('settings.sync.every15')}</option>
            <option value={30}>{t('settings.sync.every30')}</option>
            <option value={60}>{t('settings.sync.everyHour')}</option>
            <option value={0}>{t('settings.sync.manualOnly')}</option>
          </select>
        </label>
        <p className="settings-line dim">{t('settings.sync.note')}</p>
        <label className="settings-row">
          <span>{t('settings.sync.checkForUpdates')}</span>
          <input
            type="checkbox"
            checked={settings.checkForUpdates}
            onChange={(event) => set('checkForUpdates', event.target.checked)}
          />
        </label>
        <p className="settings-line dim">{t('settings.sync.checkForUpdatesNote', { version: appVersion })}</p>
      </section>

      <section>
        <h2>{t('settings.playback.heading')}</h2>
        <label className="settings-row">
          <span>{t('settings.playback.defaultSpeed')}</span>
          <select
            value={settings.defaultPlaybackRate}
            onChange={(event) => set('defaultPlaybackRate', Number(event.target.value))}
          >
            {PLAYBACK_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate === 1 ? t('settings.playback.speedNormal') : `${rate}×`}
              </option>
            ))}
          </select>
        </label>
        <p className="settings-line dim">{t('settings.playback.note')}</p>
      </section>

      <section>
        <h2>{t('settings.appearance.heading')}</h2>
        <label className="settings-row">
          <span>{t('settings.appearance.theme')}</span>
          <select
            value={settings.theme}
            onChange={(event) => set('theme', event.target.value as SettingsDto['theme'])}
          >
            <option value="system">{t('settings.appearance.themeSystem')}</option>
            <option value="dark">{t('settings.appearance.themeDark')}</option>
            <option value="light">{t('settings.appearance.themeLight')}</option>
          </select>
        </label>
        <label className="settings-row">
          <span>{t('settings.appearance.showViewCounts')}</span>
          <input
            type="checkbox"
            checked={settings.showViewCounts}
            onChange={(event) => set('showViewCounts', event.target.checked)}
          />
        </label>
        <label className="settings-row">
          <span>{t('settings.appearance.showShorts')}</span>
          <input
            type="checkbox"
            checked={settings.showShorts}
            onChange={(event) => set('showShorts', event.target.checked)}
          />
        </label>
      </section>

      <section>
        <h2>{t('settings.data.heading')}</h2>
        <p className="settings-line dim">{t('settings.data.note')}</p>
        <div className="settings-actions">
          <button className="primary" onClick={() => void exportData()}>
            {t('settings.data.exportButton')}
          </button>
          <button className={`primary${confirmingDelete ? ' danger' : ''}`} onClick={deleteAll}>
            {confirmingDelete
              ? t('settings.data.deleteConfirmButton')
              : t('settings.data.deleteButton')}
          </button>
        </div>
      </section>
    </div>
  )
}
