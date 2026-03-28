# Plan C: Grown-Up Version — Design Spec

**Date:** 2026-03-28
**Scope:** Structural and architectural improvements that make the codebase professional-quality. Builds on Plan B.
**Audience:** Same (personal app), but codebase ready for Capacitor/expansion.
**Approach:** Execute all changes, verify at end.

## 1. Consolidate Duplicated Constants

Categories are hardcoded in 5+ files, tags in 6+ files, AI model in 3 files. Extract to single source of truth.

**New file:** `src/constants.ts`
- `CATEGORIES` — the 5 category names
- `CATEGORY_LAYOUT` — left/right column split for packing view
- `ITEM_TAGS` — the 5 common tags
- `TAG_COLORS` — tag color map (currently in TagChip)
- `AI_MODEL` — `'anthropic/claude-haiku-4-5'`

Update all consumers to import from constants.

## 2. Computed Store Selectors

The pattern `useStore(s => s.masterItems)` + `allItems.filter(i => !i.deletedAt)` repeats in 7 files. Add getter functions to the store:

- `getActiveItems()` — masterItems where deletedAt is falsy
- `getTrashedItems()` — masterItems where deletedAt is truthy
- `getActiveTrips()` — trips where completedAt is null, sorted by departureDate
- `getCompletedTrips()` — trips where completedAt is set, sorted descending

Components call `useStore(s => s.getActiveItems())` — returns stable array reference when the underlying data hasn't changed.

## 3. PWA Cache Versioning

Replace manual `CACHE_NAME = 'pack-v2'` with build-time injection.

**Approach:** Use Vite's `define` to inject a build timestamp into sw.js at build time. The service worker is in `public/` so Vite doesn't process it directly — instead, create a Vite plugin that rewrites `__BUILD_ID__` in the copied sw.js during build.

Simpler alternative: move sw.js generation into the build step via a small Vite plugin, or just inject the version via `index.html` meta tag and read it in the SW. Simplest: use the Vite build hash from the output filenames.

**Chosen approach:** Add a `version.ts` that exports a build timestamp, import it in `main.tsx`, pass to SW registration as a query param. SW reads version from its own URL and uses it as cache name.

## 4. Code Splitting

Lazy-load routes that aren't needed on initial page load:
- `ManageLayout` and all manage sub-routes
- `NewTripForm`
- `PackingView`

Keep `TripList` and `Onboarding` eagerly loaded (they're the entry points).

Wrap lazy routes in `<Suspense fallback={...}>`.

## 5. Accessibility

Focus on the highest-impact gaps:
- `aria-label` on all icon-only buttons (close, remove, +, -, copy, rename, del)
- Wrap forms in `<form>` elements with `onSubmit` handlers
- Add `focus:ring-2 focus:ring-indigo-500` to all interactive elements via a Tailwind base layer
- Add `role="alert"` to toast notifications and error messages

Skip: full WCAG audit, screen reader testing, color contrast fixes (these are Plan D territory).

## 6. API Client Improvements

- Add typed errors: `ApiError` class with `kind` discriminator (offline, timeout, auth, rate-limit, server, parse)
- Add request deduplication: if a request with the same prompt is already in-flight, return the pending promise instead of firing a new one
- Extract temperature as configurable parameter
- Centralize the model constant (from section 1)

## 7. Type Safety Cleanup

- Replace all `catch (e: any)` with `catch (e: unknown)` and proper narrowing
- Replace `(profile as any)[key]` in NewTripForm with typed approach
- Add try-catch to JSON.parse calls in importNotion.ts and parseTrip.ts

## 8. Seed Merge Fix

`mergeMissingSeeds` currently re-adds seed items that were intentionally deleted (soft-deleted items are counted by name, so they block re-add — but permanently deleted seeds get re-added). Fix: track permanently deleted seed names in a `dismissedSeeds: string[]` field in settings, skip those in merge.

## Out of Scope

- Data model restructuring (masterItemId nullable → discriminated union) — too much migration risk for the benefit
- Full WCAG compliance
- i18n
- Test coverage
- React.memo optimization (premature until we see performance issues)
