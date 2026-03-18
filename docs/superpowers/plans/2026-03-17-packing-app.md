# Packing App Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web app for managing packing lists with a master item library, reusable kits, AI-powered trip generation via OpenRouter, and a packing UX optimised for desktop use.

**Architecture:** React + Vite SPA with all data in localStorage via Zustand persist. Pure business logic (filtering, quantities, kit application) lives in `src/lib/` and is fully unit-tested. AI features call OpenRouter's OpenAI-compatible API directly from the browser. No backend.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Zustand + zustand/middleware persist, React Router v6, Vitest + React Testing Library, OpenRouter API (fetch, no SDK)

---

## File Map

```
src/
  main.tsx                        # Vite entry
  App.tsx                         # Router + layout shell
  types/index.ts                  # All TypeScript interfaces
  store/index.ts                  # Zustand store (master items, kits, trips, settings)
  store/seed.ts                   # Default master items seeded on first run
  lib/
    itemFilter.ts                 # Filter master items by trip profile + tags
    quantities.ts                 # Per-day rounding, kit quantity overrides
    kitApply.ts                   # Apply kits to item list, resolve swap conflicts
    lastMinute.ts                 # Compute last-minute section from items + departureDate
  ai/
    client.ts                     # OpenRouter fetch wrapper
    parseTrip.ts                  # NL description → TripProfile + suggested item list
    learnFromHistory.ts           # Completed trips → surfaced pattern suggestions
    importNotion.ts               # Pasted Notion markdown → master items
  components/
    trips/
      TripList.tsx                # Home screen — trip cards + new trip button
      TripCard.tsx                # Single trip card (name, date, status, progress)
      NewTripForm.tsx             # NL input + manual profile controls
      KitSuggestions.tsx          # Kit activation UI
      TripReview.tsx              # Review + tweak generated item list
    packing/
      PackingView.tsx             # Full packing screen (2-column)
      PackingColumn.tsx           # One column of categorised items
      PackingItem.tsx             # Item row: checkbox, name, qty badge, inline actions
      LastMinuteSection.tsx       # Last-minute zone (dashed separator, amber)
      EssentialsGate.tsx          # Modal: confirm essentials before closing trip
    manage/
      ManageLayout.tsx            # Settings shell with sub-nav
      MasterListView.tsx          # Browse + filter master items
      ItemForm.tsx                # Create/edit master item
      KitsView.tsx                # Browse kits
      KitForm.tsx                 # Create/edit kit (items, quantities, swaps)
      TagsView.tsx                # Tag overview + global rename
      ExportImport.tsx            # JSON export/import
      ApiSettings.tsx             # OpenRouter API key
      NotionImport.tsx            # Paste Notion markdown → review → import
    common/
      QtyBadge.tsx                # ×3 inline badge
      ProgressBar.tsx             # N/total progress bar
      TagChip.tsx                 # Tag chip
      Modal.tsx                   # Reusable modal wrapper
tests/
  lib/
    itemFilter.test.ts
    quantities.test.ts
    kitApply.test.ts
    lastMinute.test.ts
  ai/
    parseTrip.test.ts
```

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `src/main.tsx`, `src/App.tsx`, `index.html`

- [ ] **Step 1: Scaffold Vite project**
```bash
cd /Users/imran/Projects/Packing
npm create vite@latest . -- --template react-ts
npm install
```

- [ ] **Step 2: Install dependencies**
```bash
npm install zustand react-router-dom
npm install -D tailwindcss postcss autoprefixer vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind** — edit `tailwind.config.ts`:
```ts
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```
Add to `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Configure Vitest** — add to `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
```
Create `src/test-setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Stub App.tsx**
```tsx
export default function App() {
  return <div className="min-h-screen bg-slate-950 text-slate-100 p-4">Packing App</div>
}
```

- [ ] **Step 6: Verify it runs**
```bash
npm run dev
```
Expected: browser shows dark page with "Packing App"

- [ ] **Step 7: Commit**
```bash
git init
git add -A
git commit -m "feat: scaffold Vite + React + TS + Tailwind + Vitest"
```

---

## Task 2: TypeScript types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write types**
```ts
// src/types/index.ts

export type QtyBasis = 'fixed' | 'per-day'
export type Weather = 'cold' | 'warm' | 'mixed'
export type TripType = 'business' | 'leisure' | 'mixed'
export type TripMode = 'road-trip' | 'carry-on' | 'checked'

export interface MasterItem {
  id: string
  name: string
  category: string
  tags: string[]
  defaultQty: number
  qtyBasis: QtyBasis
  isLastMinute: boolean
  isEssential: boolean
}

export interface KitItem {
  masterItemId: string
  qty: number
  swapsItemId?: string  // this kit item replaces another master item
}

export interface Kit {
  id: string
  name: string
  items: KitItem[]
}

export interface TripProfile {
  duration: number
  weather: Weather
  type: TripType
  mode: TripMode
  nlDescription: string
}

export interface TripItem {
  id: string
  masterItemId: string | null  // null = one-off
  name: string
  qty: number
  isIncluded: boolean
  isPacked: boolean
  isLastMinute: boolean
  isEssential: boolean
  category: string
}

export interface Trip {
  id: string
  name: string
  createdAt: string        // ISO date string
  departureDate: string    // ISO date string — drives last-minute logic
  completedAt: string | null
  profile: TripProfile
  activeKitIds: string[]
  items: TripItem[]
}

export interface AppSettings {
  openRouterApiKey: string
  hasCompletedOnboarding: boolean
}

