import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  IpcChannel,
  type ChronicleApi,
  type ChronicleEventDto,
  type CommentSortOrder,
  type FeedCursorDto,
  type FeedViewDto,
  type ReadStatusDto,
  type SettingsDto,
  type WindowControlDto,
  type WizardStateDto
} from '../ipc/contract'

// niri sets this for its own IPC; other tiling compositors (sway, i3) take
// the same "minimize is incompatible with tiling" stance but expose no
// equivalent marker to check cheaply, so only niri is covered (B-026).
const minimizeSupported = process.env['NIRI_SOCKET'] === undefined

const api: ChronicleApi = {
  getFeed: (
    view: FeedViewDto,
    cursor: FeedCursorDto | null,
    channelId?: string | null,
    accountId?: string | null
  ) => ipcRenderer.invoke(IpcChannel.getFeed, view, cursor, channelId ?? null, accountId ?? null),
  getFeedMeta: (accountId?: string | null) =>
    ipcRenderer.invoke(IpcChannel.getFeedMeta, accountId ?? null),
  getChannels: (accountId?: string | null) =>
    ipcRenderer.invoke(IpcChannel.getChannels, accountId ?? null),
  refreshFeed: (channelId?: string | null, accountId?: string | null) =>
    ipcRenderer.invoke(IpcChannel.refreshFeed, channelId ?? null, accountId ?? null),
  setReadStatus: (videoId: string, status: ReadStatusDto) =>
    ipcRenderer.invoke(IpcChannel.setReadStatus, videoId, status),
  markAllRead: (channelId: string | null, accountId?: string | null) =>
    ipcRenderer.invoke(IpcChannel.markAllRead, channelId, accountId ?? null),
  toggleFavorite: (videoId: string) => ipcRenderer.invoke(IpcChannel.toggleFavorite, videoId),
  toggleWatchLater: (videoId: string) => ipcRenderer.invoke(IpcChannel.toggleWatchLater, videoId),
  reorderWatchLater: (videoIds: string[]) =>
    ipcRenderer.invoke(IpcChannel.reorderWatchLater, videoIds),
  setResumePosition: (videoId: string, seconds: number | null) =>
    ipcRenderer.invoke(IpcChannel.setResumePosition, videoId, seconds),
  openInBrowser: (videoId: string) => ipcRenderer.invoke(IpcChannel.openInBrowser, videoId),
  openExternalUrl: (url: string) => ipcRenderer.invoke(IpcChannel.openExternalUrl, url),
  getVideo: (videoId: string) => ipcRenderer.invoke(IpcChannel.getVideo, videoId),
  removeVideo: (videoId: string) => ipcRenderer.invoke(IpcChannel.removeVideo, videoId),
  getAuthStatus: () => ipcRenderer.invoke(IpcChannel.getAuthStatus),
  importClientSecret: (json: string) => ipcRenderer.invoke(IpcChannel.importClientSecret, json),
  connectGoogle: () => ipcRenderer.invoke(IpcChannel.connectGoogle),
  signOut: () => ipcRenderer.invoke(IpcChannel.signOut),
  requestWriteScope: () => ipcRenderer.invoke(IpcChannel.requestWriteScope),
  requestWriteScopeForChannel: (channelId: string) =>
    ipcRenderer.invoke(IpcChannel.requestWriteScopeForChannel, channelId),
  getConnectedChannel: () => ipcRenderer.invoke(IpcChannel.getConnectedChannel),
  getWizardState: () => ipcRenderer.invoke(IpcChannel.getWizardState),
  setWizardState: (state: WizardStateDto) => ipcRenderer.invoke(IpcChannel.setWizardState, state),
  getSettings: () => ipcRenderer.invoke(IpcChannel.getSettings),
  setSettings: (settings: SettingsDto) => ipcRenderer.invoke(IpcChannel.setSettings, settings),
  getAppVersion: () => ipcRenderer.invoke(IpcChannel.getAppVersion),
  exportData: () => ipcRenderer.invoke(IpcChannel.exportData),
  windowControl: (action: WindowControlDto) =>
    ipcRenderer.invoke(IpcChannel.windowControl, action),
  platform: process.platform,
  minimizeSupported,
  deleteAllData: () => ipcRenderer.invoke(IpcChannel.deleteAllData),
  getStorageInfo: () => ipcRenderer.invoke(IpcChannel.getStorageInfo),
  unsubscribeChannel: (channelId: string) =>
    ipcRenderer.invoke(IpcChannel.unsubscribeChannel, channelId),
  toggleChannelFavorite: (channelId: string) =>
    ipcRenderer.invoke(IpcChannel.toggleChannelFavorite, channelId),
  toggleChannelNotify: (channelId: string) =>
    ipcRenderer.invoke(IpcChannel.toggleChannelNotify, channelId),
  bulkSetChannelNotifyForFavorites: (enable: boolean) =>
    ipcRenderer.invoke(IpcChannel.bulkSetChannelNotifyForFavorites, enable),
  getPriorityFeed: (accountId?: string | null) =>
    ipcRenderer.invoke(IpcChannel.getPriorityFeed, accountId ?? null),
  getNextWatchLater: (currentVideoId: string) =>
    ipcRenderer.invoke(IpcChannel.getNextWatchLater, currentVideoId),
  backfillChannelArchive: (channelId: string) =>
    ipcRenderer.invoke(IpcChannel.backfillChannelArchive, channelId),
  searchYouTube: (query: string, pageToken?: string | null) =>
    ipcRenderer.invoke(IpcChannel.searchYouTube, query, pageToken ?? null),
  subscribeChannel: (channelId: string) =>
    ipcRenderer.invoke(IpcChannel.subscribeChannel, channelId),
  getChannelDetail: (channelId: string) =>
    ipcRenderer.invoke(IpcChannel.getChannelDetail, channelId),
  getChannelVideos: (channelId: string, pageToken?: string | null) =>
    ipcRenderer.invoke(IpcChannel.getChannelVideos, channelId, pageToken ?? null),
  getComments: (videoId: string, pageToken?: string | null, order?: CommentSortOrder) =>
    ipcRenderer.invoke(IpcChannel.getComments, videoId, pageToken ?? null, order ?? null),
  postComment: (videoId: string, text: string) =>
    ipcRenderer.invoke(IpcChannel.postComment, videoId, text),
  replyToComment: (parentId: string, text: string) =>
    ipcRenderer.invoke(IpcChannel.replyToComment, parentId, text),
  updateComment: (commentId: string, text: string) =>
    ipcRenderer.invoke(IpcChannel.updateComment, commentId, text),
  rateVideo: (videoId: string, rating: 'like' | 'none') =>
    ipcRenderer.invoke(IpcChannel.rateVideo, videoId, rating),
  getVideoRating: (videoId: string) => ipcRenderer.invoke(IpcChannel.getVideoRating, videoId),
  listAccounts: () => ipcRenderer.invoke(IpcChannel.listAccounts),
  startAddAccount: () => ipcRenderer.invoke(IpcChannel.startAddAccount),
  connectAccount: (accountId: string) => ipcRenderer.invoke(IpcChannel.connectAccount, accountId),
  removeAccount: (accountId: string) => ipcRenderer.invoke(IpcChannel.removeAccount, accountId),
  syncAccountNow: (accountId: string) => ipcRenderer.invoke(IpcChannel.syncAccountNow, accountId),
  openYouTubeSignIn: (title?: string) => ipcRenderer.invoke(IpcChannel.openYouTubeSignIn, title),
  extractPlayer: (
    videoId: string,
    title: string,
    currentTimeSeconds: number,
    playing: boolean,
    defaultPlaybackRate: number,
    auto: boolean
  ) =>
    ipcRenderer.invoke(
      IpcChannel.extractPlayer,
      videoId,
      title,
      currentTimeSeconds,
      playing,
      defaultPlaybackRate,
      auto
    ),
  loadInExtractWindow: (videoId: string, title: string) =>
    ipcRenderer.invoke(IpcChannel.loadInExtractWindow, videoId, title),
  extractChat: (videoId: string) => ipcRenderer.invoke(IpcChannel.extractChat, videoId),
  listPlaylists: () => ipcRenderer.invoke(IpcChannel.listPlaylists),
  createPlaylist: (name: string, description: string | null) =>
    ipcRenderer.invoke(IpcChannel.createPlaylist, name, description),
  updatePlaylist: (playlistId: string, name: string, description: string | null) =>
    ipcRenderer.invoke(IpcChannel.updatePlaylist, playlistId, name, description),
  deletePlaylist: (playlistId: string) => ipcRenderer.invoke(IpcChannel.deletePlaylist, playlistId),
  getPlaylistVideos: (playlistId: string) =>
    ipcRenderer.invoke(IpcChannel.getPlaylistVideos, playlistId),
  addVideoToPlaylist: (playlistId: string, videoId: string) =>
    ipcRenderer.invoke(IpcChannel.addVideoToPlaylist, playlistId, videoId),
  removeVideoFromPlaylist: (playlistId: string, videoId: string) =>
    ipcRenderer.invoke(IpcChannel.removeVideoFromPlaylist, playlistId, videoId),
  getPlaylistsForVideo: (videoId: string) =>
    ipcRenderer.invoke(IpcChannel.getPlaylistsForVideo, videoId),
  reorderPlaylist: (playlistId: string, videoIds: string[]) =>
    ipcRenderer.invoke(IpcChannel.reorderPlaylist, playlistId, videoIds),
  getNextInPlaylist: (playlistId: string, currentVideoId: string) =>
    ipcRenderer.invoke(IpcChannel.getNextInPlaylist, playlistId, currentVideoId),
  importPlaylist: (url: string) => ipcRenderer.invoke(IpcChannel.importPlaylist, url),
  checkPlaylistUpdates: (playlistId: string) =>
    ipcRenderer.invoke(IpcChannel.checkPlaylistUpdates, playlistId),
  syncPlaylist: (playlistId: string) => ipcRenderer.invoke(IpcChannel.syncPlaylist, playlistId),
  onEvent: (listener: (event: ChronicleEventDto) => void) => {
    const wrapped = (_event: IpcRendererEvent, payload: ChronicleEventDto): void => listener(payload)
    ipcRenderer.on(IpcChannel.events, wrapped)
    return () => ipcRenderer.removeListener(IpcChannel.events, wrapped)
  }
}

contextBridge.exposeInMainWorld('chronicle', api)
