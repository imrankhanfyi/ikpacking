import { TripItem, Kit } from '../types'
import { v4 as uuid } from 'uuid'

export function applyKits(baseItems: TripItem[], allKits: Kit[], activeKitIds: string[]): TripItem[] {
  const activeKits = activeKitIds.map(id => allKits.find(k => k.id === id)).filter(Boolean) as Kit[]

  // Collect all swaps in order; last kit wins per swapped item
  const swapMap = new Map<string, string>() // swapsItemId → new masterItemId
  for (const kit of activeKits) {
    for (const kitItem of kit.items) {
      if (kitItem.swapsItemId) swapMap.set(kitItem.swapsItemId, kitItem.masterItemId)
    }
  }

  // Apply exclusions to base items
  const result: TripItem[] = baseItems.map(item => ({
    ...item,
    isIncluded: item.masterItemId && swapMap.has(item.masterItemId)
      ? false
      : item.isIncluded,
  }))

  // Add new items from active kits (skip swapped-out items, skip duplicates)
  const existingIds = new Set(result.map(i => i.masterItemId))
  for (const kit of activeKits) {
    for (const kitItem of kit.items) {
      // Skip if this swap was overridden by a later kit (last kit wins)
      if (kitItem.swapsItemId && swapMap.get(kitItem.swapsItemId) !== kitItem.masterItemId) continue
      if (existingIds.has(kitItem.masterItemId)) continue
      result.push({
        id: uuid(),
        masterItemId: kitItem.masterItemId,
        name: kitItem.masterItemId, // caller resolves name from master
        qty: kitItem.qty,
        isIncluded: true,
        isPacked: false,
        isLastMinute: false,
        isEssential: false,
        category: 'Misc',
      })
      existingIds.add(kitItem.masterItemId)
    }
  }

  return result
}