export interface PatternSuggestion {
  type: 'remove-default' | 'promote-to-master' | 'adjust-qty'
  itemName: string
  message: string
  tripCount: number
}
```

- [ ] **Step 2: Commit**
```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions"
```

---

## Task 3: Zustand store + seed data

**Files:**
- Create: `src/store/index.ts`, `src/store/seed.ts`

- [ ] **Step 1: Write seed data** — a starter master list derived from user's Notion history:
```ts
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
// Kits are seeded separately after items are created so we can reference IDs
export function buildSeedKits(items: MasterItem[]): Kit[] {
  const find = (name: string) => items.find(i => i.name === name)?.id ?? ''

  return [
    {
      id: uuid(),
      name: 'International',
      items: [
        { masterItemId: find('Laptop'), qty: 1, swapsItemId: find('Laptop') }, // burner swaps main — implementer note: the "burner laptop" variant is a one-off added by the kit; the swap removes the regular Laptop item
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
```

Note: Kit item lists above are stubs — the full kit contents reference items not in the master list (trail shoes, daypack etc). These will be populated by the user after first run via the Kit management UI, or during Notion import. Do not attempt to auto-generate kit items beyond what's shown.

- [ ] **Step 2: Install uuid**
```bash
npm install uuid
npm install -D @types/uuid
```

- [ ] **Step 3: Write Zustand store**
```ts
// src/store/index.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MasterItem, Kit, Trip, TripItem, AppSettings, PatternSuggestion } from '../types'
import { seedItems, buildSeedKits } from './seed'
import { v4 as uuid } from 'uuid'

interface AppStore {
  // Data
  masterItems: MasterItem[]
  kits: Kit[]
  trips: Trip[]
  settings: AppSettings
  pendingSuggestions: PatternSuggestion[]

  // Master item actions
  addMasterItem: (item: Omit<MasterItem, 'id'>) => void
  updateMasterItem: (id: string, updates: Partial<MasterItem>) => void
  deleteMasterItem: (id: string) => void
  renameTag: (oldTag: string, newTag: string) => void

  // Kit actions
  addKit: (kit: Omit<Kit, 'id'>) => void
  updateKit: (id: string, updates: Partial<Kit>) => void
  deleteKit: (id: string) => void

  // Trip actions
  addTrip: (trip: Omit<Trip, 'id' | 'createdAt'>) => string
  updateTrip: (id: string, updates: Partial<Trip>) => void
  updateTripItem: (tripId: string, itemId: string, updates: Partial<TripItem>) => void
  addTripItem: (tripId: string, item: Omit<TripItem, 'id'>) => void
  removeTripItem: (tripId: string, itemId: string) => void
  completeTrip: (id: string) => void

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void

  // Suggestions
  setSuggestions: (suggestions: PatternSuggestion[]) => void
  dismissSuggestion: (index: number) => void

  // Export / Import
  exportData: () => string
  importData: (json: string) => void
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      masterItems: seedItems,
      kits: buildSeedKits(seedItems),
      trips: [],
      settings: { openRouterApiKey: '', hasCompletedOnboarding: false },
      pendingSuggestions: [],

      addMasterItem: (item) => set(s => ({
        masterItems: [...s.masterItems, { ...item, id: uuid() }]
      })),

      updateMasterItem: (id, updates) => set(s => ({
        masterItems: s.masterItems.map(i => i.id === id ? { ...i, ...updates } : i)
      })),

      deleteMasterItem: (id) => set(s => ({
        masterItems: s.masterItems.filter(i => i.id !== id)
      })),

      renameTag: (oldTag, newTag) => set(s => ({
        masterItems: s.masterItems.map(i => ({
          ...i,
          tags: i.tags.map(t => t === oldTag ? newTag : t)
        }))
      })),

      addKit: (kit) => set(s => ({
        kits: [...s.kits, { ...kit, id: uuid() }]
      })),

      updateKit: (id, updates) => set(s => ({
        kits: s.kits.map(k => k.id === id ? { ...k, ...updates } : k)
      })),

      deleteKit: (id) => set(s => ({
        kits: s.kits.filter(k => k.id !== id)
      })),

      addTrip: (trip) => {
        const id = uuid()
        set(s => ({
          trips: [...s.trips, { ...trip, id, createdAt: new Date().toISOString() }]
        }))
        return id
      },

      updateTrip: (id, updates) => set(s => ({
        trips: s.trips.map(t => t.id === id ? { ...t, ...updates } : t)
      })),

      updateTripItem: (tripId, itemId, updates) => set(s => ({
        trips: s.trips.map(t =>
          t.id === tripId
            ? { ...t, items: t.items.map(i => i.id === itemId ? { ...i, ...updates } : i) }
            : t
        )
      })),

      addTripItem: (tripId, item) => set(s => ({
        trips: s.trips.map(t =>
          t.id === tripId
            ? { ...t, items: [...t.items, { ...item, id: uuid() }] }
            : t
        )
      })),

      removeTripItem: (tripId, itemId) => set(s => ({
        trips: s.trips.map(t =>
          t.id === tripId
            ? { ...t, items: t.items.filter(i => i.id !== itemId) }
            : t
        )
      })),

      completeTrip: (id) => set(s => ({
        trips: s.trips.map(t =>
          t.id === id ? { ...t, completedAt: new Date().toISOString() } : t
        )
      })),

      updateSettings: (updates) => set(s => ({
        settings: { ...s.settings, ...updates }
      })),

      setSuggestions: (suggestions) => set({ pendingSuggestions: suggestions }),

      dismissSuggestion: (index) => set(s => ({
        pendingSuggestions: s.pendingSuggestions.filter((_, i) => i !== index)
      })),

      exportData: () => {
        const { masterItems, kits, trips, settings } = get()
        return JSON.stringify({ masterItems, kits, trips, settings }, null, 2)
      },

      importData: (json) => {
        const data = JSON.parse(json)
        set({
          masterItems: data.masterItems ?? [],
          kits: data.kits ?? [],
          trips: data.trips ?? [],
          settings: data.settings ?? { openRouterApiKey: '', hasCompletedOnboarding: false },
        })
      },
    }),
    { name: 'packing-app-store' }
  )
)
```

- [ ] **Step 4: Commit**
```bash
git add src/store/
git commit -m "feat: Zustand store with localStorage persistence + seed data"
```

---

## Task 4: Core business logic — item filtering + quantities

**Files:**
- Create: `src/lib/itemFilter.ts`, `src/lib/quantities.ts`
- Create: `tests/lib/itemFilter.test.ts`, `tests/lib/quantities.test.ts`

- [ ] **Step 1: Write failing tests for itemFilter**
```ts
// tests/lib/itemFilter.test.ts
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
```

- [ ] **Step 2: Run test — expect FAIL**
```bash
npx vitest run tests/lib/itemFilter.test.ts
```

- [ ] **Step 3: Implement itemFilter**
```ts
// src/lib/itemFilter.ts
import { MasterItem, TripProfile } from '../types'

const WEATHER_TAGS: Record<string, string[]> = {
  cold: ['cold-weather'],
  warm: ['warm-weather'],
  mixed: ['cold-weather', 'warm-weather'],
}

const TYPE_TAGS: Record<string, string[]> = {
  business: ['business'],
  leisure: ['leisure'],
  mixed: ['business', 'leisure'],
}

export function filterItemsByProfile(items: MasterItem[], profile: TripProfile): MasterItem[] {
  const allowedTags = new Set([
    'always',
    ...WEATHER_TAGS[profile.weather],
    ...TYPE_TAGS[profile.type],
  ])

  return items.filter(item => {
    if (item.tags.length === 0) return true
    return item.tags.some(tag => allowedTags.has(tag))
  })
}
```

- [ ] **Step 4: Run tests — expect PASS**
```bash
npx vitest run tests/lib/itemFilter.test.ts
```

- [ ] **Step 5: Write failing tests for quantities**
```ts
// tests/lib/quantities.test.ts
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
    // 1.5 week = 10.5 days → ceil → 11
    const item = makeItem({ defaultQty: 1, qtyBasis: 'per-day' })
    expect(computeQty(item, 10.5)).toBe(11)
  })

  it('caps per-day quantities at a reasonable max (14)', () => {
    const item = makeItem({ defaultQty: 1, qtyBasis: 'per-day' })
    expect(computeQty(item, 30)).toBe(14)
  })
})
```

- [ ] **Step 6: Run test — expect FAIL**
```bash
npx vitest run tests/lib/quantities.test.ts
```

- [ ] **Step 7: Implement quantities**
```ts
// src/lib/quantities.ts
import { MasterItem } from '../types'

const PER_DAY_CAP = 14

export function computeQty(item: MasterItem, durationDays: number): number {
  if (item.qtyBasis === 'fixed') return item.defaultQty
  return Math.min(Math.ceil(item.defaultQty * durationDays), PER_DAY_CAP)
}
```

- [ ] **Step 8: Run tests — expect PASS**
```bash
npx vitest run tests/lib/
```

- [ ] **Step 9: Commit**
```bash
git add src/lib/itemFilter.ts src/lib/quantities.ts tests/lib/
git commit -m "feat: item filtering and quantity computation with tests"
```

---

## Task 5: Kit application logic

**Files:**
- Create: `src/lib/kitApply.ts`, `tests/lib/kitApply.test.ts`

- [ ] **Step 1: Write failing tests**
```ts
// tests/lib/kitApply.test.ts
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
    // k2 wins: y is included, x is not
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
```

- [ ] **Step 2: Run — expect FAIL**
```bash
npx vitest run tests/lib/kitApply.test.ts
```

- [ ] **Step 3: Implement**
```ts
// src/lib/kitApply.ts
import { TripItem, Kit } from '../types'
import { v4 as uuid } from 'uuid'

export function applyKits(baseItems: TripItem[], allKits: Kit[], activeKitIds: string[]): TripItem[] {
  const activeKits = activeKitIds.map(id => allKits.find(k => k.id === id)).filter(Boolean) as Kit[]

  // Collect all swaps in order; last kit wins per swapped item
  const swapMap = new Map<string, string>() // swapsItemId → new masterItemId
  for (const kit of activeKits) {
    for (const kitItem of kit.items) {
      if (kitItem.swapsItemId) swapMap.set(kitItem.swapsItemId, kitItem.masterItemId)
    }
  }

  // Apply exclusions to base items
  const result: TripItem[] = baseItems.map(item => ({
    ...item,
    isIncluded: item.masterItemId && swapMap.has(item.masterItemId)
      ? false
      : item.isIncluded,
  }))

  // Add new items from active kits (skip swapped-out items, skip duplicates)
  const existingIds = new Set(result.map(i => i.masterItemId))
  for (const kit of activeKits) {
    for (const kitItem of kit.items) {
      // Skip if this swap was overridden by a later kit (last kit wins)
      if (kitItem.swapsItemId && swapMap.get(kitItem.swapsItemId) !== kitItem.masterItemId) continue
      if (existingIds.has(kitItem.masterItemId)) continue
      result.push({
        id: uuid(),
        masterItemId: kitItem.masterItemId,
        name: kitItem.masterItemId, // caller resolves name from master
        qty: kitItem.qty,
        isIncluded: true,
        isPacked: false,
        isLastMinute: false,
        isEssential: false,
        category: 'Misc',
      })
      existingIds.add(kitItem.masterItemId)
    }
  }

  return result
}
```

- [ ] **Step 4: Run — expect PASS**
```bash
npx vitest run tests/lib/kitApply.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add src/lib/kitApply.ts tests/lib/kitApply.test.ts
git commit -m "feat: kit application logic with swap conflict resolution"
```

---

## Task 6: Last-minute section logic

**Files:**
- Create: `src/lib/lastMinute.ts`, `tests/lib/lastMinute.test.ts`

- [ ] **Step 1: Write failing tests**
```ts
// tests/lib/lastMinute.test.ts
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
```

- [ ] **Step 2: Run — expect FAIL**
```bash
npx vitest run tests/lib/lastMinute.test.ts
```

- [ ] **Step 3: Implement**
```ts
// src/lib/lastMinute.ts
import { TripItem } from '../types'

