import type { ChronicleApi } from '../ipc/contract'

declare global {
  interface Window {
    chronicle: ChronicleApi
  }
}

export {}
