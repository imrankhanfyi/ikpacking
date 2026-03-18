# Packing App — Design Spec
**Date:** 2026-03-17
**Status:** Draft

---

## Problem

The user maintains packing lists in Notion by copying the previous trip's list and manually adapting it. This creates accumulating duplicate lists with no single source of truth. Lists drift from each other over time, and there is no intelligence — every trip requires the same manual effort.

---

## Goals

- One master item library that never duplicates
- Trip-specific lists generated from the master, requiring minimal manual adjustment
- AI that gets smarter over time by learning from packing history
- A packing UX designed for actual use mid-pack (glanceable, multi-column, progress-aware)
- No backend, no accounts — local web app, data in localStorage

## Non-Goals

- Mobile app (web/desktop only)
- Collaboration or sharing
- Integration with Notion or other external services
- Automatic syncing across devices

---

## Architecture

Three layers:

**1. Master Item Library**
The canonical list of every item the user might ever pack. Items live here permanently. New items are added when life changes (new medication, new gear). On first run, the existing Notion history is imported to seed the library.

**2. Kits**
Named, reusable bundles of items representing a discrete mode or activity. Kits are activated per-trip. Each kit can add items and/or swap items (e.g. International kit swaps main laptop → burner laptop).

**3. Trips**
A trip has a profile (dimensions) and a list of TripItems derived from the master + activated kits, with per-trip overrides. Trips are saved permanently as history. The AI uses trip history as context for generating future suggestions.

---

## Data Model

### MasterItem
```
{
  id: uuid,
  name: string,              // "rain jacket", "ritalin", "good chat"
  category: string,          // "Toiletries", "Clothing", "Meds", "Electronics", "Misc"
  tags: string[],            // ["cold-weather", "business", "warm-weather", "always"]
  defaultQty: number,        // 1, 2, 6 etc.
  qtyBasis: "fixed" | "per-day",  // per-day quantities are scaled by trip duration
  isLastMinute: boolean,     // true = lives in last-minute zone (charger, phone, toothbrush)
  isEssential: boolean,      // true = always surfaces in essentials gate (passport, meds)
}
```

### Kit
```
{
  id: uuid,
  name: string,              // "International", "Gym/workout", "Running", "Hiking", "Beach/warm"
  items: KitItem[],
}

KitItem: {
  masterItemId: uuid,
  qty: number,
  swapsItemId?: uuid,        // if set, this item replaces another (burner laptop → main laptop)
}
```

### Trip
```
{
  id: uuid,
  name: string,              // "Edinburgh Mar 26"
  createdAt: date,
  departureDate: date,       // required — drives last-minute resurfacing logic
  completedAt: date | null,
  profile: {
    duration: number,        // days
    weather: "cold" | "warm" | "mixed",
    type: "business" | "leisure" | "mixed",
    mode: "road-trip" | "carry-on" | "checked",
    nlDescription: string,   // raw natural language input if used
  },
  activeKitIds: uuid[],
  items: TripItem[],
}
```

### TripItem
```
{
  masterItemId: uuid | null, // null = one-off item not in master
  name: string,              // copied from master or freehand
  qty: number,               // may differ from master default
  isIncluded: boolean,       // false = user explicitly excluded this item
  isPacked: boolean,         // the checkbox
  isLastMinute: boolean,     // inherited from master, overridable
  isEssential: boolean,      // inherited from master, overridable
}
```

---

## Kits

Five built-in kits, all user-editable:

| Kit | Key items | Default state |
|-----|-----------|---------------|
| **International** | Passport(s), burner laptop (swaps main), destination adapter, travel docs, guidebook | Off — activated when trip is international |
| **Gym/workout** | Gym tops ×2, gym shorts ×2, gym socks ×2, swim trunks, headphones | Off — user activates |
| **Running** | Trail shoes, running tops ×2, shorts ×2, socks ×2, cap, sunscreen | Off — user activates (previously default, reduced due to ankle injury) |
| **Hiking** | Daypack, headlamp, hiking boots, water bottle, insect repellent | Off — user activates |
| **Beach/warm** | Flip flops, extra sunglasses (qty bump), sunscreen | Off — suggested on warm-weather trips |

---

## Trip Dimensions

Four profile dimensions, set at trip creation:

- **Duration** — number of days (drives per-day quantity calculations)
- **Weather** — cold / warm / mixed (drives tag filtering and kit suggestions)
- **Type** — business / leisure / mixed (drives tag filtering)
- **Mode** — road-trip / carry-on / checked (affects item suggestions, e.g. carry-on suppresses large liquids)

---

## Tag System

Master items are tagged to control which trips they appear on by default:

- `always` — appears on every trip regardless of profile
- `cold-weather` — suggested when weather = cold or mixed
- `warm-weather` — suggested when weather = warm or mixed
- `business` — suggested when type = business or mixed
- `leisure` — suggested when type = leisure or mixed
- `carry-on-safe` — relevant when mode = carry-on

Tags are additive — an item with `cold-weather` + `business` appears on cold business trips. Items with no tags default to `always`.

---

## Key Workflows

### 1. Create a trip

Two entry points:

**Natural language**: User types a freeform description ("5 days in Edinburgh, cold, one work dinner, carry-on"). The AI parses this into a trip profile and generates the item list. Parsed tags are shown as chips for confirmation/correction.

**Manual**: User sets duration (slider or number), weather, type, and mode via controls. App generates list from master using tag filtering.

