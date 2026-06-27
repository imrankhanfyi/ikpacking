// Single source of truth for SEED record identity. Imported by:
//   * src/store/seed.ts        — builds the seed objects with these ids
//   * src/store/index.ts (1.7) — persist migration re-keys old random ids -> these
//   * scripts/normalize-server-data.mjs (1.8) — re-keys the server's seeds -> these
// The node script can't import the TS seed file, so the canonical NAME lists live
// here; a test (tests/seed.test.ts) asserts seed.ts stays in agreement.
//
// Seeds historically got `uuid()` ids at module load, so a storage wipe reseeded
// with NEW ids and the union merge multiplied the library ("Razor" x2). Deriving
// the id deterministically from the name fixes that: a reseed produces the SAME id.

export function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function seedItemId(name) {
  return `seed-${slugify(name)}`
}

export function seedKitId(name) {
  return `kit-${slugify(name)}`
}

// Order mirrors seed.ts. Kept here (not derived from seed.ts) so the node
// normalize script has the list without importing TypeScript.
export const SEED_ITEM_NAMES = [
  // Toiletries
  'Razor', 'Toothbrush', 'Toothpaste', 'Beard stuff', 'Deodorant', 'Hair clay',
  'Sea salt spray', 'Scissors', 'Coco oil', 'Sunscreen',
  // Meds
  'Levothyroxin', 'Minoxidil', 'Ritalin', 'Allergy pills', 'Allergy spray',
  'Tretinoin', 'Melatonin', 'Good chat',
  // Clothing
  'Pants', 'T-shirts', 'Underwear', 'Socks', 'PJs', 'Shirts', 'Hoodie', 'Jumper',
  'Rain jacket', 'Puffer jacket', 'Boots', 'Belt', 'Sweatpants',
  // Electronics
  'Laptop', 'Laptop charger', 'Charger bundle', 'Backup charger', 'Airpods',
  'Soundcore', 'Ebook', 'Mouse', 'Extra screen',
  // Misc
  'Sunglasses', 'Cap', 'Eye mask', 'Water bottle', 'Umbrella', 'Face masks',
  'Computer glasses', 'Foldable bag',
]

export const SEED_KIT_NAMES = ['International', 'Gym/workout', 'Running', 'Hiking', 'Beach/warm']

// The epoch sentinel for seed `updatedAt`: any real user edit is newer and wins.
export const SEED_EPOCH = '1970-01-01T00:00:00.000Z'
