import { describe, it, expect } from 'vitest'
import { filterItemsByProfile } from '../../src/lib/itemFilter'
import { MasterItem, TripProfile } from '../../src/types'

const makeItem = (overrides: Partial<MasterItem>): MasterItem => ({
  id: '1', name: 'Test', category: 'Misc', tags: ['always'],
  defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false,
  ...overrides,
})

const baseProfile: TripProfile = {
  duration: 5, weather: 'cold', type: 'business', mode: 'checked', nlDescription: ''
}

describe('filterItemsByProfile', () => {
  it('includes always-tagged items', () => {
    const items = [makeItem({ tags: ['always'] })]
    expect(filterItemsByProfile(items, baseProfile)).toHaveLength(1)
  })

  it('excludes warm-weather items on cold trips', () => {
    const items = [makeItem({ tags: ['warm-weather'] })]
    expect(filterItemsByProfile(items, baseProfile)).toHaveLength(0)
  })

  it('includes warm-weather items on warm trips', () => {
    const items = [makeItem({ tags: ['warm-weather'] })]
    const profile = { ...baseProfile, weather: 'warm' as const }
    expect(filterItemsByProfile(items, profile)).toHaveLength(1)
  })

  it('includes warm-weather items on mixed weather trips', () => {
    const items = [makeItem({ tags: ['warm-weather'] })]
    const profile = { ...baseProfile, weather: 'mixed' as const }
    expect(filterItemsByProfile(items, profile)).toHaveLength(1)
  })

  it('excludes business items on leisure trips', () => {
    const items = [makeItem({ tags: ['business'] })]
    const profile = { ...baseProfile, type: 'leisure' as const }
    expect(filterItemsByProfile(items, profile)).toHaveLength(0)
  })

  it('includes items with multiple tags if any match', () => {
    const items = [makeItem({ tags: ['cold-weather', 'business'] })]
    expect(filterItemsByProfile(items, baseProfile)).toHaveLength(1)
  })

  it('includes items with no tags (treated as always)', () => {
    const items = [makeItem({ tags: [] })]
    expect(filterItemsByProfile(items, baseProfile)).toHaveLength(1)
  })
})