After generation:
- AI suggests relevant kits ("Add Gym/workout kit? You usually bring it.") — user accepts/declines each
- Item list is shown for review. User can adjust quantities (inline +/− controls), uncheck items to exclude, or add one-off items not in the master
- One-off items remain trip-specific unless user explicitly promotes to master

### 2. Pack a trip

Main packing view:
- Two-column layout for desktop, less scrolling
- Items grouped by category across columns
- Each item has an inline quantity badge (×3) immediately after the name
- Progress bar at the top (N / total packed)
- Checked items strike through and visually dim

**Inline editing during packing** — the packing view is not read-only:
- Tap the quantity badge (×3) to edit the quantity inline
- "+ Add item" at the bottom of any section adds a one-off item to the trip (not promoted to master unless user requests it)
- Long-press or swipe an item to remove it (mark as excluded)

**Last-minute section** (bottom of view, dashed separator):
- Two sources populate it: (a) items explicitly flagged `isLastMinute` on the master (charger, phone), and (b) items from the main list that *were not* checked off — resurfaced here when the app is opened on or after `departureDate`
- Visually distinct zone — amber/warm tone to signal "morning of"

**Essentials gate** (triggered when user taps "Mark trip complete"):
- Surfaces all items where `isEssential = true` that are not yet confirmed packed
- User must explicitly confirm each one before the trip can be closed
- Meds automatically appear here always
- User-defined essentials (passport, charger) also appear

### 3. Complete a trip

After essentials gate confirmation, trip is marked complete and archived to history. It remains fully browsable. Past trips can be used as a reference or starting point when creating a new trip.

---

## AI Integration

Two distinct AI features, both powered by the Claude API:

### Natural language trip creation
The AI receives: the user's freeform description + their master item list + kit definitions. It returns: a structured trip profile (duration, weather, type, mode) + a suggested item list with quantities + recommended kits to activate. The raw NL description is stored on the trip for future reference.

### Learning layer (pattern recognition)
After each completed trip, the AI analyses the user's packing history to identify patterns:
- Items consistently unchecked → suggest reducing their default or removing from auto-suggest
- Items consistently added as one-offs → suggest promoting to master with appropriate tags
- Kit activation patterns → improve future kit suggestions
- Quantity adjustments → refine per-day calculations

The AI receives trip history as context (not a trained model — just in-context pattern analysis via the API). Suggestions are surfaced non-intrusively: "You've skipped nose strips on your last 4 trips — want to remove it from your default list?"

**Cold start**: Not an issue. The user's 11+ existing Notion lists are imported on first run, giving the AI immediate historical context.

---

## UI/UX Decisions

- **Two-column packing view** — categories split across columns, less scrolling while bag is open on the floor
- **Quantity as inline badge** — `×3` sits immediately after item name, not floated right
- **Last-minute as a zone, not a separate list** — same screen, dashed separator, visually distinct but not a context switch
- **Essentials gate as a modal/overlay** — triggered only when closing a trip, not persistent
- **No navigation chrome by default** — the home screen is trip creation/trip list; master list and kits are in a settings/manage area accessed when needed
- **Private items are private** — items with personal names (good chat, lucy's tablets) are displayed exactly as named, no prompts to clarify or rename

---

## Tech Stack

- **React + Vite** — local web app, no build server needed in production
- **localStorage** — all data persisted locally, no backend
- **OpenRouter API** — AI features (NL trip creation and pattern learning) via OpenRouter's OpenAI-compatible API. Model: a capable mid-tier model (e.g. claude-sonnet or equivalent available via OpenRouter). API key stored in localStorage and entered by the user on first run via a settings screen — acceptable for a local single-user app.
- **Tailwind CSS** — utility styling

## Data Export / Backup

All app data (master list, kits, trips) can be exported as a single JSON file and re-imported. Accessible from the management area. This protects against localStorage being wiped (browser data clear, new device). No automatic sync — purely manual backup.

---

## Management UI

A settings-style area, accessed from the main nav, for editing the underlying data. Visited occasionally, not part of the regular trip flow.

### Master list
- View all items, filterable by category and tag
- Add new item: name, category, tags, default qty, qty basis (fixed / per-day), `isLastMinute`, `isEssential`
- Edit any item inline
- Delete item — warns if the item has been used in past trips, but does not break history (TripItems store the name directly)

### Kits
- View all kits and their contents
- Create a new kit
- Edit a kit: add/remove items, set per-kit quantities, define swaps (e.g. burner laptop replaces main laptop)
- Rename or delete a kit
- **Conflict resolution**: if two active kits both swap the same item, the last-activated kit wins

### Tags
- Tags are strings on master items; primary editing is through the item edit form
- A tag overview shows all tags in use with item counts
- "Rename tag" applies the change globally across all items at once (e.g. renaming `cold-weather` → `cold`)
- Deleting a tag from the overview removes it from all items

---

## Import / Seeding

On first run, user is prompted to paste Notion list content (plain text / markdown). The AI parses the list, identifies items, deduplicates across multiple pasted lists (e.g. "allergy spray" and "hay fever stuff" flagged as likely duplicates for user confirmation), and populates the master item library. Tags and flags are inferred from context and shown for review before saving.

---

## Decided

- **Per-day quantity rounding**: Round up. Better to overpack than underpack. A 10-day trip with a `per-day` item defaults to 10; a 1.5-week trip (10.5 days) defaults to 11.
- **Learning layer trigger**: Runs automatically when a trip is marked complete. No user action required.

## Deferred (out of scope for v1)

- Whether to proactively suggest promoting one-off items to master (vs. only on user request)
- Whether to support marking a trip as "similar to" a past trip for faster AI reference
