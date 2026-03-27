// src/store/toastStore.ts
import { create } from 'zustand'

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'undo'
  message: string
  onUndo?: () => void
}

interface ToastStore {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
}

let nextId = 0

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = String(++nextId)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    if (toast.type !== 'undo') {
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
    } else {
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 6000)
    }
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function toast(message: string) {
  useToastStore.getState().addToast({ type: 'success', message })
}

export function toastError(message: string) {
  useToastStore.getState().addToast({ type: 'error', message })
}

export function toastUndo(message: string, onUndo: () => void) {
  useToastStore.getState().addToast({ type: 'undo', message, onUndo })
}
