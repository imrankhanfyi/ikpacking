// src/store/index.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MasterItem, Kit, Trip, TripItem, AppSettings, PatternSuggestion } from '../types'
import { seedItems, buildSeedKits } from './seed'
import { mergeRecords } from '../../shared/syncMerge.mjs'
import { seedItemId, seedKitId, SEED_EPOCH, SEED_ITEM_NAMES, SEED_KIT_NAMES } from '../../shared/seedIds.mjs'
import { v4 as uuid } from 'uuid'

// Persist migration v1 -> v2: the LWW + tombstone rollout.
// v1 stored seeds with random uuid ids (a storage wipe reseeded with NEW ids and
// the union merge duplicated the library). v2 gives seeds deterministic ids, so
// here we re-key v1's seed records by NAME -> deterministic id, REMAP every foreign
// key that pointed at an old id (trip items, kit items, swaps), backfill the new
// updatedAt/deletedAt sync fields, and de-duplicate by id (healing any pre-existing
// duplicate seeds) via mergeRecords.
export function migrateV1toV2(persisted: any): any {
  if (!persisted || typeof persisted !== 'object') return persisted
  const now = new Date().toISOString()

  // Master items: re-key seeds by name; user-added items keep their id.
  const masterIdMap = new Map<string, string>()
  const rawMasters = (persisted.masterItems ?? []).map((it: any) => {
    const isSeed = SEED_ITEM_NAMES.includes(it.name)
    const newId = isSeed ? seedItemId(it.name) : it.id
    if (typeof it.id === 'string' && newId !== it.id) masterIdMap.set(it.id, newId)
    return {
      ...it,
      id: newId,
      updatedAt: it.updatedAt ?? (isSeed ? SEED_EPOCH : now),
      deletedAt: it.deletedAt ?? null,
    }
  })
  const remapMaster = (id: string | null | undefined) =>
    id == null ? id : masterIdMap.get(id) ?? id

  // Kits: re-key seed kits by name; remap item refs + swaps through the master map.
  const rawKits = (persisted.kits ?? []).map((k: any) => {
    const isSeed = SEED_KIT_NAMES.includes(k.name)
    return {
      ...k,
      id: isSeed ? seedKitId(k.name) : k.id,
      items: (k.items ?? []).map((ki: any) => ({
        ...ki,
        masterItemId: remapMaster(ki.masterItemId),
        ...(ki.swapsItemId == null ? {} : { swapsItemId: remapMaster(ki.swapsItemId) }),
      })),
      updatedAt: k.updatedAt ?? (isSeed ? SEED_EPOCH : now),
      deletedAt: k.deletedAt ?? null,
    }
  })

  // Trips: backfill sync fields; remap each item's masterItemId so it still
  // resolves after the seed re-key (else trip items orphan).
  const trips = (persisted.trips ?? []).map((t: any) => ({
    ...t,
    completedAt: t.completedAt ?? null,
    updatedAt: t.updatedAt ?? t.createdAt ?? now,
    deletedAt: t.deletedAt ?? null,
    items: mergeRecords(
      (t.items ?? []).map((ti: any) => ({
        ...ti,
        masterItemId: remapMaster(ti.masterItemId),
        updatedAt: ti.updatedAt ?? t.createdAt ?? now,
        deletedAt: ti.deletedAt ?? null,
      })),
      [],
    ),
  }))

  return {
    ...persisted,
    masterItems: mergeRecords(rawMasters, []), // dedup by id, heals duplicate seeds
    kits: mergeRecords(rawKits, []),
    trips,
  }
}

interface AppStore {
  // Data
  masterItems: MasterItem[]
  kits: Kit[]
  trips: Trip[]
  settings: AppSettings
  pendingSuggestions: PatternSuggestion[]

  // Master item actions
  addMasterItem: (item: Omit<MasterItem, 'id' | 'updatedAt' | 'deletedAt'>) => void
  updateMasterItem: (id: string, updates: Partial<MasterItem>) => void
  deleteMasterItem: (id: string) => void
  restoreMasterItem: (id: string) => void
  permanentlyDeleteMasterItem: (id: string) => void
  emptyTrash: () => void
  renameTag: (oldTag: string, newTag: string) => void

  // Kit actions
  addKit: (kit: Omit<Kit, 'id' | 'updatedAt' | 'deletedAt'>) => void
  updateKit: (id: string, updates: Partial<Kit>) => void
  deleteKit: (id: string) => void

