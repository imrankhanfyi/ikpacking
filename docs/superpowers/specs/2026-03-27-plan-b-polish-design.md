# Plan B: Solid Personal Tool — Design Spec

**Date:** 2026-03-27
**Scope:** Polish pass to make Pack feel like a real personal tool, not a prototype.
**Audience:** Single user (Imran). No need to handle strangers or edge cases beyond personal use.
**Approach:** Execute all changes in one pass, verify at the end.
**Layering:** Plan C (structural/architectural improvements) can be applied on top of this without conflict.

## 1. Bug Fixes

### 1.1 Kit apply name resolution
**File:** `src/lib/kitApply.ts` line 33
**Bug:** Sets `name: kitItem.masterItemId` (a UUID string) instead of the item's actual name.
**Fix:** Look up the master item by ID and use its name. If not found, fall back to "Unknown item".

### 1.2 API referer
**File:** `src/ai/client.ts` line 11
**Bug:** `'HTTP-Referer': 'http://localhost:5173'` — wrong in production.
**Fix:** Use `typeof window !== 'undefined' ? window.location.origin : 'https://pack.app'`.

### 1.3 Error boundary
**New file:** `src/components/ErrorBoundary.tsx`
**What:** Class component that catches render errors and shows "Something went wrong — tap to reload" instead of white screen. Wrap the entire app in App.tsx.

### 1.4 Console cleanup
**File:** `src/components/trips/NewTripForm.tsx` lines 34, 49
**Fix:** Remove `console.log` statements.

### 1.5 AI response validation
**File:** `src/ai/client.ts`
**Bug:** Assumes `data.choices[0].message.content` exists without null checks.
**Fix:** Validate response shape, throw descriptive error if malformed.

### 1.6 learnFromHistory error handling
**File:** `src/ai/learnFromHistory.ts`
**Bug:** Silently returns `[]` on failure — user never knows learning failed.
**Fix:** Log error, return empty array (keep current behavior) but surface via toast if called interactively.

### 1.7 Silent removeTripItem
**File:** `src/components/packing/PackingItem.tsx`
**Bug:** Trip items can be removed with no confirmation.
**Fix:** Add undo via toast (see section 3).

## 2. Mobile Packing View Overhaul

### 2.1 PackingView layout
**File:** `src/components/packing/PackingView.tsx`
**Change:** Single column on mobile (`grid-cols-1 sm:grid-cols-2`). Each category gets a collapsible section header.

### 2.2 PackingItem redesign
**File:** `src/components/packing/PackingItem.tsx`
**Current:** Delete button hidden behind hover. Tiny tap targets.
**After:** Full-width row. Left: checkbox + name. Right: qty + remove button (always visible, red, minimum 44px tap target). Packed items get strikethrough and muted color.

### 2.3 QtyBadge replacement
**File:** `src/components/common/QtyBadge.tsx`
**Current:** Shows qty, clicking opens `prompt()`.
**After:** Inline stepper: `[-] 3 [+]` with tap-friendly buttons. Same component used in PackingItem and review list.

### 2.4 LastMinuteSection
**File:** `src/components/packing/LastMinuteSection.tsx`
**Change:** Clear visual separator (colored border or background tint). Bigger tap targets on items.

### 2.5 EssentialsGate
**File:** `src/components/packing/EssentialsGate.tsx`
**Change:** Use proper checkboxes with labels instead of colored dots. Accessible and obvious.

## 3. Interaction Pattern Overhaul

### 3.1 Toast notification system
**New file:** `src/components/common/Toast.tsx`
**New file:** `src/store/toastStore.ts` (or add to main store)
**What:** Lightweight toast system. Types: success, error, undo. Auto-dismiss after 4 seconds. Undo toasts have a button that calls a callback before dismissing. Positioned at bottom of screen, above safe area.

### 3.2 Replace all alert() calls
- `NewTripForm` AI failure → inline error message below the textarea
- `ExportImport` success/failure → toast
- `NotionImport` failure → inline error message

### 3.3 Replace all confirm() calls
- `MasterListView` delete → toast with undo (item is soft-deleted, undo restores)
- `KitsView` delete → toast with undo
- `TripCard` delete → toast with undo
- `TrashView` permanent delete → confirm modal (this one is destructive enough to warrant it)
- `TrashView` empty trash → confirm modal

### 3.4 Replace all prompt() calls
- `TripCard` rename → inline edit (tap name, it becomes an input, press Enter to save)
- `QtyBadge` → inline stepper (see 2.3)

