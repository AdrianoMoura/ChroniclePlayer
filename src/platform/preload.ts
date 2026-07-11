import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  IpcChannel,
  type ChronicleApi,
  type ChronicleEventDto,
  type FeedCursorDto,
  type FeedViewDto,
  type ReadStatusDto
} from '../ipc/contract'

const api: ChronicleApi = {
  getFeed: (view: FeedViewDto, cursor: FeedCursorDto | null, channelId?: string | null) =>
    ipcRenderer.invoke(IpcChannel.getFeed, view, cursor, channelId ?? null),
  getFeedMeta: () => ipcRenderer.invoke(IpcChannel.getFeedMeta),
  getChannels: () => ipcRenderer.invoke(IpcChannel.getChannels),
  refreshFeed: () => ipcRenderer.invoke(IpcChannel.refreshFeed),
  setReadStatus: (videoId: string, status: ReadStatusDto) =>
    ipcRenderer.invoke(IpcChannel.setReadStatus, videoId, status),
  toggleFavorite: (videoId: string) => ipcRenderer.invoke(IpcChannel.toggleFavorite, videoId),
  toggleWatchLater: (videoId: string) => ipcRenderer.invoke(IpcChannel.toggleWatchLater, videoId),
  openInBrowser: (videoId: string) => ipcRenderer.invoke(IpcChannel.openInBrowser, videoId),
  getAuthStatus: () => ipcRenderer.invoke(IpcChannel.getAuthStatus),
  importClientSecret: (json: string) => ipcRenderer.invoke(IpcChannel.importClientSecret, json),
  connectGoogle: () => ipcRenderer.invoke(IpcChannel.connectGoogle),
  signOut: () => ipcRenderer.invoke(IpcChannel.signOut),
  onEvent: (listener: (event: ChronicleEventDto) => void) => {
    const wrapped = (_event: IpcRendererEvent, payload: ChronicleEventDto): void => listener(payload)
    ipcRenderer.on(IpcChannel.events, wrapped)
    return () => ipcRenderer.removeListener(IpcChannel.events, wrapped)
  }
}

contextBridge.exposeInMainWorld('chronicle', api)
