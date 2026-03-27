# Architecture Baseline — Pack App (2026-03-27)

Snapshot of the app's architecture before the Plan B polish pass. Reference point for understanding what changed and why.

## Stack

- **Runtime:** React 19 + TypeScript 5.9 + Vite 8
- **State:** Zustand with `persist` middleware (localStorage, key: `packing-app-store`)
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite` plugin
- **Routing:** React Router DOM v7 (BrowserRouter)
- **AI:** Direct browser-to-API calls to OpenRouter (Claude Haiku 4.5)
- **Testing:** Vitest + Testing Library + jsdom
- **Deployment:** Static files on Hetzner (Caddy), PWA with hand-written service worker

## Data Model (`src/types/index.ts`)

```
MasterItem {
  id, name, category, tags[], defaultQty, qtyBasis ('fixed'|'per-day'),
  isLastMinute, isEssential, deletedAt? (soft delete)
}

Kit { id, name, items: KitItem[] }
KitItem { masterItemId, qty, swapsItemId? }

Trip {
  id, name, createdAt, departureDate, completedAt?,
  profile: TripProfile, activeKitIds[], items: TripItem[]
}
TripProfile { duration, weather, type, mode, nlDescription }
TripItem {
  id, masterItemId (nullable for one-offs), name, qty,
  isIncluded, isPacked, isLastMinute, isEssential, category
}

AppSettings { openRouterApiKey, hasCompletedOnboarding }
PatternSuggestion { type, itemName, message, tripCount }
```

## File Structure

```
src/
  types/index.ts          — All type definitions
  store/index.ts          — Zustand store (all actions, persist config)
  store/seed.ts           — Hardcoded seed items and kit builder
  ai/client.ts            — OpenRouter API wrapper (openRouterChat)
  ai/parseTrip.ts         — NL trip description → TripProfile
  ai/learnFromHistory.ts  — Completed trips → PatternSuggestions
  ai/importNotion.ts      — Notion markdown → MasterItem candidates
  lib/generateTripItems.ts — MasterItem[] + TripProfile → TripItem[]
  lib/itemFilter.ts       — Filter items by weather/type/mode tags
  lib/kitApply.ts         — Apply kit items to trip (with swap logic)
  lib/lastMinute.ts       — Compute which items show in last-minute section
  lib/quantities.ts       — Compute qty based on duration and qtyBasis
  components/
    Onboarding.tsx         — First-run welcome + optional API key
    common/Modal.tsx       — Generic modal wrapper
    common/ProgressBar.tsx — Packing progress bar
    common/QtyBadge.tsx    — Quantity display with prompt() editing
    common/TagChip.tsx     — Colored tag pill
    trips/TripList.tsx     — Home screen: upcoming + past trips
    trips/TripCard.tsx     — Single trip card with rename/delete
    trips/NewTripForm.tsx  — Multi-step: form → kits → review
    trips/SuggestionBanner.tsx — AI learning suggestions
    packing/PackingView.tsx    — Main packing screen for a trip
    packing/PackingColumn.tsx  — Column of items by category
    packing/PackingItem.tsx    — Single packing item with checkbox
    packing/EssentialsGate.tsx — "Pack essentials first" gate
    packing/LastMinuteSection.tsx — Last-minute items section
    manage/ManageLayout.tsx    — Sidebar/tab nav for manage section
    manage/MasterListView.tsx  — Full master item list with filter
    manage/KitsView.tsx        — Kit list
    manage/KitForm.tsx         — Kit editor modal
    manage/ItemForm.tsx        — Master item editor modal
    manage/TagsView.tsx        — Tag management
    manage/TrashView.tsx       — Soft-deleted items
    manage/NotionImport.tsx    — Import from Notion export
    manage/ExportImport.tsx    — JSON export/import
    manage/ApiSettings.tsx     — OpenRouter key management
```

## Key Flows

1. **Trip creation:** NewTripForm (optional NL → AI parse) → select kits → review generated items → save → navigate to PackingView
2. **Packing:** PackingView loads trip, shows items in 2 columns by category, checkbox to mark packed, EssentialsGate blocks non-essentials until essentials done, LastMinuteSection appears on departure day
3. **Kit application:** kitApply.ts merges kit items into trip items, handling qty overrides and item swaps
4. **Learning:** On trip completion, learnFromHistory calls AI to analyze packing patterns and suggest master list changes
5. **Manage:** CRUD for master items, kits, tags. Notion import. JSON backup. API key settings.

## Known Issues at Time of Snapshot

- kitApply.ts line 33: sets item name to masterItemId (UUID) instead of resolved name
- openRouterChat: HTTP-Referer hardcoded to localhost:5173
- No error boundary — any render crash = white screen
- PackingItem delete button only visible on hover (useless on mobile)
- All confirmations/prompts use browser native dialogs
- QtyBadge uses prompt() for editing
- No loading states beyond "Generating..." text
- No form validation feedback
- /manage route shows blank content until sub-tab selected
- console.log statements left in NewTripForm
- AI calls have no timeout, retry, or offline detection
