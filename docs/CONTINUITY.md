# Session Continuity — Packing App

**Date:** 2026-03-17
**Status:** Design + planning complete. Ready to execute implementation plan.

---

## What we're building

A personal local web app for managing packing lists. The core problem: Imran has been copying Notion packing lists for each trip, resulting in accumulated duplicates with no single source of truth.

---

## Where we are

**Completed:**
1. Brainstorming session with user — full design validated
2. Spec written and reviewed → `docs/superpowers/specs/2026-03-17-packing-app-design.md`
3. Implementation plan written and reviewed → `docs/superpowers/plans/2026-03-17-packing-app.md`

**Next step:** Execute the implementation plan. Invoke `superpowers:subagent-driven-development` to execute.

---

## Key design decisions (and why)

**Master list + kits + trips model**
- One canonical item library (master list) with tags and default quantities
- Five reusable kits: International, Gym/workout, Running, Hiking, Beach/warm
- Trips are generated from master + activated kits, with per-trip overrides
- No duplication — trips store only what changes

**Kits, not destination tags**
- Destination-specific kits (UK kit) were considered and rejected — they go stale (user didn't bring oyster card or UK money on last UK trip)
- Activity/mode kits (International, Hiking) are more stable

**Running kit is OFF by default**
- User has an ankle injury and now packs gym/workout gear instead of running gear
- Both kits exist; neither is default-on

**Three-layer packing flow**
1. Regular list — pack the night before
2. Last-minute section — items being used until morning (charger, phone) + any unpacked items resurfaced on departure day
3. Essentials gate — modal before closing trip; meds always appear, user-flagged essentials also appear

**AI via OpenRouter**
- User has OpenRouter keys (not direct Anthropic API)
- Two AI features: NL trip creation (describe trip → AI parses → generates list) and learning layer (analyses completed trips → surfaces patterns)
- API key stored in localStorage (local single-user app, acceptable)

**No backend**
- All data in localStorage via Zustand persist
- JSON export/import for backup (important — localStorage can be wiped)
- `departureDate` field on Trip drives last-minute resurfacing logic

---

## Key files

| Path | Purpose |
|------|---------|
| `docs/superpowers/specs/2026-03-17-packing-app-design.md` | Full design spec |
| `docs/superpowers/plans/2026-03-17-packing-app.md` | Implementation plan (16 tasks) |
| `Private & Shared/Packing master/` | User's exported Notion packing lists (source data) |

---

## Tech stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Zustand (state + localStorage persistence)
- React Router v6
- Vitest + React Testing Library
- OpenRouter API (OpenAI-compatible, fetch — no SDK)
- Model: `anthropic/claude-sonnet-4-5` via OpenRouter

---

## User context

- Imran — travels frequently, mix of business/leisure, domestic/international
- Destinations include UK, US (NYC, Martha's Vineyard, Palm Desert), Japan, New Zealand, etc.
- Carries medications (some nicknamed: "good chat", "lucy's tablets" = personal nicknames — never prompt to clarify)
- Has ankle injury — running kit is less relevant now, gym/workout kit is the default
- Packs the night before, some items go in last-minute (charger, toothbrush)
- 11+ historical Notion lists available in `Private & Shared/Packing master/` for import

---

## Seed data note

The Zustand store is seeded with master items derived from Imran's actual Notion lists. The five built-in kits are stubs — their item lists are mostly empty and will be populated either via the Kit management UI or the Notion import flow.

---

## To resume in a new session

1. Read this file
2. Read `docs/superpowers/specs/2026-03-17-packing-app-design.md` for full design context
3. Read `docs/superpowers/plans/2026-03-17-packing-app.md` for the implementation plan
4. Invoke `superpowers:subagent-driven-development` to execute the plan
