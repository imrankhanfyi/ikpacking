import type { MasterItem, TripItem, TripProfile } from '../types'
import { filterItemsByProfile } from './itemFilter'
import { computeQty } from './quantities'
import { v4 as uuid } from 'uuid'

export function generateTripItems(masterItems: MasterItem[], profile: TripProfile): TripItem[] {
  const now = new Date().toISOString()
  return filterItemsByProfile(masterItems, profile).map(item => ({
    id: uuid(),
    masterItemId: item.id,
    name: item.name,
    qty: computeQty(item, profile.duration),
    isIncluded: true,
    isPacked: false,
    isLastMinute: item.isLastMinute,
    isEssential: item.isEssential,
    category: item.category,
    updatedAt: now,
    deletedAt: null,
  }))
}
