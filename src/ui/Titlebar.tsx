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
              title="Minimize"
              onClick={() => void window.chronicle.windowControl('minimize')}
            >
              ─
            </button>
          )}
          <button
            title="Maximize / restore"
            onClick={() => void window.chronicle.windowControl('toggle-maximize')}
          >
            ▢
          </button>
          <button
            className="titlebar-close"
            title="Close"
            onClick={() => void window.chronicle.windowControl('close')}
          >
            ✕
          </button>
        </div>
      )}
    </header>
  )
}
