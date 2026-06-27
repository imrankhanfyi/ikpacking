import { describe, it, expect, beforeEach, vi } from 'vitest'

// Each test gets a fresh store module so Zustand's module-level state doesn't bleed.
beforeEach(() => {
  const store: Record<string, string> = {}
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  })
  vi.resetModules()
})

// Helper: import a fresh store per test.
async function freshStore() {
  const { useStore } = await import('../../src/store/index')
  return useStore
}

describe('granularity: item-level vs trip-level mutations', () => {
  it('updateTripItem bumps item.updatedAt but NOT parent trip.updatedAt', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'))

    const useStore = await freshStore()

    // Create a trip with one item
    const tripId = useStore.getState().addTrip({
      name: 'Test trip',
      departureDate: '2026-03-01',
      profile: { duration: 3, weather: 'cold', type: 'leisure', mode: 'checked', nlDescription: '' },
      activeKitIds: [],
      items: [],
      completedAt: null,
    })

    // Add an item
    useStore.getState().addTripItem(tripId, {
      masterItemId: null, name: 'Toothbrush', qty: 1, isIncluded: true,
      isPacked: false, isLastMinute: false, isEssential: false, category: 'Toiletries',
    })

    const tripBefore = useStore.getState().trips.find(t => t.id === tripId)!
    const itemBefore = tripBefore.items[0]

    // Advance time so mutations get a different timestamp
    vi.setSystemTime(new Date('2026-01-01T11:00:00.000Z'))

    // Toggle isPacked — this is an item-level mutation
    useStore.getState().updateTripItem(tripId, itemBefore.id, { isPacked: true })

    const tripAfter = useStore.getState().trips.find(t => t.id === tripId)!
    const itemAfter = tripAfter.items.find(i => i.id === itemBefore.id)!

    expect(itemAfter.isPacked).toBe(true)
    // Item updatedAt must change
    expect(itemAfter.updatedAt).not.toBe(itemBefore.updatedAt)
    expect(itemAfter.updatedAt).toBe('2026-01-01T11:00:00.000Z')
    // Trip updatedAt must NOT change
    expect(tripAfter.updatedAt).toBe(tripBefore.updatedAt)

    vi.useRealTimers()
  })

  it('renameTrip bumps trip.updatedAt', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'))

    const useStore = await freshStore()

    const tripId = useStore.getState().addTrip({
      name: 'Old name',
      departureDate: '2026-03-01',
      profile: { duration: 3, weather: 'cold', type: 'leisure', mode: 'checked', nlDescription: '' },
      activeKitIds: [],
      items: [],
      completedAt: null,
    })

    const tripBefore = useStore.getState().trips.find(t => t.id === tripId)!

    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'))
    useStore.getState().renameTrip(tripId, 'New name')

    const tripAfter = useStore.getState().trips.find(t => t.id === tripId)!
    expect(tripAfter.name).toBe('New name')
    expect(tripAfter.updatedAt).toBe('2026-01-01T12:00:00.000Z')
    expect(tripAfter.updatedAt).not.toBe(tripBefore.updatedAt)

    vi.useRealTimers()
  })

  it('completeTrip bumps trip.updatedAt', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'))

    const useStore = await freshStore()

    const tripId = useStore.getState().addTrip({
      name: 'Test trip',
      departureDate: '2026-03-01',
      profile: { duration: 3, weather: 'cold', type: 'leisure', mode: 'checked', nlDescription: '' },
      activeKitIds: [],
      items: [],
      completedAt: null,
    })

    const tripBefore = useStore.getState().trips.find(t => t.id === tripId)!

    vi.setSystemTime(new Date('2026-01-01T13:00:00.000Z'))
    useStore.getState().completeTrip(tripId)

    const tripAfter = useStore.getState().trips.find(t => t.id === tripId)!
    expect(tripAfter.completedAt).toBe('2026-01-01T13:00:00.000Z')
    expect(tripAfter.updatedAt).toBe('2026-01-01T13:00:00.000Z')
    expect(tripAfter.updatedAt).not.toBe(tripBefore.updatedAt)

    vi.useRealTimers()
  })
})

