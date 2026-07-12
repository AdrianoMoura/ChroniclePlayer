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

const api: ChronicleApi = {
  getFeed: (view: FeedViewDto, cursor: FeedCursorDto | null, channelId?: string | null) =>
    ipcRenderer.invoke(IpcChannel.getFeed, view, cursor, channelId ?? null),
  getFeedMeta: () => ipcRenderer.invoke(IpcChannel.getFeedMeta),
  getChannels: () => ipcRenderer.invoke(IpcChannel.getChannels),
  refreshFeed: () => ipcRenderer.invoke(IpcChannel.refreshFeed),
  refreshSubscriptions: () => ipcRenderer.invoke(IpcChannel.refreshSubscriptions),
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
  deleteAllData: () => ipcRenderer.invoke(IpcChannel.deleteAllData),
  onEvent: (listener: (event: ChronicleEventDto) => void) => {
    const wrapped = (_event: IpcRendererEvent, payload: ChronicleEventDto): void => listener(payload)
    ipcRenderer.on(IpcChannel.events, wrapped)
    return () => ipcRenderer.removeListener(IpcChannel.events, wrapped)
  }
}

contextBridge.exposeInMainWorld('chronicle', api)
