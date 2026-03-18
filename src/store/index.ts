// src/store/index.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MasterItem, Kit, Trip, TripItem, AppSettings, PatternSuggestion } from '../types'
import { seedItems, buildSeedKits } from './seed'
import { v4 as uuid } from 'uuid'

interface AppStore {
  // Data
  masterItems: MasterItem[]
  kits: Kit[]
  trips: Trip[]
  settings: AppSettings
  pendingSuggestions: PatternSuggestion[]

  // Master item actions
  addMasterItem: (item: Omit<MasterItem, 'id'>) => void
  updateMasterItem: (id: string, updates: Partial<MasterItem>) => void
  deleteMasterItem: (id: string) => void
  renameTag: (oldTag: string, newTag: string) => void

  // Kit actions
  addKit: (kit: Omit<Kit, 'id'>) => void
  updateKit: (id: string, updates: Partial<Kit>) => void
  deleteKit: (id: string) => void

  // Trip actions
  addTrip: (trip: Omit<Trip, 'id' | 'createdAt'>) => string
  updateTrip: (id: string, updates: Partial<Trip>) => void
  updateTripItem: (tripId: string, itemId: string, updates: Partial<TripItem>) => void
  addTripItem: (tripId: string, item: Omit<TripItem, 'id'>) => void
  removeTripItem: (tripId: string, itemId: string) => void
  completeTrip: (id: string) => void

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void

  // Suggestions
  setSuggestions: (suggestions: PatternSuggestion[]) => void
  dismissSuggestion: (index: number) => void

  // Export / Import
  exportData: () => string
  importData: (json: string) => void
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      masterItems: seedItems,
      kits: buildSeedKits(seedItems),
      trips: [],
      settings: { openRouterApiKey: '', hasCompletedOnboarding: false },
      pendingSuggestions: [],

      addMasterItem: (item) => set(s => ({
        masterItems: [...s.masterItems, { ...item, id: uuid() }]
      })),

      updateMasterItem: (id, updates) => set(s => ({
        masterItems: s.masterItems.map(i => i.id === id ? { ...i, ...updates } : i)
      })),

      deleteMasterItem: (id) => set(s => ({
        masterItems: s.masterItems.filter(i => i.id !== id)
      })),

      renameTag: (oldTag, newTag) => set(s => ({
        masterItems: s.masterItems.map(i => ({
          ...i,
          tags: i.tags.map(t => t === oldTag ? newTag : t)
        }))
      })),

      addKit: (kit) => set(s => ({
        kits: [...s.kits, { ...kit, id: uuid() }]
      })),

      updateKit: (id, updates) => set(s => ({
        kits: s.kits.map(k => k.id === id ? { ...k, ...updates } : k)
      })),

      deleteKit: (id) => set(s => ({
        kits: s.kits.filter(k => k.id !== id)
      })),

      addTrip: (trip) => {
        const id = uuid()
        set(s => ({
          trips: [...s.trips, { ...trip, id, createdAt: new Date().toISOString() }]
        }))
        return id
      },

      updateTrip: (id, updates) => set(s => ({
        trips: s.trips.map(t => t.id === id ? { ...t, ...updates } : t)
      })),

      updateTripItem: (tripId, itemId, updates) => set(s => ({
        trips: s.trips.map(t =>
          t.id === tripId
            ? { ...t, items: t.items.map(i => i.id === itemId ? { ...i, ...updates } : i) }
            : t
        )
      })),

      addTripItem: (tripId, item) => set(s => ({
        trips: s.trips.map(t =>
          t.id === tripId
            ? { ...t, items: [...t.items, { ...item, id: uuid() }] }
            : t
        )
      })),

      removeTripItem: (tripId, itemId) => set(s => ({
        trips: s.trips.map(t =>
          t.id === tripId
            ? { ...t, items: t.items.filter(i => i.id !== itemId) }
            : t
        )
      })),

      completeTrip: (id) => set(s => ({
        trips: s.trips.map(t =>
          t.id === id ? { ...t, completedAt: new Date().toISOString() } : t
        )
      })),

      updateSettings: (updates) => set(s => ({
        settings: { ...s.settings, ...updates }
      })),

      setSuggestions: (suggestions) => set({ pendingSuggestions: suggestions }),

      dismissSuggestion: (index) => set(s => ({
        pendingSuggestions: s.pendingSuggestions.filter((_, i) => i !== index)
      })),

      exportData: () => {
        const { masterItems, kits, trips, settings } = get()
        return JSON.stringify({ masterItems, kits, trips, settings }, null, 2)
      },

      importData: (json) => {
        const data = JSON.parse(json)
        set({
          masterItems: data.masterItems ?? [],
          kits: data.kits ?? [],
          trips: data.trips ?? [],
          settings: data.settings ?? { openRouterApiKey: '', hasCompletedOnboarding: false },
        })
      },
    }),
    { name: 'packing-app-store' }
  )
)
