# Pack

A personal packing list app with reusable kits, AI-powered trip generation, and cross-device sync.

## Quick Start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build → dist/
npm test             # vitest
./deploy.sh          # build + deploy to server (checks for uncommitted changes)
```

## Stack

React 19, TypeScript 5.9, Vite 8, Zustand (state + persistence), Tailwind CSS v4, OpenRouter (Claude Haiku) for AI features.

## How It Works

**Master list** — one canonical library of items with categories, tags, quantities, and flags (essential, last-minute).

**Kits** — reusable groups of items (International, Gym, Hiking, etc.) that can be toggled on when creating a trip.

**Trips** — generated from master list + active kits based on trip profile (duration, weather, type, travel mode). Items can be adjusted, added, or removed per-trip.

**AI features** — describe a trip in plain English and AI parses it into a structured profile; AI learns from completed trips and suggests master list changes; import from Notion exports with AI categorisation.

**Sync** — data syncs to a server (Hetzner) via a tiny Node.js API. All devices share one source of truth. Falls back to localStorage if sync isn't configured.

## Deployment

Hosted on Hetzner (94.130.96.213). Caddy serves static files and proxies `/api/*` to the sync server. See `docs/operations.md` for full setup, server migration, and troubleshooting.

## Design

"Analog Postcard" — white background, bold 1.5px borders, red-orange accent, monospace uppercase labels, stamp-style status badges. See `docs/superpowers/specs/` for design history.

## Key Design Decisions

- **Kits over destination tags** — activity-based kits (Hiking, Gym) are more stable than destination kits (UK kit) which go stale
- **Three-layer packing flow** — regular list (night before) → last-minute section (morning of departure) → essentials gate (confirm before closing trip)
- **Client-side AI** — browser calls OpenRouter directly, no backend proxy needed for personal use
- **Soft delete** — master items go to trash, can be restored. Trips have undo via toast.
- **Server sync** — single JSON file on server, loaded on app init, saved on every change (debounced 1.5s)

## Project Structure

```
src/
  constants.ts          — shared constants (categories, tags, AI model)
  types/index.ts        — all TypeScript types
  store/index.ts        — Zustand store with all actions
  store/sync.ts         — server sync (load/save/subscribe)
  store/seed.ts         — initial seed data for first-time users
  store/toastStore.ts   — toast notification state
  ai/client.ts          — OpenRouter API wrapper (typed errors, retry, dedup)
  ai/parseTrip.ts       — NL trip description → structured profile
  ai/learnFromHistory.ts — completed trips → pattern suggestions
  ai/importNotion.ts    — Notion markdown → master items
  lib/                  — pure logic (item filtering, kit application, quantities)
  components/           — React components (trips, packing, manage, common)
```

## Docs

- `docs/operations.md` — how to deploy, sync, migrate servers, rotate tokens
- `docs/superpowers/specs/` — design specs (architecture baseline, Plan B, Plan C)
- `docs/superpowers/plans/` — implementation plans
