# Plan C: Grown-Up Version — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Structural improvements that make the codebase professional-quality — consolidate constants, add store selectors, automate PWA caching, code-split routes, add accessibility basics, improve API client, fix type safety.

**Architecture:** No new features. Extract shared constants, add computed getters to store, lazy-load routes, improve error typing. All changes are refactors or quality improvements.

**Tech Stack:** React 19, TypeScript 5.9, Zustand, Tailwind CSS v4, Vite 8

---

### Task 1: Extract shared constants

**Files:**
- Create: `src/constants.ts`
- Modify: `src/components/manage/ItemForm.tsx` (remove CATEGORIES, COMMON_TAGS)
- Modify: `src/components/common/TagChip.tsx` (remove TAG_COLOURS)
- Modify: `src/components/packing/PackingView.tsx` (remove LEFT_CATS, RIGHT_CATS)
- Modify: `src/lib/itemFilter.ts` (remove WEATHER_TAGS, TYPE_TAGS)
- Modify: `src/ai/parseTrip.ts` (use AI_MODEL)
- Modify: `src/ai/learnFromHistory.ts` (use AI_MODEL)
- Modify: `src/ai/importNotion.ts` (use AI_MODEL)

### Task 2: Computed store selectors

**Files:**
- Modify: `src/store/index.ts` (add getActiveItems, getTrashedItems, getActiveTrips, getCompletedTrips)
- Modify: all 7 components that filter masterItems inline
- Modify: `src/components/trips/TripList.tsx` (use getActiveTrips/getCompletedTrips)

### Task 3: PWA cache versioning

**Files:**
- Modify: `public/sw.js`
- Modify: `src/main.tsx`
- Modify: `vite.config.ts`

### Task 4: Code splitting with lazy routes

**Files:**
- Modify: `src/App.tsx`

### Task 5: Accessibility basics

**Files:**
- Modify: `src/components/common/Modal.tsx` (aria-label on close)
- Modify: `src/components/common/QtyBadge.tsx` (aria-labels on +/-)
- Modify: `src/components/common/Toast.tsx` (role="alert")
- Modify: `src/components/packing/PackingItem.tsx` (aria-labels)
- Modify: `src/components/trips/TripCard.tsx` (aria-labels)
- Modify: `src/components/manage/MasterListView.tsx` (aria-labels)
- Modify: `src/index.css` (focus ring base style)

### Task 6: API client typed errors and deduplication

**Files:**
- Modify: `src/ai/client.ts`

### Task 7: Type safety cleanup

**Files:**
- Modify: `src/ai/client.ts` (may overlap with Task 6 — do together)
- Modify: `src/ai/importNotion.ts` (add try-catch to JSON.parse)
- Modify: `src/ai/parseTrip.ts` (already has try-catch — verify)
- Modify: `src/components/trips/NewTripForm.tsx` (fix `as any` cast)

### Task 8: Final verification and deploy