describe('soft deletes (tombstones)', () => {
  it('deleteTrip sets deletedAt and trip stays in trips array; getActiveTrips excludes it', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-01T00:00:00.000Z'))

    const useStore = await freshStore()

    const tripId = useStore.getState().addTrip({
      name: 'Doomed trip',
      departureDate: '2026-04-01',
      profile: { duration: 3, weather: 'cold', type: 'leisure', mode: 'checked', nlDescription: '' },
      activeKitIds: [],
      items: [],
      completedAt: null,
    })

    useStore.getState().deleteTrip(tripId)

    const allTrips = useStore.getState().trips
    const tombstoned = allTrips.find(t => t.id === tripId)
    expect(tombstoned).toBeDefined()
    expect(tombstoned!.deletedAt).not.toBeNull()
    expect(tombstoned!.updatedAt).toBe('2026-02-01T00:00:00.000Z')

    const active = useStore.getState().getActiveTrips()
    expect(active.find(t => t.id === tripId)).toBeUndefined()

    vi.useRealTimers()
  })

  it('deleteKit sets deletedAt and kit stays in kits array; getActiveKits excludes it', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-01T00:00:00.000Z'))

    const useStore = await freshStore()

    useStore.getState().addKit({ name: 'Doomed kit', items: [] })
    const kitId = useStore.getState().kits.find(k => k.name === 'Doomed kit')!.id

    useStore.getState().deleteKit(kitId)

    const allKits = useStore.getState().kits
    const tombstoned = allKits.find(k => k.id === kitId)
    expect(tombstoned).toBeDefined()
    expect(tombstoned!.deletedAt).not.toBeNull()
    expect(tombstoned!.updatedAt).toBe('2026-02-01T00:00:00.000Z')

    const active = useStore.getState().getActiveKits()
    expect(active.find(k => k.id === kitId)).toBeUndefined()

    vi.useRealTimers()
  })

  it('removeTripItem sets item.deletedAt (item stays in array) and does NOT bump trip.updatedAt', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'))

    const useStore = await freshStore()

    const tripId = useStore.getState().addTrip({
      name: 'Test trip',
      departureDate: '2026-03-01',
      profile: { duration: 3, weather: 'cold', type: 'leisure', mode: 'checked', nlDescription: '' },
      activeKitIds: [],
      items: [],
      completedAt: null,
    })

    useStore.getState().addTripItem(tripId, {
      masterItemId: null, name: 'Razor', qty: 1, isIncluded: true,
      isPacked: false, isLastMinute: false, isEssential: false, category: 'Toiletries',
    })

    const tripBefore = useStore.getState().trips.find(t => t.id === tripId)!
    const itemId = tripBefore.items[0].id

    vi.setSystemTime(new Date('2026-01-01T11:30:00.000Z'))
    useStore.getState().removeTripItem(tripId, itemId)

    const tripAfter = useStore.getState().trips.find(t => t.id === tripId)!
    const item = tripAfter.items.find(i => i.id === itemId)!

    // Item is still in the array (soft-deleted, not hard-removed)
    expect(item).toBeDefined()
    expect(item.deletedAt).toBe('2026-01-01T11:30:00.000Z')
    expect(item.updatedAt).toBe('2026-01-01T11:30:00.000Z')

    // Trip.updatedAt must NOT be bumped
    expect(tripAfter.updatedAt).toBe(tripBefore.updatedAt)

    vi.useRealTimers()
  })
})

describe('new record fields', () => {
  it('addTripItem produces a record with non-empty updatedAt and deletedAt: null', async () => {
    const useStore = await freshStore()

    const tripId = useStore.getState().addTrip({
      name: 'Test trip',
      departureDate: '2026-03-01',
      profile: { duration: 3, weather: 'cold', type: 'leisure', mode: 'checked', nlDescription: '' },
      activeKitIds: [],
      items: [],
      completedAt: null,
    })

    useStore.getState().addTripItem(tripId, {
      masterItemId: null, name: 'Sunscreen', qty: 1, isIncluded: true,
      isPacked: false, isLastMinute: false, isEssential: false, category: 'Toiletries',
    })

    const item = useStore.getState().trips.find(t => t.id === tripId)!.items[0]
    expect(typeof item.updatedAt).toBe('string')
    expect(item.updatedAt.length).toBeGreaterThan(0)
    expect(item.deletedAt).toBeNull()
  })

  it('addMasterItem produces a record with non-empty updatedAt and deletedAt: null', async () => {
    const useStore = await freshStore()

    useStore.getState().addMasterItem({
      name: 'Snorkel', category: 'Misc', tags: ['always'],
      defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false,
    })

    const item = useStore.getState().masterItems.find(i => i.name === 'Snorkel')!
    expect(typeof item.updatedAt).toBe('string')
    expect(item.updatedAt.length).toBeGreaterThan(0)
    expect(item.deletedAt).toBeNull()
  })
})