## 4. AI Robustness

### 4.1 API client improvements
**File:** `src/ai/client.ts`
- Add 10-second timeout via AbortController
- One automatic retry on network failure (not on 4xx errors)
- Check `navigator.onLine` before calling — show "You're offline" message instead of trying and failing

### 4.2 Trip generation fallback
**File:** `src/components/trips/NewTripForm.tsx`
- If AI fails, show error inline and keep the manual form visible (already partially works, but make it clearer)
- Add a "Try again" button on failure

### 4.3 Loading states
- Trip generation: skeleton placeholder showing category headers with pulsing item placeholders
- Notion import: progress indicator ("Parsing X items...")
- Learn from history: subtle spinner in SuggestionBanner, not blocking

## 5. Navigation

### 5.1 Manage default route
**File:** `src/App.tsx`
**Change:** `/manage` redirects to `/manage/items` so it never shows blank content.

### 5.2 Consistent header
**Not adding a global nav bar** — the app is simple enough that the current pattern (each page has its own back link) works. But ensure every page has a way to get back to the trips list.

### 5.3 PackingView back button
**File:** `src/components/packing/PackingView.tsx`
**Change:** Add a clear "← Trips" back button in the header.

## 6. Form Validation

### 6.1 ItemForm
**File:** `src/components/manage/ItemForm.tsx`
- Show "Name is required" below the name input if submitted empty
- Prevent qty < 1
- Highlight invalid fields with red border

### 6.2 KitForm
**File:** `src/components/manage/KitForm.tsx`
- Show "Name is required" below the name input if submitted empty

### 6.3 NewTripForm
**File:** `src/components/trips/NewTripForm.tsx`
- Validate: name or NL description required, departure date required, duration >= 1
- Show inline messages for each invalid field
- Disable "Generate list" button until form is valid

## 7. Empty States

Every list that can be empty gets a message:

| View | Empty state message |
|---|---|
| TripList (no trips) | Already has one ✓ |
| TripList (all completed) | "All packed! Plan your next trip." |
| MasterListView (no filter results) | "No items match your filter." |
| KitsView (no kits) | "No kits yet. Create one to group items for specific trip types." |
| TrashView (empty) | Already has one ✓ |
| PackingView (no items) | "This trip has no items. Go back and add some." |
| NotionImport (no results) | "No items found in that file." |

## 8. Loading States

| Operation | Loading state |
|---|---|
| AI trip generation | Skeleton: category headers with 3 pulsing item placeholders each |
| Notion import parsing | "Parsing your Notion export..." with spinner |
| Learn from history | Subtle spinner in SuggestionBanner area |

## 9. "Pack Like Last Time"

### 9.1 Duplicate trip
**File:** `src/components/trips/TripCard.tsx` and `src/store/index.ts`
**What:** Add a "duplicate" action on TripCard (next to rename/delete). Creates a new trip with the same profile, kits, and item list but fresh packed/included state. Navigates to the new trip's packing view.

### 9.2 Store action
**New action:** `duplicateTrip(id: string) → string` — copies trip data, resets `completedAt`, `isPacked` on all items, sets new `createdAt` and `departureDate` to today.

## Files Changed (estimated)

**New files (3):**
- `src/components/ErrorBoundary.tsx`
- `src/components/common/Toast.tsx`
- `src/store/toastStore.ts`

**Modified files (~15):**
- `src/ai/client.ts`
- `src/ai/learnFromHistory.ts`
- `src/lib/kitApply.ts`
- `src/store/index.ts`
- `src/App.tsx`
- `src/components/common/QtyBadge.tsx`
- `src/components/packing/PackingView.tsx`
- `src/components/packing/PackingItem.tsx`
- `src/components/packing/EssentialsGate.tsx`
- `src/components/packing/LastMinuteSection.tsx`
- `src/components/trips/NewTripForm.tsx`
- `src/components/trips/TripCard.tsx`
- `src/components/trips/TripList.tsx`
- `src/components/manage/MasterListView.tsx`
- `src/components/manage/KitsView.tsx`
- `src/components/manage/ItemForm.tsx`
- `src/components/manage/KitForm.tsx`
- `src/components/manage/ExportImport.tsx`
- `src/components/manage/NotionImport.tsx`
- `src/components/manage/TrashView.tsx`

## Out of Scope

- Seed data changes
- Data model / type changes (reserved for Plan C)
- Global nav bar
- Dark/light theme toggle
- i18n
- Code splitting
- Accessibility beyond semantic HTML basics
- Test coverage