  // Trip actions
  addTrip: (trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => string
  updateTrip: (id: string, updates: Partial<Trip>) => void
  updateTripItem: (tripId: string, itemId: string, updates: Partial<TripItem>) => void
  addTripItem: (tripId: string, item: Omit<TripItem, 'id' | 'updatedAt' | 'deletedAt'>) => void
  removeTripItem: (tripId: string, itemId: string) => void
  completeTrip: (id: string) => void
  renameTrip: (id: string, name: string) => void
  deleteTrip: (id: string) => void
  duplicateTrip: (id: string) => string

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void

  // Suggestions
  setSuggestions: (suggestions: PatternSuggestion[]) => void
  dismissSuggestion: (index: number) => void

  // Export / Import
  exportData: () => string
  importData: (json: string) => void

  // Seed integrity
  mergeMissingSeeds: () => void

  // Computed getters
  getActiveItems: () => MasterItem[]
  getTrashedItems: () => MasterItem[]
  getActiveTrips: () => Trip[]
  getCompletedTrips: () => Trip[]
  getActiveKits: () => Kit[]
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      masterItems: seedItems,
      kits: buildSeedKits(seedItems),
      trips: [],
      settings: { openRouterApiKey: '', syncToken: '', syncUrl: '', hasCompletedOnboarding: false },
      pendingSuggestions: [],

      addMasterItem: (item) => {
        const now = new Date().toISOString()
        set(s => ({
          masterItems: [...s.masterItems, { ...item, id: uuid(), updatedAt: now, deletedAt: null }]
        }))
      },

      updateMasterItem: (id, updates) => {
        const now = new Date().toISOString()
        set(s => ({
          masterItems: s.masterItems.map(i => i.id === id ? { ...i, ...updates, updatedAt: now } : i)
        }))
      },

      deleteMasterItem: (id) => {
        const now = new Date().toISOString()
        set(s => ({
          masterItems: s.masterItems.map(i => i.id === id ? { ...i, deletedAt: now, updatedAt: now } : i)
        }))
      },

      restoreMasterItem: (id) => {
        const now = new Date().toISOString()
        set(s => ({
          masterItems: s.masterItems.map(i => i.id === id ? { ...i, deletedAt: null, updatedAt: now } : i)
        }))
      },

      permanentlyDeleteMasterItem: (id) => set(s => ({
        // Local trash purge: filters out hard; a true cross-device purge needs tombstone GC (deferred).
        // A purged item may reappear in Trash after a sync until then — accepted limitation.
        masterItems: s.masterItems.filter(i => i.id !== id)
      })),

      emptyTrash: () => set(s => ({
        // Local trash purge: filters out all soft-deleted items; a true cross-device purge needs
        // tombstone GC (deferred). Purged items may reappear in Trash after a sync — accepted limitation.
        masterItems: s.masterItems.filter(i => !i.deletedAt)
      })),

      renameTag: (oldTag, newTag) => {
        const now = new Date().toISOString()
        set(s => ({
          masterItems: s.masterItems.map(i => {
            if (!i.tags.includes(oldTag)) return i
            return { ...i, tags: i.tags.map(t => t === oldTag ? newTag : t), updatedAt: now }
          })
        }))
      },

      addKit: (kit) => {
        const now = new Date().toISOString()
        set(s => ({
          kits: [...s.kits, { ...kit, id: uuid(), updatedAt: now, deletedAt: null }]
        }))
      },

      updateKit: (id, updates) => {
        const now = new Date().toISOString()
        set(s => ({
          kits: s.kits.map(k => k.id === id ? { ...k, ...updates, updatedAt: now } : k)
        }))
      },

      deleteKit: (id) => {
        const now = new Date().toISOString()
        set(s => ({
          kits: s.kits.map(k => k.id === id ? { ...k, deletedAt: now, updatedAt: now } : k)
        }))
      },

      addTrip: (trip) => {
        const id = uuid()
        const createdAt = new Date().toISOString()
        set(s => ({
          trips: [...s.trips, { ...trip, id, createdAt, updatedAt: createdAt, deletedAt: null }]
        }))
        return id
      },

      updateTrip: (id, updates) => {
        const now = new Date().toISOString()
        set(s => ({
          trips: s.trips.map(t => t.id === id ? { ...t, ...updates, updatedAt: now } : t)
        }))
      },

      updateTripItem: (tripId, itemId, updates) => {
        // Item-level mutation: bumps TripItem.updatedAt ONLY — never the parent Trip.updatedAt.
        // This is critical for per-item LWW: a check-off on one device must not clobber
        // trip-scalar edits (name/profile/etc.) on another.
        const now = new Date().toISOString()
        set(s => ({
          trips: s.trips.map(t =>
            t.id === tripId
              ? { ...t, items: t.items.map(i => i.id === itemId ? { ...i, ...updates, updatedAt: now } : i) }
              : t
          )
        }))
      },

      addTripItem: (tripId, item) => {
        // Item-level mutation: do NOT bump Trip.updatedAt.
        const now = new Date().toISOString()
        set(s => ({
          trips: s.trips.map(t =>
            t.id === tripId
              ? { ...t, items: [...t.items, { ...item, id: uuid(), updatedAt: now, deletedAt: null }] }
              : t
          )
        }))
      },

      removeTripItem: (tripId, itemId) => {
        // Soft-delete: set tombstone on item — do NOT bump Trip.updatedAt.
        // Prevents cross-device resurrection: if this device deletes an item and another
        // device still has it, the tombstone (with its fresh updatedAt) will win LWW.
        const now = new Date().toISOString()
        set(s => ({
          trips: s.trips.map(t =>
            t.id === tripId
              ? { ...t, items: t.items.map(i => i.id === itemId ? { ...i, deletedAt: now, updatedAt: now } : i) }
              : t
          )
        }))
      },

      completeTrip: (id) => {
        const now = new Date().toISOString()
        set(s => ({
          trips: s.trips.map(t =>
            t.id === id ? { ...t, completedAt: now, updatedAt: now } : t
          )
        }))
      },

      renameTrip: (id, name) => {
        const now = new Date().toISOString()
        set(s => ({
          trips: s.trips.map(t => t.id === id ? { ...t, name, updatedAt: now } : t)
        }))
      },

      deleteTrip: (id) => {
        // Soft-delete: set tombstone so the deletion propagates via LWW on sync.
        // A hard delete here would let the trip resurrect from the other device on next sync.
        const now = new Date().toISOString()
        set(s => ({
          trips: s.trips.map(t => t.id === id ? { ...t, deletedAt: now, updatedAt: now } : t)
        }))
      },

      duplicateTrip: (id) => {
        const trip = get().trips.find(t => t.id === id)
        if (!trip) return ''
        const now = new Date().toISOString()
        const newId = uuid()
        set(s => ({
          trips: [...s.trips, {
            ...trip,
            id: newId,
            name: `${trip.name} (copy)`,
            createdAt: now,
            departureDate: new Date().toISOString().split('T')[0],
            completedAt: null,
            updatedAt: now,
            deletedAt: null,
            items: trip.items.map(item => ({
              ...item,
              id: uuid(),
              isPacked: false,
              isIncluded: true,
              updatedAt: now,
              deletedAt: null,
            })),
          }]
        }))
        return newId
      },

      updateSettings: (updates) => set(s => ({
        settings: { ...s.settings, ...updates }
      })),

      setSuggestions: (suggestions) => set({ pendingSuggestions: suggestions }),

      dismissSuggestion: (index) => set(s => ({
        pendingSuggestions: s.pendingSuggestions.filter((_, i) => i !== index)
      })),

      mergeMissingSeeds: () => set(s => {
        // Reconcile by deterministic id: a soft-deleted seed still occupies its id
        // (with a tombstone), so it is NOT "missing" and won't be resurrected.
        const existingIds = new Set(s.masterItems.map(i => i.id))
        const missing = seedItems.filter(i => !existingIds.has(i.id))
        if (missing.length === 0) return {}
        return { masterItems: [...s.masterItems, ...missing] }
      }),

      exportData: () => {
        const { masterItems, kits, trips, settings } = get()
        return JSON.stringify({ masterItems, kits, trips, settings }, null, 2)
      },

      importData: (json) => {
        const data = JSON.parse(json)
        const current = get().settings
        set({
          masterItems: data.masterItems ?? [],
          kits: data.kits ?? [],
          trips: data.trips ?? [],
          settings: {
            ...(data.settings ?? {}),
            syncUrl: current.syncUrl,
            syncToken: current.syncToken,
            hasCompletedOnboarding: current.hasCompletedOnboarding,
          },
        })
      },

      getActiveItems: () => get().masterItems.filter(i => !i.deletedAt),
      getTrashedItems: () => get().masterItems.filter(i => !!i.deletedAt),
      getActiveTrips: () => get().trips.filter(t => !t.completedAt && t.deletedAt == null).sort((a, b) => a.departureDate.localeCompare(b.departureDate)),
      getCompletedTrips: () => get().trips.filter(t => !!t.completedAt && t.deletedAt == null).sort((a, b) => b.departureDate.localeCompare(a.departureDate)),
      getActiveKits: () => get().kits.filter(k => k.deletedAt == null),
    }),
    {
      name: 'packing-app-store',
      version: 2,
      migrate: (persisted: any, version: number) =>
        version >= 2 ? persisted : migrateV1toV2(persisted),
      merge: (persisted: any, current) => {
        const p = persisted ?? {}
        const storedItems: MasterItem[] = p.masterItems ?? []
        // Reconcile missing seeds by deterministic id (not name) so re-keyed seeds
        // don't duplicate; dedup the union by id to heal any stragglers.
        const storedIds = new Set(storedItems.map(i => i.id))
        const missing = seedItems.filter(i => !storedIds.has(i.id))
        return {
          ...current,
          ...p,
          masterItems: mergeRecords([...storedItems, ...missing], []),
        }
      },
    }
  )
)
