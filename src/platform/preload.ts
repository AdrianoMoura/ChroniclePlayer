import { contextBridge, ipcRenderer } from 'electron'
import {
  IpcChannel,
  type ChronicleApi,
  type FeedCursorDto,
  type FeedViewDto,
  type ReadStatusDto
} from '../ipc/contract'

const api: ChronicleApi = {
  getFeed: (view: FeedViewDto, cursor: FeedCursorDto | null) =>
    ipcRenderer.invoke(IpcChannel.getFeed, view, cursor),
  getFeedMeta: () => ipcRenderer.invoke(IpcChannel.getFeedMeta),
  setReadStatus: (videoId: string, status: ReadStatusDto) =>
    ipcRenderer.invoke(IpcChannel.setReadStatus, videoId, status),
  toggleFavorite: (videoId: string) => ipcRenderer.invoke(IpcChannel.toggleFavorite, videoId),
  toggleWatchLater: (videoId: string) => ipcRenderer.invoke(IpcChannel.toggleWatchLater, videoId),
  openInBrowser: (videoId: string) => ipcRenderer.invoke(IpcChannel.openInBrowser, videoId)
}

contextBridge.exposeInMainWorld('chronicle', api)
