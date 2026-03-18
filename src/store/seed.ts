// src/store/seed.ts
import { MasterItem, Kit } from '../types'
import { v4 as uuid } from 'uuid'

export const seedItems: MasterItem[] = [
  // Toiletries
  { id: uuid(), name: 'Razor', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Toothbrush', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Toothpaste', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Beard stuff', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Deodorant', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Hair clay', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Sea salt spray', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Scissors', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Coco oil', category: 'Toiletries', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Sunscreen', category: 'Toiletries', tags: ['warm-weather'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  // Meds
  { id: uuid(), name: 'Levothyroxin', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: true },
  { id: uuid(), name: 'Minoxidil', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: true },
  { id: uuid(), name: 'Ritalin', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: true },
  { id: uuid(), name: 'Allergy pills', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Allergy spray', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Tretinoin', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Melatonin', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Good chat', category: 'Meds', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  // Clothing
  { id: uuid(), name: 'Pants', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'per-day', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'T-shirts', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'per-day', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Underwear', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'per-day', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Socks', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'per-day', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'PJs', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Shirts', category: 'Clothing', tags: ['business'], defaultQty: 2, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Hoodie', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Jumper', category: 'Clothing', tags: ['cold-weather'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Rain jacket', category: 'Clothing', tags: ['cold-weather'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Puffer jacket', category: 'Clothing', tags: ['cold-weather'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Boots', category: 'Clothing', tags: ['cold-weather'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Belt', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Sweatpants', category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  // Electronics
  { id: uuid(), name: 'Laptop', category: 'Electronics', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: true, isEssential: true },
  { id: uuid(), name: 'Laptop charger', category: 'Electronics', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: true, isEssential: true },
  { id: uuid(), name: 'Charger bundle', category: 'Electronics', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: true, isEssential: true },
  { id: uuid(), name: 'Backup charger', category: 'Electronics', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Airpods', category: 'Electronics', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Soundcore', category: 'Electronics', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Ebook', category: 'Electronics', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Mouse', category: 'Electronics', tags: ['business'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Extra screen', category: 'Electronics', tags: ['business'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  // Misc
  { id: uuid(), name: 'Sunglasses', category: 'Misc', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Cap', category: 'Misc', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Eye mask', category: 'Misc', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Water bottle', category: 'Misc', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Umbrella', category: 'Misc', tags: ['cold-weather'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Face masks', category: 'Misc', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Computer glasses', category: 'Misc', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
  { id: uuid(), name: 'Foldable bag', category: 'Misc', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false },
]

// Kit item IDs are resolved at runtime against the seeded master items
export function buildSeedKits(items: MasterItem[]): Kit[] {
  const find = (name: string) => items.find(i => i.name === name)?.id ?? ''

  return [
    {
      id: uuid(),
      name: 'International',
      items: [
        { masterItemId: find('Laptop'), qty: 1, swapsItemId: find('Laptop') },
      ],
    },
    {
      id: uuid(),
      name: 'Gym/workout',
      items: [
        { masterItemId: find('Soundcore'), qty: 1 },
      ],
    },
    {
      id: uuid(),
      name: 'Running',
      items: [],
    },
    {
      id: uuid(),
      name: 'Hiking',
      items: [],
    },
    {
      id: uuid(),
      name: 'Beach/warm',
      items: [],
    },
  ]
}
