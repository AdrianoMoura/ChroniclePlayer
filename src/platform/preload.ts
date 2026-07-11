import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel, type ChronicleApi } from '../ipc/contract'

const api: ChronicleApi = {
  getFeed: () => ipcRenderer.invoke(IpcChannel.getFeed)
}

contextBridge.exposeInMainWorld('chronicle', api)
