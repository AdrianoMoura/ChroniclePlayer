import { useEffect, useRef, useState } from 'react'
import { PLAYBACK_RATES, type AuthStatusDto, type SettingsDto, type StorageInfoDto } from '../ipc/contract'
import { formatBytes } from './format'
import { AVAILABLE_LOCALES, t } from './i18n'

// Settings surface. One column, quiet sections — every control maps to a
// spec decision: D-016 interval, theme (ui.md), D-018 view counts, D-038
// default speed (playback.md), D-013 storage honesty, export/delete
// (local-data.md). Layout and item size (D-022, D-037) live inline in the
// feed topbar instead — see App.tsx.

interface SettingsViewProps {
  auth: AuthStatusDto | null
  primaryAccountLabel: string
  settings: SettingsDto
  appVersion: string
  onSettingsChange: (settings: SettingsDto) => void
  onReconnect: () => void
  onReplaceKey: () => void
  onFixWeeklyLogout: () => void
  onSignOut: () => void
  onBanner: (text: string) => void
  // The bulk favorite<->notify sync (below) changes per-channel DB state
  // SettingsView doesn't itself display — the sidebar/channel-header icons
  // that do need to pick up the change.
  onChannelsChanged: () => void
}

export function SettingsView({
  auth,
  primaryAccountLabel,
  settings,
  appVersion,
  onSettingsChange,
  onReconnect,
  onReplaceKey,
  onFixWeeklyLogout,
  onSignOut,
  onBanner,
  onChannelsChanged
}: SettingsViewProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const confirmTimer = useRef<number | null>(null)
  // Turning "auto-enable on favorite" off always takes effect immediately —
  // this only gates the separate question of whether to *also* bulk-clear
  // notify from currently-favorited channels.
  const [confirmingAutoNotifyDisable, setConfirmingAutoNotifyDisable] = useState(false)

  // D-020 exercised: storage indicator + on-demand cleanup.
  const [storageInfo, setStorageInfo] = useState<StorageInfoDto | null>(null)
  const [cleanupMonths, setCleanupMonths] = useState(24)
  const [cleanupPreview, setCleanupPreview] = useState<number | null>(null)
  const [confirmingCleanup, setConfirmingCleanup] = useState(false)
  const cleanupConfirmTimer = useRef<number | null>(null)

  useEffect(() => {
    void window.chronicle.getStorageInfo().then(setStorageInfo)
  }, [])

  useEffect(() => {
    let cancelled = false
    setCleanupPreview(null)
    void window.chronicle.previewPruneOldVideos(cleanupMonths).then((count) => {
      if (!cancelled) setCleanupPreview(count)
    })
    return () => {
      cancelled = true
    }
  }, [cleanupMonths])

  async function cleanUp(): Promise<void> {
    if (!confirmingCleanup) {
      setConfirmingCleanup(true)
      cleanupConfirmTimer.current = window.setTimeout(() => setConfirmingCleanup(false), 6000)
      return
    }
    if (cleanupConfirmTimer.current !== null) window.clearTimeout(cleanupConfirmTimer.current)
    setConfirmingCleanup(false)
    try {
      const removed = await window.chronicle.pruneOldVideos(cleanupMonths)
      onBanner(t('settings.data.cleanupBanner', { count: removed }))
      setCleanupPreview(0)
      void window.chronicle.getStorageInfo().then(setStorageInfo)
    } catch (error) {
      onBanner(t('settings.data.cleanupFailedBanner', { message: String((error as Error).message) }))
    }
  }

  const set = <K extends keyof SettingsDto>(key: K, value: SettingsDto[K]): void =>
    onSettingsChange({ ...settings, [key]: value })

  function setAutoNotifyFavorites(enable: boolean): void {
    set('autoNotifyFavorites', enable)
    if (enable) {
      // Immediate, no confirmation — spec: "notifications should immediately
      // be enabled for all channels that are already marked as Favorites."
      void window.chronicle.bulkSetChannelNotifyForFavorites(true).then(onChannelsChanged)
    } else {
      setConfirmingAutoNotifyDisable(true)
    }
  }

  function resolveAutoNotifyDisableConfirm(clearFavorites: boolean): void {
    setConfirmingAutoNotifyDisable(false)
    if (clearFavorites) {
      void window.chronicle.bulkSetChannelNotifyForFavorites(false).then(onChannelsChanged)
    }
  }

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
        <h2>{t('settings.language.heading')}</h2>
        <label className="settings-row">
          <span>{t('settings.language.label')}</span>
          <select value={settings.language} onChange={(event) => set('language', event.target.value)}>
            <option value="system">{t('settings.language.system')}</option>
            {AVAILABLE_LOCALES.map((locale) => (
              <option key={locale.code} value={locale.code}>
                {locale.nativeName}
              </option>
            ))}
          </select>
        </label>
      </section>

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
        <div className="settings-actions">
          <button className="primary" onClick={onReconnect}>
            {t('settings.connection.reconnectButton', { account: primaryAccountLabel })}
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
        <p className="settings-line dim">{t('settings.connection.playerSessionNote')}</p>
        <div className="settings-actions">
          <button className="primary" onClick={() => void window.chronicle.openYouTubeSignIn()}>
            {t('settings.connection.signInToYouTubeButton')}
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
        <label className="settings-row">
          <span>{t('settings.playback.watchLaterAutoRemove')}</span>
          <input
            type="checkbox"
            checked={settings.watchLaterAutoRemove}
            onChange={(event) => set('watchLaterAutoRemove', event.target.checked)}
          />
        </label>
        <p className="settings-line dim">{t('settings.playback.watchLaterAutoRemoveNote')}</p>
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
        <h2>{t('settings.startup.heading')}</h2>
        <label className="settings-row">
          <span>{t('settings.startup.autoStart')}</span>
          <input
            type="checkbox"
            checked={settings.autoStart}
            onChange={(event) => set('autoStart', event.target.checked)}
          />
        </label>
        <label className="settings-row">
          <span>{t('settings.startup.backgroundMode')}</span>
          <input
            type="checkbox"
            checked={settings.backgroundMode}
            onChange={(event) => set('backgroundMode', event.target.checked)}
          />
        </label>
        <p className="settings-line dim">{t('settings.startup.backgroundModeNote')}</p>
        {settings.backgroundMode && (
          <>
            <label className="settings-row">
              <span>{t('settings.startup.popOutOnClose')}</span>
              <input
                type="checkbox"
                checked={settings.popOutOnClose}
                onChange={(event) => set('popOutOnClose', event.target.checked)}
              />
            </label>
            <p className="settings-line dim">{t('settings.startup.popOutOnCloseNote')}</p>
          </>
        )}
        {settings.autoStart && settings.backgroundMode && (
          <>
            <label className="settings-row">
              <span>{t('settings.startup.startMinimized')}</span>
              <input
                type="checkbox"
                checked={settings.startMinimized}
                onChange={(event) => set('startMinimized', event.target.checked)}
              />
            </label>
            <p className="settings-line dim">{t('settings.startup.startMinimizedNote')}</p>
          </>
        )}
      </section>

      <section>
        <h2>{t('settings.notifications.heading')}</h2>
        <label className="settings-row">
          <span>{t('settings.notifications.enabled')}</span>
          <input
            type="checkbox"
            checked={settings.notifyNewVideos}
            onChange={(event) => set('notifyNewVideos', event.target.checked)}
          />
        </label>
        {!settings.backgroundMode && (
          <p className="settings-line dim">{t('settings.notifications.backgroundModeHint')}</p>
        )}
        {settings.notifyNewVideos && (
          <>
            <label className="settings-row">
              <span>{t('settings.notifications.scope')}</span>
              <select
                value={settings.notifyScope}
                onChange={(event) =>
                  set('notifyScope', event.target.value as SettingsDto['notifyScope'])
                }
              >
                <option value="all">{t('settings.notifications.scopeAll')}</option>
                <option value="selected">{t('settings.notifications.scopeSelected')}</option>
              </select>
            </label>
            {settings.notifyScope === 'selected' && (
              <p className="settings-line dim">{t('settings.notifications.scopeSelectedHint')}</p>
            )}
            {settings.showShorts && (
              <>
                <label className="settings-row">
                  <span>{t('settings.notifications.notifyShorts')}</span>
                  <input
                    type="checkbox"
                    checked={settings.notifyShorts}
                    onChange={(event) => set('notifyShorts', event.target.checked)}
                  />
                </label>
                <p className="settings-line dim">{t('settings.notifications.notifyShortsNote')}</p>
              </>
            )}
          </>
        )}
        <label className="settings-row">
          <span>{t('settings.notifications.autoFavorite')}</span>
          <input
            type="checkbox"
            checked={settings.autoNotifyFavorites}
            onChange={(event) => setAutoNotifyFavorites(event.target.checked)}
          />
        </label>
        <p className="settings-line dim">{t('settings.notifications.autoFavoriteNote')}</p>
      </section>

      <section>
        <h2>{t('settings.data.heading')}</h2>
        <p className="settings-line dim">{t('settings.data.note')}</p>
        {storageInfo && (
          <p className="settings-line dim">
            {t('settings.data.storageLine', {
              db: formatBytes(storageInfo.dbBytes),
              cache: formatBytes(storageInfo.cacheBytes),
              videos: storageInfo.videoCount
            })}
          </p>
        )}
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

        <label className="settings-row">
          <span>{t('settings.data.cleanupLabel')}</span>
          <select
            value={cleanupMonths}
            onChange={(event) => {
              setCleanupMonths(Number(event.target.value))
              setConfirmingCleanup(false)
            }}
          >
            <option value={6}>{t('settings.data.cleanup6Months')}</option>
            <option value={12}>{t('settings.data.cleanup12Months')}</option>
            <option value={24}>{t('settings.data.cleanup24Months')}</option>
            <option value={36}>{t('settings.data.cleanup36Months')}</option>
          </select>
        </label>
        <p className="settings-line dim">{t('settings.data.cleanupNote')}</p>
        <p className="settings-line dim">
          {cleanupPreview === null
            ? '…'
            : cleanupPreview === 0
              ? t('settings.data.cleanupPreviewNone')
              : t('settings.data.cleanupPreviewCount', { count: cleanupPreview })}
        </p>
        <div className="settings-actions">
          <button
            className={`primary${confirmingCleanup ? ' danger' : ''}`}
            disabled={!cleanupPreview}
            onClick={() => void cleanUp()}
          >
            {confirmingCleanup
              ? t('settings.data.cleanupConfirmButton', { count: cleanupPreview ?? 0 })
              : t('settings.data.cleanupButton')}
          </button>
        </div>
      </section>

      {confirmingAutoNotifyDisable && (
        <div
          className="overlay-backdrop"
          onClick={() => resolveAutoNotifyDisableConfirm(false)}
        >
          <div className="overlay write-scope-dialog" onClick={(event) => event.stopPropagation()}>
            <p>{t('settings.notifications.autoFavoriteDisableConfirm')}</p>
            <div className="write-scope-dialog-actions">
              <button onClick={() => resolveAutoNotifyDisableConfirm(false)}>
                {t('settings.notifications.autoFavoriteDisableKeep')}
              </button>
              <button className="primary" onClick={() => resolveAutoNotifyDisableConfirm(true)}>
                {t('settings.notifications.autoFavoriteDisableClear')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
