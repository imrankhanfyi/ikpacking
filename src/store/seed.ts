// src/store/seed.ts
import type { MasterItem, Kit, KitItem } from '../types'
import { seedItemId, seedKitId, SEED_EPOCH } from '../../shared/seedIds.mjs'

// Seeds get DETERMINISTIC ids (seed-<slug> / kit-<slug>) derived from their name,
// so a storage wipe + reseed produces the SAME ids (no more library duplication).
// `updatedAt` is the epoch sentinel so any real user edit always wins on merge.
type SeedSpec = Omit<MasterItem, 'id' | 'updatedAt' | 'deletedAt'>

const mk = (spec: SeedSpec): MasterItem => ({
  ...spec,
  id: seedItemId(spec.name),
  updatedAt: SEED_EPOCH,
  deletedAt: null,
})

export const seedItems: MasterItem[] = [
  // Toiletries
  mk({ name: 'Razor', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Toothbrush', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Toothpaste', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Beard stuff', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Deodorant', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Hair clay', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Sea salt spray', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Scissors', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Coco oil', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Sunscreen', category: 'Toiletries', tags: ['warm-weather'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  // Meds
  mk({ name: 'Levothyroxin', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: true }),
  mk({ name: 'Minoxidil', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: true }),
  mk({ name: 'Ritalin', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: true }),
  mk({ name: 'Allergy pills', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Allergy spray', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Tretinoin', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Melatonin', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Good chat', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  // Clothing
  mk({ name: 'Pants', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'per-day', isLastMinute: false, isEssential: false }),
  mk({ name: 'T-shirts', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'per-day', isLastMinute: false, isEssential: false }),
  mk({ name: 'Underwear', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'per-day', isLastMinute: false, isEssential: false }),
  mk({ name: 'Socks', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'per-day', isLastMinute: false, isEssential: false }),
  mk({ name: 'PJs', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Shirts', category: 'Clothing', tags: ['business'], defaultQty: 2, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Hoodie', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Jumper', category: 'Clothing', tags: ['cold-weather'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Rain jacket', category: 'Clothing', tags: ['cold-weather'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Puffer jacket', category: 'Clothing', tags: ['cold-weather'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Boots', category: 'Clothing', tags: ['cold-weather'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Belt', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Sweatpants', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  // Electronics
  mk({ name: 'Laptop', category: 'Electronics', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: true, isEssential: true }),
  mk({ name: 'Laptop charger', category: 'Electronics', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: true, isEssential: true }),
  mk({ name: 'Charger bundle', category: 'Electronics', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: true, isEssential: true }),
  mk({ name: 'Backup charger', category: 'Electronics', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Airpods', category: 'Electronics', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Soundcore', category: 'Electronics', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Ebook', category: 'Electronics', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Mouse', category: 'Electronics', tags: ['business'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Extra screen', category: 'Electronics', tags: ['business'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  // Misc
  mk({ name: 'Sunglasses', category: 'Misc', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Cap', category: 'Misc', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Eye mask', category: 'Misc', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Water bottle', category: 'Misc', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Umbrella', category: 'Misc', tags: ['cold-weather'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Face masks', category: 'Misc', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Computer glasses', category: 'Misc', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
  mk({ name: 'Foldable bag', category: 'Misc', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false }),
]

// Kit item IDs are resolved against the seeded master items (deterministic now).
export function buildSeedKits(items: MasterItem[]): Kit[] {
  const find = (name: string) => items.find(i => i.name === name)?.id ?? ''
  const mkKit = (name: string, kitItems: KitItem[]): Kit => ({
    id: seedKitId(name),
    name,
    items: kitItems,
    updatedAt: SEED_EPOCH,
    deletedAt: null,
  })

  return [
    mkKit('International', [{ masterItemId: find('Laptop'), qty: 1 }]),
    mkKit('Gym/workout', [{ masterItemId: find('Soundcore'), qty: 1 }]),
    mkKit('Running', []),
    mkKit('Hiking', []),
    mkKit('Beach/warm', []),
  ]
}
