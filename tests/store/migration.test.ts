import { describe, it, expect, beforeEach, vi } from 'vitest'
import { migrateV1toV2 } from '../../src/store/index'
import { seedItemId, seedKitId, SEED_EPOCH } from '../../shared/seedIds.mjs'

// migrateV1toV2 is pure, but importing the store module touches localStorage.
beforeEach(() => {
  const store: Record<string, string> = {}
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  })
})

describe('migrateV1toV2', () => {
  it('re-keys seed master items by name to deterministic ids', () => {
    const v1 = {
      masterItems: [
        { id: 'random-uuid-1', name: 'Razor', category: 'Toiletries', tags: [], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
      ],
      kits: [], trips: [],
    }
    const out = migrateV1toV2(v1)
    expect(out.masterItems[0].id).toBe(seedItemId('Razor'))
    expect(out.masterItems[0].updatedAt).toBe(SEED_EPOCH)
    expect(out.masterItems[0].deletedAt).toBeNull()
  })

  it('keeps user-added (non-seed) items with their original id and a real updatedAt', () => {
    const v1 = {
      masterItems: [
        { id: 'user-xyz', name: 'Drone', category: 'Misc', tags: [], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
      ],
      kits: [], trips: [],
    }
    const out = migrateV1toV2(v1)
    expect(out.masterItems[0].id).toBe('user-xyz')
    expect(out.masterItems[0].updatedAt).not.toBe(SEED_EPOCH)
    expect(typeof out.masterItems[0].updatedAt).toBe('string')
  })

  it('remaps trip-item masterItemId FKs through the seed re-key (no orphans)', () => {
    const v1 = {
      masterItems: [
        { id: 'old-razor', name: 'Razor', category: 'Toiletries', tags: [], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
      ],
      kits: [],
      trips: [{
        id: 't1', name: 'Trip', createdAt: '2026-01-01T00:00:00.000Z', departureDate: '2026-02-01',
        completedAt: null, profile: {}, activeKitIds: [],
        items: [
          { id: 'ti1', masterItemId: 'old-razor', name: 'Razor', qty: 1, isIncluded: true, isPacked: false, isLastMinute: false, isEssential: false, category: 'Toiletries' },
          { id: 'ti2', masterItemId: null, name: 'One-off', qty: 1, isIncluded: true, isPacked: false, isLastMinute: false, isEssential: false, category: 'Misc' },
        ],
      }],
    }
    const out = migrateV1toV2(v1)
    const items = out.trips[0].items
    const razorItem = items.find((i: any) => i.id === 'ti1')
    expect(razorItem.masterItemId).toBe(seedItemId('Razor'))   // remapped to new id
    expect(items.find((i: any) => i.id === 'ti2').masterItemId).toBeNull() // one-off untouched
    // sync fields backfilled
    expect(razorItem.updatedAt).toBeTruthy()
    expect(razorItem.deletedAt).toBeNull()
    expect(out.trips[0].updatedAt).toBeTruthy()
    expect(out.trips[0].deletedAt).toBeNull()
  })

  it('remaps kit item refs and swaps through the seed re-key', () => {
    const v1 = {
      masterItems: [
        { id: 'old-laptop', name: 'Laptop', category: 'Electronics', tags: [], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
        { id: 'old-mouse', name: 'Mouse', category: 'Electronics', tags: [], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
      ],
      kits: [{ id: 'old-kit', name: 'International', items: [{ masterItemId: 'old-laptop', qty: 1, swapsItemId: 'old-mouse' }] }],
      trips: [],
    }
    const out = migrateV1toV2(v1)
    expect(out.kits[0].id).toBe(seedKitId('International'))
    expect(out.kits[0].items[0].masterItemId).toBe(seedItemId('Laptop'))
    expect(out.kits[0].items[0].swapsItemId).toBe(seedItemId('Mouse'))
  })

  it('heals duplicate seeds (two "Razor" with different ids collapse to one)', () => {
    const v1 = {
      masterItems: [
        { id: 'rand-a', name: 'Razor', category: 'Toiletries', tags: [], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
        { id: 'rand-b', name: 'Razor', category: 'Toiletries', tags: [], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
      ],
      kits: [], trips: [],
    }
    const out = migrateV1toV2(v1)
    const razors = out.masterItems.filter((i: any) => i.name === 'Razor')
    expect(razors).toHaveLength(1)
    expect(razors[0].id).toBe(seedItemId('Razor'))
  })

  it('preserves an existing soft-delete tombstone on a seed', () => {
    const v1 = {
      masterItems: [
        { id: 'old', name: 'Umbrella', category: 'Misc', tags: [], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false, deletedAt: '2026-03-01T00:00:00.000Z' },
      ],
      kits: [], trips: [],
    }
    const out = migrateV1toV2(v1)
    expect(out.masterItems[0].deletedAt).toBe('2026-03-01T00:00:00.000Z')
  })
})