export function computeLastMinuteItems(items: TripItem[], departureDate: string): TripItem[] {
  const today = new Date().toISOString().split('T')[0]
  const isDepartureDay = today >= departureDate

  return items.filter(item => {
    if (!item.isIncluded) return false
    if (item.isPacked) return false
    if (item.isLastMinute) return true
    if (isDepartureDay && !item.isPacked) return true
    return false
  })
}
```

- [ ] **Step 4: Run — expect PASS**
```bash
npx vitest run tests/lib/lastMinute.test.ts
```

- [ ] **Step 5: Run all lib tests**
```bash
npx vitest run tests/lib/
```
Expected: all pass

- [ ] **Step 6: Commit**
```bash
git add src/lib/lastMinute.ts tests/lib/lastMinute.test.ts
git commit -m "feat: last-minute item computation with departure date logic"
```

---

## Task 7: Common components

**Files:**
- Create: `src/components/common/Modal.tsx`, `src/components/common/QtyBadge.tsx`, `src/components/common/ProgressBar.tsx`, `src/components/common/TagChip.tsx`

- [ ] **Step 1: Modal**
```tsx
// src/components/common/Modal.tsx
interface ModalProps { title: string; onClose: () => void; children: React.ReactNode }

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: QtyBadge**
```tsx
// src/components/common/QtyBadge.tsx
interface QtyBadgeProps { qty: number; onEdit?: (qty: number) => void }

export function QtyBadge({ qty, onEdit }: QtyBadgeProps) {
  if (qty <= 1) return null
  return (
    <span
      className="inline-block bg-slate-800 text-indigo-400 text-xs font-bold rounded px-1.5 py-0.5 ml-1 cursor-pointer hover:bg-slate-700"
      onClick={() => {
        if (!onEdit) return
        const val = prompt('Quantity:', String(qty))
        if (val && !isNaN(Number(val))) onEdit(Number(val))
      }}
    >
      ×{qty}
    </span>
  )
}
```

- [ ] **Step 3: ProgressBar**
```tsx
// src/components/common/ProgressBar.tsx
interface ProgressBarProps { packed: number; total: number }

export function ProgressBar({ packed, total }: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((packed / total) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 tabular-nums">{packed} / {total}</span>
    </div>
  )
}
```

- [ ] **Step 4: TagChip**
```tsx
// src/components/common/TagChip.tsx
const TAG_COLOURS: Record<string, string> = {
  always: 'bg-slate-700 text-slate-300',
  'cold-weather': 'bg-blue-900 text-blue-300',
  'warm-weather': 'bg-amber-900 text-amber-300',
  business: 'bg-violet-900 text-violet-300',
  leisure: 'bg-green-900 text-green-300',
}

export function TagChip({ tag }: { tag: string }) {
  const colour = TAG_COLOURS[tag] ?? 'bg-slate-700 text-slate-300'
  return <span className={`text-xs rounded-full px-2 py-0.5 ${colour}`}>{tag}</span>
}
```

- [ ] **Step 5: Commit**
```bash
git add src/components/common/
git commit -m "feat: common UI components (Modal, QtyBadge, ProgressBar, TagChip)"
```

---

## Task 8: Trip list home screen

**Files:**
- Create: `src/components/trips/TripList.tsx`, `src/components/trips/TripCard.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: TripCard**
```tsx
// src/components/trips/TripCard.tsx
import { Trip } from '../../types'
import { ProgressBar } from '../common/ProgressBar'
import { Link } from 'react-router-dom'

