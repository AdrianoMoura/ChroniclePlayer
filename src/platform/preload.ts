import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  IpcChannel,
  type ChronicleApi,
  type ChronicleEventDto,
  type FeedCursorDto,
  type FeedViewDto,
  type ReadStatusDto,
  type SettingsDto,
  type WindowControlDto,
  type WizardStateDto
} from '../ipc/contract'

// niri sets this for its own IPC; sway/i3 take the same "minimize is
// incompatible with tiling" stance but don't expose an equivalent marker
// we can check cheaply, so this only covers the compositor actually
// reported broken (B-026).
const minimizeSupported = process.env['NIRI_SOCKET'] === undefined

const api: ChronicleApi = {
  getFeed: (view: FeedViewDto, cursor: FeedCursorDto | null, channelId?: string | null) =>
    ipcRenderer.invoke(IpcChannel.getFeed, view, cursor, channelId ?? null),
  getFeedMeta: () => ipcRenderer.invoke(IpcChannel.getFeedMeta),
  getChannels: () => ipcRenderer.invoke(IpcChannel.getChannels),
  refreshFeed: (channelId?: string | null) =>
    ipcRenderer.invoke(IpcChannel.refreshFeed, channelId ?? null),
  setReadStatus: (videoId: string, status: ReadStatusDto) =>
    ipcRenderer.invoke(IpcChannel.setReadStatus, videoId, status),
  markAllRead: (channelId: string | null) => ipcRenderer.invoke(IpcChannel.markAllRead, channelId),
  toggleFavorite: (videoId: string) => ipcRenderer.invoke(IpcChannel.toggleFavorite, videoId),
  toggleWatchLater: (videoId: string) => ipcRenderer.invoke(IpcChannel.toggleWatchLater, videoId),
  openInBrowser: (videoId: string) => ipcRenderer.invoke(IpcChannel.openInBrowser, videoId),
  openExternalUrl: (url: string) => ipcRenderer.invoke(IpcChannel.openExternalUrl, url),
  getVideo: (videoId: string) => ipcRenderer.invoke(IpcChannel.getVideo, videoId),
  getAuthStatus: () => ipcRenderer.invoke(IpcChannel.getAuthStatus),
  importClientSecret: (json: string) => ipcRenderer.invoke(IpcChannel.importClientSecret, json),
  connectGoogle: () => ipcRenderer.invoke(IpcChannel.connectGoogle),
  signOut: () => ipcRenderer.invoke(IpcChannel.signOut),
  getConnectedChannel: () => ipcRenderer.invoke(IpcChannel.getConnectedChannel),
  getWizardState: () => ipcRenderer.invoke(IpcChannel.getWizardState),
  setWizardState: (state: WizardStateDto) => ipcRenderer.invoke(IpcChannel.setWizardState, state),
  getSettings: () => ipcRenderer.invoke(IpcChannel.getSettings),
  setSettings: (settings: SettingsDto) => ipcRenderer.invoke(IpcChannel.setSettings, settings),
  exportData: () => ipcRenderer.invoke(IpcChannel.exportData),
  windowControl: (action: WindowControlDto) =>
    ipcRenderer.invoke(IpcChannel.windowControl, action),
  platform: process.platform,
  minimizeSupported,
  deleteAllData: () => ipcRenderer.invoke(IpcChannel.deleteAllData),
  onEvent: (listener: (event: ChronicleEventDto) => void) => {
    const wrapped = (_event: IpcRendererEvent, payload: ChronicleEventDto): void => listener(payload)
    ipcRenderer.on(IpcChannel.events, wrapped)
    return () => ipcRenderer.removeListener(IpcChannel.events, wrapped)
  }
}

contextBridge.exposeInMainWorld('chronicle', api)
