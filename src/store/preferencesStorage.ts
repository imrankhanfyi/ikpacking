import { Preferences } from '@capacitor/preferences'
import type { StateStorage } from 'zustand/middleware'

/** zustand StateStorage backed by native UserDefaults (survives WKWebView storage eviction). */
export const preferencesStorage: StateStorage = {
  getItem: async (name) => {
    const { value } = await Preferences.get({ key: name })
    return value
  },
  setItem: async (name, value) => {
    await Preferences.set({ key: name, value })
  },
  removeItem: async (name) => {
    await Preferences.remove({ key: name })
  },
}
