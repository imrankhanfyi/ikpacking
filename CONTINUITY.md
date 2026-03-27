# Packing App — Continuity

## Current State

- App runs with `npm install` + `npm run dev` (Vite on localhost:5173)
- Fixed `@tailwindcss/vite` peer dep (bumped to ^4.2.2 for Vite 8 compat)
- Stack: React, TypeScript, Vite, Zustand, Tailwind, OpenRouter AI

## Open Question: Simplify the Stack?

Imran questioned whether the current stack is overkill for a personal packing app. We discussed:

- **Current stack**: React + Vite + TS + Zustand + Tailwind — good for growing, but heavy for what's essentially a data-focused tool
- **Alternative**: A single HTML file with vanilla JS/CSS — no build step, opens directly in a browser, still supports all the features that matter
- **Conclusion so far**: The features Imran cares about (kits, learning preferences, AI suggestions) are all data-driven and don't require React. No decision made yet on whether to simplify.

## What Imran Wants from the App

- Add and manage packing "kits" (groups of items)
- App learns about him over time (tracking what he packs/unpacks)
- AI-powered suggestions (currently via OpenRouter + Claude Haiku)
- Simple to run and maintain

## Deployment

- Not yet deployed anywhere
- Static hosting (Vercel, GitHub Pages, Cloudflare Pages) would all work
- If shared publicly, the OpenRouter API key would need a server-side proxy to stay private
- For personal use, current client-side key approach is fine

## Technical Notes

- AI calls go directly from browser to OpenRouter API (`src/ai/client.ts`)
- All data stored in `localStorage` via Zustand (`src/store/index.ts`)
- `package.json` had a dep conflict on first install — resolved by bumping `@tailwindcss/vite`
