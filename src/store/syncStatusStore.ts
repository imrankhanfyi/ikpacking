// src/store/syncStatusStore.ts
import { create } from 'zustand'

export type SyncStatus = 'idle' | 'ok' | 'error'

interface SyncStatusStore {
  status: SyncStatus
  lastError: string | null
  lastSyncedAt: string | null // ISO string
  setSynced: () => void
  setSyncError: (msg: string) => void
}

export const useSyncStatusStore = create<SyncStatusStore>()((set) => ({
  status: 'idle',
  lastError: null,
  lastSyncedAt: null,
  setSynced: () => set({ status: 'ok', lastSyncedAt: new Date().toISOString(), lastError: null }),
  setSyncError: (msg) => set({ status: 'error', lastError: msg }),
}))

// Plain helpers mirroring toastStore's toast()/toastError(): call into the store
// via getState() so non-React modules (sync.ts) can report status directly.
export function reportSyncSuccess() {
  useSyncStatusStore.getState().setSynced()
}

export function reportSyncError(msg: string) {
  useSyncStatusStore.getState().setSyncError(msg)
}
