import { t } from './i18n'

// Frameless-shell titlebar (B-014): the drag strip and window controls
// replace the system chrome. macOS keeps its native traffic lights
// (titleBarStyle: 'hidden'), so the custom buttons render elsewhere only.
export function Titlebar() {
  const showControls = window.chronicle.platform !== 'darwin'
  return (
    <header className="titlebar">
      <span className="titlebar-title">Chronicle</span>
      {showControls && (
        <div className="titlebar-controls">
          {window.chronicle.minimizeSupported && (
            <button
              title={t('titlebar.minimize')}
              onClick={() => void window.chronicle.windowControl('minimize')}
            >
              ─
            </button>
          )}
          <button
            title={t('titlebar.maximizeRestore')}
            onClick={() => void window.chronicle.windowControl('toggle-maximize')}
          >
            ▢
          </button>
          <button
            className="titlebar-close"
            title={t('titlebar.close')}
            onClick={() => void window.chronicle.windowControl('close')}
          >
            ✕
          </button>
        </div>
      )}
    </header>
  )
}