export function TripCard({ trip }: { trip: Trip }) {
  const included = trip.items.filter(i => i.isIncluded)
  const packed = included.filter(i => i.isPacked)
  const isComplete = !!trip.completedAt
  const isActive = !isComplete

  return (
    <Link to={`/trip/${trip.id}`} className="block bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-slate-100">{trip.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{trip.departureDate} · {trip.profile.duration}d · {trip.profile.weather} · {trip.profile.type}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${isComplete ? 'bg-slate-800 text-slate-500' : 'bg-indigo-900 text-indigo-300'}`}>
          {isComplete ? 'done' : 'packing'}
        </span>
      </div>
      {isActive && <ProgressBar packed={packed.length} total={included.length} />}
    </Link>
  )
}
```

- [ ] **Step 2: TripList**
```tsx
// src/components/trips/TripList.tsx
import { useStore } from '../../store'
import { TripCard } from './TripCard'
import { Link } from 'react-router-dom'

export function TripList() {
  const trips = useStore(s => s.trips)
  const active = trips.filter(t => !t.completedAt).sort((a, b) => a.departureDate.localeCompare(b.departureDate))
  const past = trips.filter(t => t.completedAt).sort((a, b) => b.departureDate.localeCompare(a.departureDate))

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Trips</h1>
        <div className="flex gap-2">
          <Link to="/manage" className="text-sm text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700">Manage</Link>
          <Link to="/trip/new" className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg">+ New trip</Link>
        </div>
      </div>

      {active.length === 0 && past.length === 0 && (
        <p className="text-slate-500 text-center py-12">No trips yet. <Link to="/trip/new" className="text-indigo-400 underline">Plan one.</Link></p>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Upcoming</h2>
          <div className="space-y-2">{active.map(t => <TripCard key={t.id} trip={t} />)}</div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Past trips</h2>
          <div className="space-y-2">{past.map(t => <TripCard key={t.id} trip={t} />)}</div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Wire up routing in App.tsx**
```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TripList } from './components/trips/TripList'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Routes>
          <Route path="/" element={<TripList />} />
          {/* Additional routes added in later tasks */}
        </Routes>
      </div>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Verify in browser**
```bash
npm run dev
```
Expected: home screen with "Trips" heading and "+ New trip" button

- [ ] **Step 5: Commit**
```bash
git add src/components/trips/ src/App.tsx
git commit -m "feat: trip list home screen with routing"
```

---

## Task 9: Trip creation — new trip form

**Files:**
- Create: `src/components/trips/NewTripForm.tsx`, `src/components/trips/KitSuggestions.tsx`, `src/components/trips/TripReview.tsx`
- Create: `src/lib/generateTripItems.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: generateTripItems helper**
```ts
// src/lib/generateTripItems.ts
import { MasterItem, TripItem, TripProfile } from '../types'
import { filterItemsByProfile } from './itemFilter'
import { computeQty } from './quantities'
import { v4 as uuid } from 'uuid'

export function generateTripItems(masterItems: MasterItem[], profile: TripProfile): TripItem[] {
  return filterItemsByProfile(masterItems, profile).map(item => ({
    id: uuid(),
    masterItemId: item.id,
    name: item.name,
    qty: computeQty(item, profile.duration),
    isIncluded: true,
    isPacked: false,
    isLastMinute: item.isLastMinute,
    isEssential: item.isEssential,
    category: item.category,
  }))
}
```

- [ ] **Step 2: NewTripForm** — manual profile entry (NL input wired in Task 13):
```tsx
// src/components/trips/NewTripForm.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TripProfile, Weather, TripType, TripMode } from '../../types'
import { useStore } from '../../store'
import { generateTripItems } from '../../lib/generateTripItems'

const DEFAULT_PROFILE: TripProfile = {
  duration: 5, weather: 'cold', type: 'leisure', mode: 'checked', nlDescription: ''
}

export function NewTripForm() {
  const [profile, setProfile] = useState<TripProfile>(DEFAULT_PROFILE)
  const [name, setName] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [step, setStep] = useState<'form' | 'kits' | 'review'>('form')
  const masterItems = useStore(s => s.masterItems)
  const kits = useStore(s => s.kits)
  const addTrip = useStore(s => s.addTrip)
  const navigate = useNavigate()

  const [generatedItems, setGeneratedItems] = useState(generateTripItems(masterItems, profile))
  const [activeKitIds, setActiveKitIds] = useState<string[]>([])

  function handleGenerate() {
    setGeneratedItems(generateTripItems(masterItems, profile))
    setStep('kits')
  }

  function handleSave() {
    const id = addTrip({ name: name || `Trip ${departureDate}`, departureDate, profile, activeKitIds, items: generatedItems, completedAt: null })
    navigate(`/trip/${id}`)
  }

  if (step === 'kits') {
    return (
      <div className="max-w-lg mx-auto p-6 space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Suggested kits</h2>
        <p className="text-sm text-slate-400">Add any kits relevant to this trip.</p>
        {kits.map(kit => (
          <div key={kit.id} className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div>
              <p className="font-medium text-slate-200">{kit.name}</p>
              <p className="text-xs text-slate-500">{kit.items.length} items</p>
            </div>
            <button
              onClick={() => setActiveKitIds(ids => ids.includes(kit.id) ? ids.filter(i => i !== kit.id) : [...ids, kit.id])}
              className={`px-3 py-1 text-sm rounded-lg ${activeKitIds.includes(kit.id) ? 'bg-green-800 text-green-300' : 'bg-slate-800 text-slate-400'}`}
            >
              {activeKitIds.includes(kit.id) ? '✓ Added' : '+ Add'}
            </button>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <button onClick={() => setStep('form')} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400">← Back</button>
          <button onClick={() => setStep('review')} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white">Review list →</button>
        </div>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="max-w-lg mx-auto p-6 space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Review your list</h2>
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {generatedItems.filter(i => i.isIncluded).map(item => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-800">
              <span className="text-slate-200">{item.name}{item.qty > 1 && <span className="ml-1 text-xs bg-slate-800 text-indigo-400 px-1.5 py-0.5 rounded">×{item.qty}</span>}</span>
              <button onClick={() => setGeneratedItems(items => items.map(i => i.id === item.id ? { ...i, isIncluded: false } : i))} className="text-xs text-slate-600 hover:text-red-400">remove</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={() => setStep('kits')} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400">← Back</button>
          <button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-semibold">Save trip →</button>
        </div>
      </div>
    )
  }

  // step === 'form'
  return (
    <div className="max-w-lg mx-auto p-6 space-y-4">
      <h2 className="text-xl font-bold text-slate-100">New trip</h2>

      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider">Trip name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Edinburgh Mar 26" className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500" />
      </div>

      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider">Departure date</label>
        <input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500" />
      </div>

      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider">Duration (days)</label>
        <input type="number" min={1} max={90} value={profile.duration} onChange={e => setProfile(p => ({ ...p, duration: Number(e.target.value) }))} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500" />
      </div>

      {[
        { label: 'Weather', key: 'weather', options: ['cold', 'warm', 'mixed'] },
        { label: 'Type', key: 'type', options: ['business', 'leisure', 'mixed'] },
        { label: 'Mode', key: 'mode', options: ['checked', 'carry-on', 'road-trip'] },
      ].map(({ label, key, options }) => (
        <div key={key}>
          <label className="text-xs text-slate-400 uppercase tracking-wider">{label}</label>
          <div className="flex gap-2 mt-1">
            {options.map(opt => (
              <button key={opt} onClick={() => setProfile(p => ({ ...p, [key]: opt }))}
                className={`flex-1 py-1.5 rounded-lg text-sm capitalize ${(profile as any)[key] === opt ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
              >{opt}</button>
            ))}
          </div>
        </div>
      ))}

      <button onClick={handleGenerate} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold">Generate list →</button>
    </div>
  )
}
```

- [ ] **Step 3: Add route in App.tsx**
```tsx
import { NewTripForm } from './components/trips/NewTripForm'
// Inside <Routes>:
<Route path="/trip/new" element={<NewTripForm />} />
```

- [ ] **Step 4: Verify flow in browser** — create a test trip end-to-end

- [ ] **Step 5: Commit**
```bash
git add src/components/trips/NewTripForm.tsx src/lib/generateTripItems.ts src/App.tsx
git commit -m "feat: trip creation flow — profile form, kit selection, list review"
```

---

## Task 10: Packing view

**Files:**
- Create: `src/components/packing/PackingView.tsx`, `src/components/packing/PackingItem.tsx`, `src/components/packing/PackingColumn.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: PackingItem**
```tsx
// src/components/packing/PackingItem.tsx
import { TripItem } from '../../types'
import { QtyBadge } from '../common/QtyBadge'

interface Props {
  item: TripItem
  onToggle: () => void
  onQtyChange: (qty: number) => void
  onRemove: () => void
}

export function PackingItem({ item, onToggle, onQtyChange, onRemove }: Props) {
  return (
    <div className={`flex items-center gap-2 py-1.5 border-b border-slate-900 group ${item.isPacked ? 'opacity-40' : ''}`}>
      <button onClick={onToggle}
        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${item.isPacked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-600'}`}
      >{item.isPacked && '✓'}</button>
      <span className={`text-sm flex-1 ${item.isPacked ? 'line-through text-slate-500' : 'text-slate-200'}`}>
        {item.name}
        <QtyBadge qty={item.qty} onEdit={onQtyChange} />
      </span>
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-xs text-slate-600 hover:text-red-400 transition-opacity">✕</button>
    </div>
  )
}
```

- [ ] **Step 2: PackingColumn**
```tsx
// src/components/packing/PackingColumn.tsx
import { TripItem } from '../../types'
import { PackingItem } from './PackingItem'

interface Props {
  categories: string[]
  items: TripItem[]
  onToggle: (id: string) => void
  onQtyChange: (id: string, qty: number) => void
  onRemove: (id: string) => void
}

export function PackingColumn({ categories, items, onToggle, onQtyChange, onRemove }: Props) {
  return (
    <div className="space-y-4">
      {categories.map(cat => {
        const catItems = items.filter(i => i.category === cat && i.isIncluded && !i.isLastMinute)
        if (catItems.length === 0) return null
        return (
          <section key={cat}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{cat}</h3>
            {catItems.map(item => (
              <PackingItem key={item.id} item={item}
                onToggle={() => onToggle(item.id)}
                onQtyChange={qty => onQtyChange(item.id, qty)}
                onRemove={() => onRemove(item.id)}
              />
            ))}
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: PackingView**
```tsx
// src/components/packing/PackingView.tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { ProgressBar } from '../common/ProgressBar'
import { PackingColumn } from './PackingColumn'
import { LastMinuteSection } from './LastMinuteSection'
import { EssentialsGate } from './EssentialsGate'
import { computeLastMinuteItems } from '../../lib/lastMinute'
import { useState } from 'react'

const CATEGORY_ORDER = ['Toiletries', 'Meds', 'Clothing', 'Electronics', 'Misc']
const LEFT_CATS = ['Toiletries', 'Meds', 'Electronics']
const RIGHT_CATS = ['Clothing', 'Misc']

export function PackingView() {
  const { id } = useParams<{ id: string }>()
  const trip = useStore(s => s.trips.find(t => t.id === id))
  const updateTripItem = useStore(s => s.updateTripItem)
  const removeTripItem = useStore(s => s.removeTripItem)
  const addTripItem = useStore(s => s.addTripItem)
  const completeTrip = useStore(s => s.completeTrip)
  const [showGate, setShowGate] = useState(false)
  const navigate = useNavigate()

  if (!trip) return <div className="p-6 text-slate-400">Trip not found</div>

  const included = trip.items.filter(i => i.isIncluded)
  const packed = included.filter(i => i.isPacked)
  const lastMinuteItems = computeLastMinuteItems(trip.items, trip.departureDate)

  function handleToggle(itemId: string) {
    const item = trip!.items.find(i => i.id === itemId)
    if (item) updateTripItem(trip!.id, itemId, { isPacked: !item.isPacked })
  }

  function handleQtyChange(itemId: string, qty: number) {
    updateTripItem(trip!.id, itemId, { qty })
  }

  function handleRemove(itemId: string) {
    removeTripItem(trip!.id, itemId)
  }

  function handleAddItem(category: string) {
    const name = prompt('Item name:')
    if (!name) return
    addTripItem(trip!.id, {
      masterItemId: null, name, qty: 1, isIncluded: true, isPacked: false,
      isLastMinute: false, isEssential: false, category
    })
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={() => navigate('/')} className="text-xs text-slate-500 hover:text-slate-300 mb-1">← Trips</button>
          <h1 className="text-xl font-bold text-slate-100">{trip.name}</h1>
          <p className="text-xs text-slate-500">{trip.departureDate} · {trip.profile.duration}d · {trip.profile.weather} · {trip.profile.type}</p>
        </div>
        {!trip.completedAt && (
          <button onClick={() => setShowGate(true)} className="px-4 py-2 bg-green-800 text-green-300 rounded-lg text-sm font-semibold hover:bg-green-700">Mark complete ✓</button>
        )}
      </div>

      <div className="mb-4"><ProgressBar packed={packed.length} total={included.length} /></div>

      <div className="grid grid-cols-2 gap-6">
        <PackingColumn categories={LEFT_CATS} items={trip.items} onToggle={handleToggle} onQtyChange={handleQtyChange} onRemove={handleRemove} />
        <PackingColumn categories={RIGHT_CATS} items={trip.items} onToggle={handleToggle} onQtyChange={handleQtyChange} onRemove={handleRemove} />
      </div>

      <div className="mt-4">
        <button onClick={() => handleAddItem('Misc')} className="text-sm text-indigo-400 hover:text-indigo-300">+ Add item</button>
      </div>

      <LastMinuteSection items={lastMinuteItems} onToggle={handleToggle} tripId={trip.id} />

      {showGate && (
        <EssentialsGate
          items={trip.items.filter(i => i.isEssential && i.isIncluded)}
          onConfirm={() => { completeTrip(trip.id); navigate('/') }}
          onClose={() => setShowGate(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add route in App.tsx**
```tsx
import { PackingView } from './components/packing/PackingView'
// Inside <Routes>:
<Route path="/trip/:id" element={<PackingView />} />
```

- [ ] **Step 5: Verify packing view loads and checkboxes work**

- [ ] **Step 6: Commit**
```bash
git add src/components/packing/PackingView.tsx src/components/packing/PackingItem.tsx src/components/packing/PackingColumn.tsx src/App.tsx
git commit -m "feat: 2-column packing view with inline qty editing and item removal"
```

---

## Task 11: Last-minute section + essentials gate

**Files:**
- Create: `src/components/packing/LastMinuteSection.tsx`, `src/components/packing/EssentialsGate.tsx`

- [ ] **Step 1: LastMinuteSection**
```tsx
// src/components/packing/LastMinuteSection.tsx
import { TripItem } from '../../types'
import { useStore } from '../../store'

interface Props { items: TripItem[]; onToggle: (id: string) => void; tripId: string }

export function LastMinuteSection({ items, onToggle, tripId }: Props) {
  const addTripItem = useStore(s => s.addTripItem)

  if (items.length === 0) return null

  function handleAdd() {
    const name = prompt('Item name:')
    if (!name) return
    addTripItem(tripId, {
      masterItemId: null, name, qty: 1, isIncluded: true, isPacked: false,
      isLastMinute: true, isEssential: false, category: 'Misc'
    })
  }

  return (
    <div className="mt-6 border-t-2 border-dashed border-amber-900/50 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">⏰</span>
        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-600">Last-minute — morning of</h3>
        <span className="ml-auto text-xs text-slate-600">add when you're done using them</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map(item => (
          <button key={item.id} onClick={() => onToggle(item.id)}
            className={`flex items-center gap-2 p-2 rounded-lg border text-sm text-left transition-colors ${
              item.isEssential ? 'border-amber-800 bg-amber-950/50' : 'border-slate-800 bg-slate-900'
            } ${item.isPacked ? 'opacity-40' : ''}`}
          >
            <span className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center text-[9px] ${item.isPacked ? 'bg-indigo-600 border-indigo-600 text-white' : item.isEssential ? 'border-amber-700' : 'border-slate-600'}`}>
              {item.isPacked && '✓'}
            </span>
            <span className={item.isPacked ? 'line-through text-slate-500' : 'text-slate-300'}>{item.name}</span>
          </button>
        ))}
        <button onClick={handleAdd} className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-slate-700 text-slate-600 text-sm hover:border-slate-500 hover:text-slate-400">
          + Add
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: EssentialsGate**
```tsx
// src/components/packing/EssentialsGate.tsx
import { useState } from 'react'
import { TripItem } from '../../types'
import { Modal } from '../common/Modal'

interface Props { items: TripItem[]; onConfirm: () => void; onClose: () => void }

export function EssentialsGate({ items, onConfirm, onClose }: Props) {
  const [confirmed, setConfirmed] = useState<Set<string>>(
    new Set(items.filter(i => i.isPacked).map(i => i.id))
  )

  const allConfirmed = items.every(i => confirmed.has(i.id))

  return (
    <Modal title="⚡ Before you zip up..." onClose={onClose}>
      <p className="text-sm text-slate-400 mb-4">Confirm you have these essentials packed.</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {items.map(item => {
          const isConfirmed = confirmed.has(item.id)
          return (
            <button key={item.id}
              onClick={() => setConfirmed(s => { const n = new Set(s); isConfirmed ? n.delete(item.id) : n.add(item.id); return n })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${isConfirmed ? 'bg-green-900 text-green-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {item.name}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-400 rounded-lg text-sm">← Back</button>
        <button onClick={onConfirm} disabled={!allConfirmed}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${allConfirmed ? 'bg-green-700 text-white hover:bg-green-600' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
        >
          {allConfirmed ? 'All in — close trip ✓' : `${items.length - confirmed.size} remaining`}
        </button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 3: Verify end-to-end** — create a trip, pack some items, trigger essentials gate

- [ ] **Step 4: Commit**
```bash
git add src/components/packing/LastMinuteSection.tsx src/components/packing/EssentialsGate.tsx
git commit -m "feat: last-minute section and essentials gate"
```

---

## Task 12: Management UI

**Files:**
- Create: `src/components/manage/ManageLayout.tsx`, `src/components/manage/MasterListView.tsx`, `src/components/manage/ItemForm.tsx`, `src/components/manage/KitsView.tsx`, `src/components/manage/KitForm.tsx`, `src/components/manage/TagsView.tsx`, `src/components/manage/ExportImport.tsx`, `src/components/manage/ApiSettings.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: ManageLayout with sub-nav**
```tsx
// src/components/manage/ManageLayout.tsx
import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/manage/items', label: 'Master list' },
  { to: '/manage/kits', label: 'Kits' },
  { to: '/manage/tags', label: 'Tags' },
  { to: '/manage/import', label: 'Notion import' },
  { to: '/manage/backup', label: 'Export / Import' },
  { to: '/manage/api', label: 'API key' },
]

export function ManageLayout() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <NavLink to="/" className="text-xs text-slate-500 hover:text-slate-300">← Trips</NavLink>
        <h1 className="text-xl font-bold text-slate-100">Manage</h1>
      </div>
      <div className="flex gap-6">
        <nav className="w-40 flex-shrink-0 space-y-1">
          {links.map(l => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => `block px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-indigo-900 text-indigo-200' : 'text-slate-400 hover:text-slate-200'}`}
            >{l.label}</NavLink>
          ))}
        </nav>
        <div className="flex-1 min-w-0"><Outlet /></div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: MasterListView with ItemForm modal**
```tsx
// src/components/manage/MasterListView.tsx
import { useState } from 'react'
import { useStore } from '../../store'
import { MasterItem } from '../../types'
import { TagChip } from '../common/TagChip'
import { ItemForm } from './ItemForm'

export function MasterListView() {
  const masterItems = useStore(s => s.masterItems)
  const deleteMasterItem = useStore(s => s.deleteMasterItem)
  const [editing, setEditing] = useState<MasterItem | null | 'new'>(null)
  const [filter, setFilter] = useState('')

  const filtered = masterItems.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()))
  const grouped = filtered.reduce((acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item]
    return acc
  }, {} as Record<string, MasterItem[]>)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter items..." className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
        <button onClick={() => setEditing('new')} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm">+ Add item</button>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{cat}</h3>
          <div className="space-y-1">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2 py-2 border-b border-slate-800">
                <span className="flex-1 text-sm text-slate-200">{item.name}</span>
                <div className="flex gap-1">{item.tags.map(t => <TagChip key={t} tag={t} />)}</div>
                {item.isEssential && <span className="text-xs text-amber-500">essential</span>}
                {item.isLastMinute && <span className="text-xs text-slate-500">last-min</span>}
                <span className="text-xs text-slate-600">{item.qtyBasis === 'per-day' ? '×/day' : `×${item.defaultQty}`}</span>
                <button onClick={() => setEditing(item)} className="text-xs text-slate-600 hover:text-indigo-400">edit</button>
                <button onClick={() => deleteMasterItem(item.id)} className="text-xs text-slate-600 hover:text-red-400">del</button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {editing && <ItemForm item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
```

- [ ] **Step 3: ItemForm**
```tsx
// src/components/manage/ItemForm.tsx
import { useState } from 'react'
import { useStore } from '../../store'
import { MasterItem } from '../../types'
import { Modal } from '../common/Modal'

const CATEGORIES = ['Toiletries', 'Meds', 'Clothing', 'Electronics', 'Misc']
const COMMON_TAGS = ['always', 'cold-weather', 'warm-weather', 'business', 'leisure']

export function ItemForm({ item, onClose }: { item: MasterItem | null; onClose: () => void }) {
  const addMasterItem = useStore(s => s.addMasterItem)
  const updateMasterItem = useStore(s => s.updateMasterItem)

  const [form, setForm] = useState({
    name: item?.name ?? '',
    category: item?.category ?? 'Misc',
    tags: item?.tags ?? ['always'],
    defaultQty: item?.defaultQty ?? 1,
    qtyBasis: item?.qtyBasis ?? 'fixed' as const,
    isLastMinute: item?.isLastMinute ?? false,
    isEssential: item?.isEssential ?? false,
  })

  function handleSave() {
    if (!form.name.trim()) return
    if (item) updateMasterItem(item.id, form)
    else addMasterItem(form)
    onClose()
  }

  function toggleTag(tag: string) {
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }))
  }

  return (
    <Modal title={item ? 'Edit item' : 'Add item'} onClose={onClose}>
      <div className="space-y-3">
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Item name" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500" />

        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none">
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>

        <div>
          <p className="text-xs text-slate-500 mb-1">Tags</p>
          <div className="flex flex-wrap gap-1">
            {COMMON_TAGS.map(tag => (
              <button key={tag} onClick={() => toggleTag(tag)}
                className={`text-xs px-2 py-1 rounded-full ${form.tags.includes(tag) ? 'bg-indigo-700 text-indigo-200' : 'bg-slate-700 text-slate-400'}`}
              >{tag}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input type="number" min={1} value={form.defaultQty} onChange={e => setForm(f => ({ ...f, defaultQty: Number(e.target.value) }))} className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none" />
          <select value={form.qtyBasis} onChange={e => setForm(f => ({ ...f, qtyBasis: e.target.value as any }))} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none">
            <option value="fixed">fixed quantity</option>
            <option value="per-day">per day (×duration)</option>
          </select>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.isLastMinute} onChange={e => setForm(f => ({ ...f, isLastMinute: e.target.checked }))} className="rounded" />
            Last-minute
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.isEssential} onChange={e => setForm(f => ({ ...f, isEssential: e.target.checked }))} className="rounded" />
            Essential
          </label>
        </div>

        <button onClick={handleSave} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold">Save</button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 4: KitsView**
```tsx
// src/components/manage/KitsView.tsx
import { useState } from 'react'
import { useStore } from '../../store'
import { Kit } from '../../types'
import { KitForm } from './KitForm'

export function KitsView() {
  const kits = useStore(s => s.kits)
  const masterItems = useStore(s => s.masterItems)
  const deleteKit = useStore(s => s.deleteKit)
  const [editing, setEditing] = useState<Kit | null | 'new'>(null)

  function itemName(id: string) {
    return masterItems.find(i => i.id === id)?.name ?? id
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setEditing('new')} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm">+ New kit</button>
      </div>
      {kits.map(kit => (
        <div key={kit.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-200">{kit.name}</h3>
            <div className="flex gap-2">
              <button onClick={() => setEditing(kit)} className="text-xs text-slate-500 hover:text-indigo-400">edit</button>
              <button onClick={() => deleteKit(kit.id)} className="text-xs text-slate-500 hover:text-red-400">delete</button>
            </div>
          </div>
          <div className="space-y-1">
            {kit.items.map((ki, i) => (
              <div key={i} className="text-sm text-slate-400 flex gap-2">
                <span>{itemName(ki.masterItemId)}</span>
                {ki.qty > 1 && <span className="text-indigo-400">×{ki.qty}</span>}
                {ki.swapsItemId && <span className="text-amber-500">replaces {itemName(ki.swapsItemId)}</span>}
              </div>
            ))}
            {kit.items.length === 0 && <p className="text-xs text-slate-600">No items — edit to add some.</p>}
          </div>
        </div>
      ))}
      {editing && <KitForm kit={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
```

- [ ] **Step 4b: KitForm**
```tsx
// src/components/manage/KitForm.tsx
import { useState } from 'react'
import { useStore } from '../../store'
import { Kit, KitItem } from '../../types'
import { Modal } from '../common/Modal'

export function KitForm({ kit, onClose }: { kit: Kit | null; onClose: () => void }) {
  const masterItems = useStore(s => s.masterItems)
  const addKit = useStore(s => s.addKit)
  const updateKit = useStore(s => s.updateKit)

  const [name, setName] = useState(kit?.name ?? '')
  const [items, setItems] = useState<KitItem[]>(kit?.items ?? [])
  const [search, setSearch] = useState('')

  const filteredMaster = masterItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) &&
    !items.some(ki => ki.masterItemId === i.id)
  )

  function addItem(masterItemId: string) {
    setItems(prev => [...prev, { masterItemId, qty: 1 }])
    setSearch('')
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, updates: Partial<KitItem>) {
    setItems(prev => prev.map((ki, i) => i === index ? { ...ki, ...updates } : ki))
  }

  function handleSave() {
    if (!name.trim()) return
    if (kit) updateKit(kit.id, { name, items })
    else addKit({ name, items })
    onClose()
  }

  function itemName(id: string) {
    return masterItems.find(i => i.id === id)?.name ?? id
  }

  return (
    <Modal title={kit ? 'Edit kit' : 'New kit'} onClose={onClose}>
      <div className="space-y-4">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Kit name (e.g. Hiking)" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500" />

        <div>
          <p className="text-xs text-slate-500 mb-1">Items in this kit</p>
          <div className="space-y-2 mb-2">
            {items.map((ki, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-800 rounded-lg p-2">
                <span className="flex-1 text-sm text-slate-200">{itemName(ki.masterItemId)}</span>
                <input type="number" min={1} value={ki.qty} onChange={e => updateItem(i, { qty: Number(e.target.value) })}
                  className="w-14 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100 text-center focus:outline-none" />
                <select
                  value={ki.swapsItemId ?? ''}
                  onChange={e => updateItem(i, { swapsItemId: e.target.value || undefined })}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="">no swap</option>
                  {masterItems.filter(m => m.id !== ki.masterItemId).map(m => (
                    <option key={m.id} value={m.id}>replaces: {m.name}</option>
                  ))}
                </select>
                <button onClick={() => removeItem(i)} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
              </div>
            ))}
          </div>

          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search master items to add..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500" />
          {search && (
            <div className="mt-1 max-h-32 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg divide-y divide-slate-700">
              {filteredMaster.slice(0, 8).map(m => (
                <button key={m.id} onClick={() => addItem(m.id)} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
                  {m.name} <span className="text-slate-500 text-xs">· {m.category}</span>
                </button>
              ))}
              {filteredMaster.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">No matches</p>}
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={!name.trim()} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">Save kit</button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 5: TagsView**
```tsx
// src/components/manage/TagsView.tsx
import { useState } from 'react'
import { useStore } from '../../store'

export function TagsView() {
  const masterItems = useStore(s => s.masterItems)
  const renameTag = useStore(s => s.renameTag)

  const tagCounts = masterItems.reduce((acc, item) => {
    item.tags.forEach(t => { acc[t] = (acc[t] ?? 0) + 1 })
    return acc
  }, {} as Record<string, number>)

  function handleRename(tag: string) {
    const newName = prompt(`Rename "${tag}" to:`, tag)
    if (newName && newName !== tag) renameTag(tag, newName)
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-300 mb-4">All tags</h2>
      {Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => (
        <div key={tag} className="flex items-center gap-3 py-2 border-b border-slate-800">
          <span className="flex-1 text-sm text-slate-200">{tag}</span>
          <span className="text-xs text-slate-500">{count} items</span>
          <button onClick={() => handleRename(tag)} className="text-xs text-slate-600 hover:text-indigo-400">rename</button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: ExportImport**
```tsx
// src/components/manage/ExportImport.tsx
import { useStore } from '../../store'

export function ExportImport() {
  const exportData = useStore(s => s.exportData)
  const importData = useStore(s => s.importData)

  function handleExport() {
    const json = exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `packing-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        importData(ev.target?.result as string)
        alert('Data imported successfully.')
      } catch {
        alert('Failed to parse backup file.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Export backup</h3>
        <p className="text-xs text-slate-500 mb-3">Downloads all your master items, kits, and trip history as a JSON file.</p>
        <button onClick={handleExport} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm">Download backup</button>
      </section>
      <section>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Import backup</h3>
        <p className="text-xs text-slate-500 mb-3">Restores from a previously exported JSON file. This replaces all current data.</p>
        <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm cursor-pointer">
          Choose file <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
      </section>
    </div>
  )
}
```

- [ ] **Step 7: ApiSettings**
```tsx
// src/components/manage/ApiSettings.tsx
import { useState } from 'react'
import { useStore } from '../../store'

export function ApiSettings() {
  const apiKey = useStore(s => s.settings.openRouterApiKey)
  const updateSettings = useStore(s => s.updateSettings)
  const [draft, setDraft] = useState(apiKey)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300">OpenRouter API key</h3>
      <p className="text-xs text-slate-500">Used for AI trip generation and pattern learning. Stored locally in your browser only.</p>
      <input type="password" value={draft} onChange={e => setDraft(e.target.value)} placeholder="sk-or-..." className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500" />
      <button onClick={() => updateSettings({ openRouterApiKey: draft })} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm">Save key</button>
      {apiKey && <p className="text-xs text-green-500">✓ API key saved</p>}
    </div>
  )
}
```

- [ ] **Step 8: Add manage routes in App.tsx**
```tsx
import { ManageLayout } from './components/manage/ManageLayout'
import { MasterListView } from './components/manage/MasterListView'
import { KitsView } from './components/manage/KitsView'
import { TagsView } from './components/manage/TagsView'
import { ExportImport } from './components/manage/ExportImport'
import { ApiSettings } from './components/manage/ApiSettings'
// Inside <Routes>:
<Route path="/manage" element={<ManageLayout />}>
  <Route path="items" element={<MasterListView />} />
  <Route path="kits" element={<KitsView />} />
  <Route path="tags" element={<TagsView />} />
  <Route path="backup" element={<ExportImport />} />
  <Route path="api" element={<ApiSettings />} />
</Route>
```

- [ ] **Step 9: Verify management area** — add an item, edit it, delete it; rename a tag; export backup

- [ ] **Step 10: Commit**
```bash
git add src/components/manage/ src/App.tsx
git commit -m "feat: management UI — master list, kits, tags, export/import, API settings"
```

---

## Task 13: OpenRouter AI — NL trip creation

**Files:**
- Create: `src/ai/client.ts`, `src/ai/parseTrip.ts`
- Create: `tests/ai/parseTrip.test.ts`
- Modify: `src/components/trips/NewTripForm.tsx`

- [ ] **Step 1: OpenRouter client**
```ts
// src/ai/client.ts
export async function openRouterChat(
  apiKey: string,
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
    },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
  })
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content
}
```

- [ ] **Step 2: Write failing test for parseTrip**
```ts
// tests/ai/parseTrip.test.ts
import { describe, it, expect, vi } from 'vitest'
import { parseTripDescription } from '../../src/ai/parseTrip'

vi.mock('../../src/ai/client', () => ({
  openRouterChat: vi.fn().mockResolvedValue(JSON.stringify({
    name: 'Edinburgh Mar 26',
    duration: 5,
    weather: 'cold',
    type: 'business',
    mode: 'carry-on',
  }))
}))

describe('parseTripDescription', () => {
  it('returns a structured TripProfile from NL description', async () => {
    const result = await parseTripDescription('fake-key', '5 days Edinburgh, cold, carry-on, work dinner')
    expect(result.duration).toBe(5)
    expect(result.weather).toBe('cold')
    expect(result.type).toBe('business')
    expect(result.mode).toBe('carry-on')
  })
})
```

- [ ] **Step 3: Run — expect FAIL**
```bash
npx vitest run tests/ai/parseTrip.test.ts
```

- [ ] **Step 4: Implement parseTrip**
```ts
// src/ai/parseTrip.ts
import { TripProfile } from '../types'
import { openRouterChat } from './client'

const SYSTEM_PROMPT = `You parse trip descriptions into structured JSON.
Return ONLY valid JSON with these fields:
- name: string (short trip name)
- duration: number (days)
- weather: "cold" | "warm" | "mixed"
- type: "business" | "leisure" | "mixed"
- mode: "checked" | "carry-on" | "road-trip"

Infer from context. "Edinburgh in October" → cold. "work dinner" → business. Default to "mixed" if unclear.`

export async function parseTripDescription(apiKey: string, description: string): Promise<TripProfile & { name: string }> {
  const raw = await openRouterChat(
    apiKey,
    'anthropic/claude-sonnet-4-5',
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: description },
    ]
  )

  const parsed = JSON.parse(raw.trim())
  return {
    name: parsed.name ?? description.slice(0, 40),
    duration: Number(parsed.duration) || 5,
    weather: parsed.weather ?? 'mixed',
    type: parsed.type ?? 'mixed',
    mode: parsed.mode ?? 'checked',
    nlDescription: description,
  }
}
```

- [ ] **Step 5: Run test — expect PASS**
```bash
npx vitest run tests/ai/parseTrip.test.ts
```

- [ ] **Step 6: Wire NL input into NewTripForm** — add a textarea above the manual controls. On submit, call `parseTripDescription`, populate the profile state, and proceed to kit selection. Show a loading spinner while awaiting. Only show this if `settings.openRouterApiKey` is set; otherwise show manual controls only.

Add to `NewTripForm.tsx`:
```tsx
// Add near top of component:
const settings = useStore(s => s.settings)
const [nlInput, setNlInput] = useState('')
const [nlLoading, setNlLoading] = useState(false)

async function handleNlSubmit() {
  if (!nlInput.trim() || !settings.openRouterApiKey) return
  setNlLoading(true)
  try {
    const parsed = await parseTripDescription(settings.openRouterApiKey, nlInput)
    setProfile({ duration: parsed.duration, weather: parsed.weather, type: parsed.type, mode: parsed.mode, nlDescription: nlInput })
    setName(parsed.name)
    setGeneratedItems(generateTripItems(masterItems, parsed))
    setStep('kits')
  } catch (e) {
    alert('AI parsing failed — fill in manually below.')
  } finally {
    setNlLoading(false)
  }
}

// Add to JSX before the manual fields:
{settings.openRouterApiKey && (
  <div>
    <label className="text-xs text-slate-400 uppercase tracking-wider">Describe your trip</label>
    <textarea
      value={nlInput}
      onChange={e => setNlInput(e.target.value)}
      placeholder="5 days in Edinburgh, cold, one work dinner, carry-on..."
      rows={2}
      className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 resize-none"
    />
    <button onClick={handleNlSubmit} disabled={nlLoading || !nlInput.trim()}
      className="mt-1 w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
    >{nlLoading ? 'Generating...' : 'Generate from description →'}</button>
    <p className="text-xs text-slate-600 mt-1 text-center">or fill in manually below</p>
  </div>
)}
```

- [ ] **Step 7: Test with real API key** — enter OpenRouter key in settings, create a trip with NL description, verify profile is parsed correctly

- [ ] **Step 8: Commit**
```bash
git add src/ai/client.ts src/ai/parseTrip.ts tests/ai/parseTrip.test.ts src/components/trips/NewTripForm.tsx
git commit -m "feat: OpenRouter NL trip creation with AI profile parsing"
```

---

## Task 14: Learning layer

**Files:**
- Create: `src/ai/learnFromHistory.ts`
- Create: `src/components/trips/SuggestionBanner.tsx`
- Modify: `src/components/trips/TripList.tsx`

- [ ] **Step 1: Implement learnFromHistory**
```ts
// src/ai/learnFromHistory.ts
import { Trip, PatternSuggestion } from '../types'
import { openRouterChat } from './client'

const SYSTEM_PROMPT = `You analyse packing trip history and identify actionable patterns.
Return a JSON array of suggestions (max 3), each with:
- type: "remove-default" | "promote-to-master" | "adjust-qty"
- itemName: string
- message: string (one sentence, friendly)
- tripCount: number (how many trips this is based on)

Only surface high-confidence patterns (3+ trips). Be specific and concise.
Return [] if no clear patterns yet.`

export async function learnFromHistory(apiKey: string, completedTrips: Trip[]): Promise<PatternSuggestion[]> {
  if (completedTrips.length < 3) return []

  const summary = completedTrips.slice(-10).map(t => ({
    profile: `${t.profile.duration}d, ${t.profile.weather}, ${t.profile.type}, ${t.profile.mode}`,
    packed: t.items.filter(i => i.isIncluded && i.isPacked).map(i => i.name),
    skipped: t.items.filter(i => !i.isIncluded || (!i.isPacked && i.isIncluded)).map(i => i.name),
  }))

  const raw = await openRouterChat(apiKey, 'anthropic/claude-sonnet-4-5', [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(summary) },
  ])

  try {
    return JSON.parse(raw.trim())
  } catch {
    return []
  }
}
```

- [ ] **Step 2: SuggestionBanner**
```tsx
// src/components/trips/SuggestionBanner.tsx
import { useStore } from '../../store'

export function SuggestionBanner() {
  const suggestions = useStore(s => s.pendingSuggestions)
  const dismiss = useStore(s => s.dismissSuggestion)

  if (suggestions.length === 0) return null

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Patterns noticed</h3>
      {suggestions.map((s, i) => (
        <div key={i} className="flex items-start gap-3">
          <p className="flex-1 text-sm text-slate-300">{s.message} <span className="text-slate-500">({s.tripCount} trips)</span></p>
          <button onClick={() => dismiss(i)} className="text-xs text-slate-600 hover:text-slate-400 flex-shrink-0">dismiss</button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Trigger learning after trip completion** — in `PackingView.tsx`, after calling `completeTrip`, run learning in the background if API key is set:
```tsx
// After completeTrip(trip.id) in handleConfirm:
const apiKey = useStore.getState().settings.openRouterApiKey
const completedTrips = useStore.getState().trips.filter(t => t.completedAt)
if (apiKey && completedTrips.length >= 3) {
  learnFromHistory(apiKey, completedTrips)
    .then(suggestions => { if (suggestions.length) useStore.getState().setSuggestions(suggestions) })
    .catch(() => {}) // silent fail
}
```

- [ ] **Step 4: Show SuggestionBanner on TripList** — add `<SuggestionBanner />` above the trip sections in `TripList.tsx`

- [ ] **Step 5: Test with 3+ completed trips** — complete 3 trips, verify suggestions appear; dismiss them; verify they disappear

- [ ] **Step 6: Commit**
```bash
git add src/ai/learnFromHistory.ts src/components/trips/SuggestionBanner.tsx
git commit -m "feat: learning layer — pattern suggestions after trip completion"
```

---

## Task 15: Notion import

**Files:**
- Create: `src/ai/importNotion.ts`, `src/components/manage/NotionImport.tsx`
- Modify: `src/components/manage/ManageLayout.tsx` routes, `src/App.tsx`

- [ ] **Step 1: importNotion parser**
```ts
// src/ai/importNotion.ts
import { MasterItem } from '../types'
import { openRouterChat } from './client'

const SYSTEM_PROMPT = `Parse a Notion packing list (markdown checkbox format) into a JSON array of items.
For each item return:
- name: string (clean item name, no quantities)
- category: "Toiletries" | "Meds" | "Clothing" | "Electronics" | "Misc"
- defaultQty: number (extract from name e.g. "3 pants" → qty 3, name "pants")
- qtyBasis: "fixed" | "per-day" (clothing counts > 1 → "per-day", everything else "fixed")
- tags: string[] (infer from item: meds → ["always"], cold gear → ["cold-weather"], business shirts → ["business"], etc.)
- isLastMinute: boolean (chargers, phone, toothbrush → true)
- isEssential: boolean (passport, meds → true)

Skip blank lines, section headers, and non-item text. Deduplicate similar items (flag as duplicate if names differ by ≤2 chars or are clear synonyms).`

export interface ImportedItem extends Omit<MasterItem, 'id'> {
  isDuplicate?: boolean
  duplicateOf?: string
}

export async function importNotionList(apiKey: string, markdown: string): Promise<ImportedItem[]> {
  const raw = await openRouterChat(apiKey, 'anthropic/claude-sonnet-4-5', [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: markdown },
  ])
  return JSON.parse(raw.trim())
}
```

- [ ] **Step 2: NotionImport component**
```tsx
// src/components/manage/NotionImport.tsx
import { useState } from 'react'
import { useStore } from '../../store'
import { importNotionList, ImportedItem } from '../../ai/importNotion'
import { v4 as uuid } from 'uuid'

export function NotionImport() {
  const [markdown, setMarkdown] = useState('')
  const [parsed, setParsed] = useState<ImportedItem[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const settings = useStore(s => s.settings)
  const masterItems = useStore(s => s.masterItems)
  const addMasterItem = useStore(s => s.addMasterItem)

  async function handleParse() {
    if (!settings.openRouterApiKey) { alert('Set an API key first in API Settings.'); return }
    setLoading(true)
    try {
      const items = await importNotionList(settings.openRouterApiKey, markdown)
      // Pre-select all non-duplicates and items not already in master
      const existingNames = new Set(masterItems.map(i => i.name.toLowerCase()))
      const sel = new Set(items.map((_, i) => i).filter(i => !items[i].isDuplicate && !existingNames.has(items[i].name.toLowerCase())))
      setParsed(items)
      setSelected(sel)
    } catch (e) {
      alert('Failed to parse. Try again or paste fewer lists at once.')
    } finally {
      setLoading(false)
    }
  }

  function handleImport() {
    if (!parsed) return
    parsed.forEach((item, i) => {
      if (selected.has(i)) addMasterItem(item)
    })
    setParsed(null)
    setMarkdown('')
    alert(`Imported ${selected.size} items.`)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300">Import from Notion</h3>
      <p className="text-xs text-slate-500">Paste one or more Notion packing lists (markdown format). The AI will parse them, deduplicate, and let you review before importing.</p>

      {!parsed && (
        <>
          <textarea value={markdown} onChange={e => setMarkdown(e.target.value)} placeholder="Paste Notion packing list markdown here..." rows={12} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500 resize-y" />
          <button onClick={handleParse} disabled={loading || !markdown.trim()} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">
            {loading ? 'Parsing...' : 'Parse with AI →'}
          </button>
        </>
      )}

      {parsed && (
        <>
          <p className="text-xs text-slate-400">{parsed.length} items found. {selected.size} selected to import.</p>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {parsed.map((item, i) => (
              <label key={i} className={`flex items-center gap-3 py-2 border-b border-slate-800 cursor-pointer ${item.isDuplicate ? 'opacity-50' : ''}`}>
                <input type="checkbox" checked={selected.has(i)} onChange={e => {
                  const s = new Set(selected)
                  e.target.checked ? s.add(i) : s.delete(i)
                  setSelected(s)
                }} />
                <span className="flex-1 text-sm text-slate-200">{item.name}</span>
                <span className="text-xs text-slate-500">{item.category}</span>
                {item.isDuplicate && <span className="text-xs text-amber-500">possible duplicate</span>}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setParsed(null)} className="px-4 py-2 bg-slate-800 text-slate-400 rounded-lg text-sm">← Back</button>
            <button onClick={handleImport} disabled={selected.size === 0} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">Import {selected.size} items</button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add route**
```tsx
import { NotionImport } from './components/manage/NotionImport'
// Inside /manage nested routes:
<Route path="import" element={<NotionImport />} />
```

- [ ] **Step 4: Test with real Notion paste** — paste one of the packing lists, verify parsing, review, import

- [ ] **Step 5: Commit**
```bash
git add src/ai/importNotion.ts src/components/manage/NotionImport.tsx src/App.tsx
git commit -m "feat: Notion import with AI parsing, deduplication review, and selective import"
```

---

## Task 16: First-run onboarding

**Files:**
- Create: `src/components/Onboarding.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Onboarding component**
```tsx
// src/components/Onboarding.tsx
import { useState } from 'react'
import { useStore } from '../store'

export function Onboarding() {
  const updateSettings = useStore(s => s.updateSettings)
  const [apiKey, setApiKey] = useState('')
  const [step, setStep] = useState<'welcome' | 'api'>('welcome')

  function finish() {
    updateSettings({ openRouterApiKey: apiKey, hasCompletedOnboarding: true })
  }

  if (step === 'api') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6">
          <h1 className="text-2xl font-bold text-slate-100">Add your OpenRouter key</h1>
          <p className="text-slate-400">Used for AI trip generation. Optional — you can always add it later in Settings.</p>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-or-..." className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500" />
          <div className="flex gap-2">
            <button onClick={finish} className="flex-1 py-2 bg-slate-800 text-slate-400 rounded-lg text-sm">Skip for now</button>
            <button onClick={finish} disabled={!apiKey.trim()} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">Save & start</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-3xl font-bold text-slate-100">Pack</h1>
        <p className="text-slate-400">A smarter packing list. One master list, reusable kits, AI-powered trip generation.</p>
        <div className="text-left bg-slate-900 rounded-xl p-4 space-y-2">
          <p className="text-sm text-slate-300">✓ Master item library with tags</p>
          <p className="text-sm text-slate-300">✓ Reusable kits (International, Gym, Hiking...)</p>
          <p className="text-sm text-slate-300">✓ AI generates your list from a trip description</p>
          <p className="text-sm text-slate-300">✓ Gets smarter after every trip</p>
        </div>
        <button onClick={() => setStep('api')} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold">Get started →</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Gate App.tsx on onboarding**
```tsx
// In App.tsx, wrap routes:
import { Onboarding } from './components/Onboarding'
import { useStore } from './store'

export default function App() {
  const hasOnboarded = useStore(s => s.settings.hasCompletedOnboarding)
  if (!hasOnboarded) return <Onboarding />
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Routes>
          {/* ... all existing routes ... */}
        </Routes>
      </div>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Run all tests**
```bash
npx vitest run
```
Expected: all pass

- [ ] **Step 4: Full end-to-end smoke test**
  - Clear localStorage (DevTools → Application → Storage → Clear)
  - Reload: onboarding appears
  - Complete onboarding (skip API key)
  - Home screen: no trips
  - Create a trip manually (5 days, cold, leisure, checked)
  - Add gym kit
  - Review list, save
  - Pack some items, verify progress bar
  - Open departure day in browser by temporarily changing system date — verify last-minute section appears
  - Mark trip complete via essentials gate
  - Trip moves to Past trips

- [ ] **Step 5: Final commit**
```bash
git add src/components/Onboarding.tsx src/App.tsx
git commit -m "feat: first-run onboarding with optional API key setup"
```

---

## Done

All 16 tasks produce a working app. Suggested build order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16. Each task is independently committable and leaves the app in a working state.
