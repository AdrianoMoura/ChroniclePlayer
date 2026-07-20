import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ExtractedPlayerWindow } from './ExtractedPlayerWindow'
import { Titlebar } from './Titlebar'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('missing #root element')

// The extracted-to-window player loads this exact same renderer bundle
// (main.ts's loadRenderer helper appends the query string) rather than
// needing its own separate Vite entry point.
const params = new URLSearchParams(window.location.search)
const extractVideoId = params.get('extract')

createRoot(root).render(
  <StrictMode>
    {extractVideoId !== null ? (
      <ExtractedPlayerWindow
        videoId={extractVideoId}
        title={params.get('title') ?? ''}
        startSeconds={Number(params.get('t') ?? '0')}
        autoplay={params.get('autoplay') === '1'}
        defaultPlaybackRate={Number(params.get('rate') ?? '1')}
      />
    ) : (
      <>
        <Titlebar />
        <App />
      </>
    )}
  </StrictMode>
)
