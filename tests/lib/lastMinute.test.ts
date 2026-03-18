import { describe, it, expect } from 'vitest'
import { computeLastMinuteItems } from '../../src/lib/lastMinute'
import { TripItem } from '../../src/types'

const makeItem = (overrides: Partial<TripItem> = {}): TripItem => ({
  id: '1', masterItemId: '1', name: 'Test', qty: 1,
  isIncluded: true, isPacked: false, isLastMinute: false,
  isEssential: false, category: 'Misc', ...overrides
})

const DEPARTURE_TODAY = new Date().toISOString().split('T')[0]
const DEPARTURE_TOMORROW = new Date(Date.now() + 86400000).toISOString().split('T')[0]

describe('computeLastMinuteItems', () => {
  it('always includes isLastMinute items', () => {
    const items = [makeItem({ id: '1', isLastMinute: true })]
    expect(computeLastMinuteItems(items, DEPARTURE_TODAY)).toHaveLength(1)
  })

  it('resurfaces unpacked items from main list on departure day', () => {
    const items = [makeItem({ id: '1', isPacked: false, isLastMinute: false })]
    expect(computeLastMinuteItems(items, DEPARTURE_TODAY)).toHaveLength(1)
  })

  it('does not resurface unpacked items before departure day', () => {
    const items = [makeItem({ id: '1', isPacked: false, isLastMinute: false })]
    expect(computeLastMinuteItems(items, DEPARTURE_TOMORROW)).toHaveLength(0)
  })

  it('does not resurface already-packed items', () => {
    const items = [makeItem({ id: '1', isPacked: true, isLastMinute: false })]
    expect(computeLastMinuteItems(items, DEPARTURE_TODAY)).toHaveLength(0)
  })

  it('does not include excluded items', () => {
    const items = [makeItem({ id: '1', isIncluded: false, isLastMinute: true })]
    expect(computeLastMinuteItems(items, DEPARTURE_TODAY)).toHaveLength(0)
  })
})
