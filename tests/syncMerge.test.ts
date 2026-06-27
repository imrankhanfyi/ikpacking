import { describe, it, expect } from 'vitest'
import {
  pickWinner,
  mergeRecords,
  mergeData,
  liveOnly,
  canonicalJSON,
} from '../shared/syncMerge.mjs'

// Minimal record/trip builders — only the fields the merge cares about.
const rec = (id: string, updatedAt: string, extra: Record<string, unknown> = {}) =>
  ({ id, updatedAt, deletedAt: null, ...extra }) as any

const item = (id: string, updatedAt: string, isPacked: boolean, extra: Record<string, unknown> = {}) =>
  ({ id, updatedAt, deletedAt: null, isPacked, ...extra }) as any

const trip = (
  id: string,
  updatedAt: string,
  items: unknown[],
  extra: Record<string, unknown> = {},
) => ({ id, updatedAt, deletedAt: null, completedAt: null, items, ...extra }) as any

const data = (over: Record<string, unknown> = {}) =>
  ({ masterItems: [], kits: [], trips: [], ...over }) as any

// Compare two data docs by canonical form (order-independent).
const same = (a: unknown, b: unknown) => canonicalJSON(a) === canonicalJSON(b)

describe('pickWinner', () => {
  it('higher updatedAt wins', () => {
    const a = rec('x', '2026-01-01T00:00:00.000Z')
    const b = rec('x', '2026-02-01T00:00:00.000Z')
    expect(pickWinner(a, b)).toBe(b)
    expect(pickWinner(b, a)).toBe(b)
  })

  it('missing/invalid updatedAt coerces to epoch and loses', () => {
    const real = rec('x', '2020-01-01T00:00:00.000Z')
    const missing = rec('x', undefined as any)
    const invalid = rec('x', 'not-a-date')
    expect(pickWinner(real, missing)).toBe(real)
    expect(pickWinner(missing, real)).toBe(real)
    expect(pickWinner(real, invalid)).toBe(real)
  })

  it('equal timestamps tie-break deterministically and commutatively', () => {
    const a = rec('x', '2026-01-01T00:00:00.000Z', { v: 'aaa' })
    const b = rec('x', '2026-01-01T00:00:00.000Z', { v: 'zzz' })
    // Whichever wins, it must be the SAME regardless of argument order.
    expect(pickWinner(a, b)).toBe(pickWinner(b, a))
  })

  it('identical records return a fixpoint (a)', () => {
    const a = rec('x', '2026-01-01T00:00:00.000Z', { v: 1 })
    const b = rec('x', '2026-01-01T00:00:00.000Z', { v: 1 })
    expect(pickWinner(a, b)).toBe(a)
  })
})

describe('mergeRecords', () => {
  it('unions by id, server/incoming wins only when newer', () => {
    const base = [rec('a', '2026-01-01T00:00:00.000Z', { n: 'A' })]
    const incoming = [
      rec('a', '2026-02-01T00:00:00.000Z', { n: 'A2' }),
      rec('b', '2026-01-01T00:00:00.000Z', { n: 'B' }),
    ]
    const out = mergeRecords(base, incoming)
    expect(out.map(r => r.id)).toEqual(['a', 'b'])
    expect(out.find(r => r.id === 'a').n).toBe('A2')
  })

  it('older incoming does NOT clobber newer base (the data-loss bug)', () => {
    const base = [rec('a', '2026-02-01T00:00:00.000Z', { n: 'NEW' })]
    const stale = [rec('a', '2026-01-01T00:00:00.000Z', { n: 'OLD' })]
    expect(mergeRecords(base, stale)[0].n).toBe('NEW')
  })

  it('soft-delete (tombstone with newer updatedAt) beats an older edit', () => {
    const edited = [rec('a', '2026-01-01T00:00:00.000Z', { n: 'edit' })]
    const deleted = [rec('a', '2026-02-01T00:00:00.000Z', { deletedAt: '2026-02-01T00:00:00.000Z' })]
    const out = mergeRecords(edited, deleted)
    expect(out[0].deletedAt).toBe('2026-02-01T00:00:00.000Z')
    expect(liveOnly(out)).toHaveLength(0)
  })

  it('drops records without a string id', () => {
    const out = mergeRecords([rec('a', '2026-01-01T00:00:00.000Z')], [{ updatedAt: 'x' } as any])
    expect(out.map(r => r.id)).toEqual(['a'])
  })
})

describe('mergeData convergence', () => {
  it('is commutative: merge(a,b) canonical-equals merge(b,a)', () => {
    const a = data({
      masterItems: [rec('m1', '2026-01-02T00:00:00.000Z')],
      trips: [trip('t1', '2026-01-02T00:00:00.000Z', [item('i1', '2026-01-02T00:00:00.000Z', true)])],
    })
    const b = data({
      masterItems: [rec('m1', '2026-01-01T00:00:00.000Z'), rec('m2', '2026-01-01T00:00:00.000Z')],
      trips: [trip('t1', '2026-01-01T00:00:00.000Z', [item('i2', '2026-01-03T00:00:00.000Z', false)])],
    })
    expect(same(mergeData(a, b), mergeData(b, a))).toBe(true)
  })

  it('is idempotent / a fixpoint: re-merging a merged doc is a no-op', () => {
    const a = data({ trips: [trip('t1', '2026-01-02T00:00:00.000Z', [item('i1', '2026-01-02T00:00:00.000Z', true)])] })
    const b = data({ trips: [trip('t1', '2026-01-01T00:00:00.000Z', [item('i2', '2026-01-03T00:00:00.000Z', false)])] })
    const merged = mergeData(a, b)
    expect(same(mergeData(merged, merged), merged)).toBe(true)
    expect(same(mergeData(merged, b), merged)).toBe(true)
    expect(same(mergeData(a, merged), merged)).toBe(true)
  })
})

