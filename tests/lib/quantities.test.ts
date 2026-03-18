import { describe, it, expect } from 'vitest'
import { computeQty } from '../../src/lib/quantities'
import { MasterItem } from '../../src/types'

const makeItem = (overrides: Partial<MasterItem>): MasterItem => ({
  id: '1', name: 'Test', category: 'Misc', tags: ['always'],
  defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false,
  ...overrides,
})

describe('computeQty', () => {
  it('returns defaultQty for fixed items regardless of duration', () => {
    const item = makeItem({ defaultQty: 2, qtyBasis: 'fixed' })
    expect(computeQty(item, 10)).toBe(2)
  })

  it('multiplies per-day items by duration', () => {
    const item = makeItem({ defaultQty: 1, qtyBasis: 'per-day' })
    expect(computeQty(item, 5)).toBe(5)
  })

  it('rounds up per-day quantities (never leave without enough)', () => {
    const item = makeItem({ defaultQty: 1, qtyBasis: 'per-day' })
    expect(computeQty(item, 10)).toBe(10)  // exact
  })

  it('handles fractional duration by rounding up', () => {
    const item = makeItem({ defaultQty: 1, qtyBasis: 'per-day' })
    expect(computeQty(item, 10.5)).toBe(11)
  })

  it('caps per-day quantities at a reasonable max (14)', () => {
    const item = makeItem({ defaultQty: 1, qtyBasis: 'per-day' })
    expect(computeQty(item, 30)).toBe(14)
  })
})
