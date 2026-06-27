import { describe, it, expect } from 'vitest'
import { seedItems, buildSeedKits } from '../src/store/seed'
import {
  SEED_ITEM_NAMES,
  SEED_KIT_NAMES,
  seedItemId,
  seedKitId,
  SEED_EPOCH,
} from '../shared/seedIds.mjs'

const kits = buildSeedKits(seedItems)

describe('seed / seedIds agreement (drift guard)', () => {
  it('seed.ts item names match the shared SEED_ITEM_NAMES list exactly', () => {
    expect(seedItems.map(i => i.name)).toEqual(SEED_ITEM_NAMES)
  })

  it('seed.ts kit names match the shared SEED_KIT_NAMES list exactly', () => {
    expect(kits.map(k => k.name)).toEqual(SEED_KIT_NAMES)
  })

  it('every seed id is the deterministic id derived from its name', () => {
    for (const i of seedItems) expect(i.id).toBe(seedItemId(i.name))
    for (const k of kits) expect(k.id).toBe(seedKitId(k.name))
  })

  it('seed ids are unique (no slug collisions)', () => {
    const itemIds = seedItems.map(i => i.id)
    const kitIds = kits.map(k => k.id)
    expect(new Set(itemIds).size).toBe(itemIds.length)
    expect(new Set(kitIds).size).toBe(kitIds.length)
  })

  it('every seed carries epoch updatedAt and a null tombstone', () => {
    for (const i of seedItems) {
      expect(i.updatedAt).toBe(SEED_EPOCH)
      expect(i.deletedAt).toBeNull()
    }
    for (const k of kits) {
      expect(k.updatedAt).toBe(SEED_EPOCH)
      expect(k.deletedAt).toBeNull()
    }
  })

  it('kit item references resolve to existing seed item ids', () => {
    const ids = new Set(seedItems.map(i => i.id))
    for (const k of kits) {
      for (const ki of k.items) expect(ids.has(ki.masterItemId)).toBe(true)
    }
  })
})