describe('per-item LWW within a trip', () => {
  it('a check-off on one device and a different check-off on the other BOTH survive', () => {
    // Same trip on two devices. Phone checks item A; laptop checks item B.
    const phone = data({
      trips: [trip('t1', '2026-01-01T00:00:00.000Z', [
        item('A', '2026-06-01T10:00:00.000Z', true),
        item('B', '2026-01-01T00:00:00.000Z', false),
      ])],
    })
    const laptop = data({
      trips: [trip('t1', '2026-01-01T00:00:00.000Z', [
        item('A', '2026-01-01T00:00:00.000Z', false),
        item('B', '2026-06-01T11:00:00.000Z', true),
      ])],
    })
    const merged = mergeData(phone, laptop)
    const items = Object.fromEntries(merged.trips[0].items.map((i: any) => [i.id, i.isPacked]))
    expect(items.A).toBe(true)
    expect(items.B).toBe(true)
  })
})

describe('the reported Montana bug', () => {
  it('a newer packed state survives, and a LATER stale save does not revert it', () => {
    // Phone packs the item at T2 (newer). Laptop still has it unpacked at T1.
    const phonePacked = data({
      trips: [trip('t1', '2026-06-10T00:00:00.000Z', [item('i1', '2026-06-10T12:00:00.000Z', true)])],
    })
    const laptopStale = data({
      trips: [trip('t1', '2026-06-01T00:00:00.000Z', [item('i1', '2026-06-01T00:00:00.000Z', false)])],
    })
    const merged = mergeData(phonePacked, laptopStale)
    expect(merged.trips[0].items[0].isPacked).toBe(true)

    // Now the stale laptop tab does a full save AFTER the merge — server merges
    // its stored (merged) doc with the stale incoming. Packed must NOT revert.
    const afterStaleSave = mergeData(merged, laptopStale)
    expect(afterStaleSave.trips[0].items[0].isPacked).toBe(true)
  })
})

describe('concurrent trip scalars + monotonic completedAt', () => {
  it('complete-on-A and rename-on-B both survive', () => {
    const a = data({
      trips: [trip('t1', '2026-06-02T00:00:00.000Z', [], {
        name: 'Montana', completedAt: '2026-06-02T00:00:00.000Z',
      })],
    })
    const b = data({
      trips: [trip('t1', '2026-06-03T00:00:00.000Z', [], { name: 'Montana Trip' })],
    })
    const merged = mergeData(a, b)
    // Newer scalar update (rename @ T3) wins the name...
    expect(merged.trips[0].name).toBe('Montana Trip')
    // ...but completion is monotonic and is NOT lost despite the older updatedAt.
    expect(merged.trips[0].completedAt).toBe('2026-06-02T00:00:00.000Z')
  })

  it('completedAt is preserved regardless of merge order', () => {
    const completed = data({ trips: [trip('t1', '2026-06-01T00:00:00.000Z', [], { completedAt: '2026-06-01T00:00:00.000Z' })] })
    const edited = data({ trips: [trip('t1', '2026-06-05T00:00:00.000Z', [], { completedAt: null })] })
    expect(mergeData(completed, edited).trips[0].completedAt).toBe('2026-06-01T00:00:00.000Z')
    expect(mergeData(edited, completed).trips[0].completedAt).toBe('2026-06-01T00:00:00.000Z')
  })
})

describe('trip-item tombstones', () => {
  it('a deleted trip item is not resurrected by an older edit, and stays gone', () => {
    const withItem = data({ trips: [trip('t1', '2026-01-01T00:00:00.000Z', [item('i1', '2026-01-01T00:00:00.000Z', false)])] })
    const deletedItem = data({ trips: [trip('t1', '2026-01-01T00:00:00.000Z', [
      item('i1', '2026-02-01T00:00:00.000Z', false, { deletedAt: '2026-02-01T00:00:00.000Z' }),
    ])] })
    const merged = mergeData(withItem, deletedItem)
    expect(merged.trips[0].items[0].deletedAt).toBe('2026-02-01T00:00:00.000Z')
    expect(liveOnly(merged.trips[0].items)).toHaveLength(0)
    // Re-merging the old "withItem" must not bring it back.
    const reMerged = mergeData(merged, withItem)
    expect(liveOnly(reMerged.trips[0].items)).toHaveLength(0)
  })
})

describe('single-sided trip normalization (fixpoint)', () => {
  it('sorts items of a trip present on only one side, so canon is stable', () => {
    // Trip exists only in `base`; its items are in non-id order.
    const d = data({
      trips: [trip('t1', '2026-01-01T00:00:00.000Z', [
        item('z-item', '2026-01-01T00:00:00.000Z', false),
        item('a-item', '2026-01-01T00:00:00.000Z', false),
      ])],
    })
    const merged = mergeData(d, {})
    expect(merged.trips[0].items.map((i: any) => i.id)).toEqual(['a-item', 'z-item'])
    // And it's a true fixpoint: re-canonicalizing changes nothing.
    expect(same(mergeData(merged, {}), merged)).toBe(true)
    expect(same(mergeData(d, {}), mergeData({}, d))).toBe(true)
  })
})

describe('liveOnly', () => {
  it('filters tombstones', () => {
    const out = liveOnly([rec('a', 't'), rec('b', 't', { deletedAt: '2026-01-01T00:00:00.000Z' })])
    expect(out.map(r => r.id)).toEqual(['a'])
  })
})
