import { describe, it, expect } from 'vitest'
import { applyKits } from '../../src/lib/kitApply'
import { TripItem, Kit } from '../../src/types'

const makeItem = (id: string, name: string, overrides: Partial<TripItem> = {}): TripItem => ({
  id, masterItemId: id, name, qty: 1, isIncluded: true, isPacked: false,
  isLastMinute: false, isEssential: false, category: 'Misc', ...overrides
})

describe('applyKits', () => {
  it('adds kit items not already in list', () => {
    const items: TripItem[] = [makeItem('a', 'Laptop')]
    const kits: Kit[] = [{
      id: 'k1', name: 'International',
      items: [{ masterItemId: 'b', qty: 1 }]
    }]
    const result = applyKits(items, kits, ['k1'])
    expect(result.some(i => i.masterItemId === 'b')).toBe(true)
  })

  it('excludes swapped items', () => {
    const items: TripItem[] = [makeItem('laptop-main', 'Laptop')]
    const kits: Kit[] = [{
      id: 'k1', name: 'International',
      items: [{ masterItemId: 'laptop-burner', qty: 1, swapsItemId: 'laptop-main' }]
    }]
    const result = applyKits(items, kits, ['k1'])
    expect(result.find(i => i.masterItemId === 'laptop-main')?.isIncluded).toBe(false)
    expect(result.some(i => i.masterItemId === 'laptop-burner')).toBe(true)
  })

  it('last-activated kit wins on swap conflicts', () => {
    const items: TripItem[] = [makeItem('a', 'Base')]
    const kits: Kit[] = [
      { id: 'k1', name: 'Kit1', items: [{ masterItemId: 'x', qty: 1, swapsItemId: 'a' }] },
      { id: 'k2', name: 'Kit2', items: [{ masterItemId: 'y', qty: 1, swapsItemId: 'a' }] },
    ]
    const result = applyKits(items, kits, ['k1', 'k2'])
    expect(result.some(i => i.masterItemId === 'y')).toBe(true)
    expect(result.some(i => i.masterItemId === 'x')).toBe(false)
  })

  it('does not add kit items for inactive kits', () => {
    const items: TripItem[] = []
    const kits: Kit[] = [{ id: 'k1', name: 'Running', items: [{ masterItemId: 'shoes', qty: 1 }] }]
    const result = applyKits(items, kits, [])
    expect(result).toHaveLength(0)
  })
})
