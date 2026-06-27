// src/types/index.ts

export type QtyBasis = 'fixed' | 'per-day'
export type Weather = 'cold' | 'warm' | 'mixed'
export type TripType = 'business' | 'leisure' | 'mixed'
export type TripMode = 'road-trip' | 'carry-on' | 'checked'

// Every synced record carries an `updatedAt` (ISO string, drives last-write-wins
// on merge) and a `deletedAt` tombstone (ISO string when soft-deleted, else null).
// Both are required so `tsc -b` flags every construction site that forgets them.

export interface MasterItem {
  id: string
  name: string
  category: string
  tags: string[]
  defaultQty: number
  qtyBasis: QtyBasis
  isLastMinute: boolean
  isEssential: boolean
  updatedAt: string
  deletedAt: string | null  // ISO date string — soft delete tombstone
}

export interface KitItem {
  masterItemId: string
  qty: number
  swapsItemId?: string  // this kit item replaces another master item
}

// Kits merge whole-record by Kit.updatedAt, so KitItem needs no timestamps.
export interface Kit {
  id: string
  name: string
  items: KitItem[]
  updatedAt: string
  deletedAt: string | null
}

export interface TripProfile {
  duration: number
  weather: Weather
  type: TripType
  mode: TripMode
  nlDescription: string
}

export interface TripItem {
  id: string
  masterItemId: string | null  // null = one-off
  name: string
  qty: number
  isIncluded: boolean
  isPacked: boolean
  isLastMinute: boolean
  isEssential: boolean
  category: string
  updatedAt: string         // per-item LWW: check-offs merge by this
  deletedAt: string | null  // tombstone
}

export interface Trip {
  id: string
  name: string
  createdAt: string        // ISO date string
  departureDate: string    // ISO date string — drives last-minute logic
  completedAt: string | null
  profile: TripProfile
  activeKitIds: string[]
  items: TripItem[]
  updatedAt: string         // LWW for trip scalars (name/departureDate/profile/activeKitIds)
  deletedAt: string | null  // tombstone
}

export interface AppSettings {
  openRouterApiKey: string
  syncToken: string
  syncUrl: string
  hasCompletedOnboarding: boolean
}

export interface PatternSuggestion {
  type: 'remove-default' | 'promote-to-master' | 'adjust-qty'
  itemName: string
  message: string
  tripCount: number
}
