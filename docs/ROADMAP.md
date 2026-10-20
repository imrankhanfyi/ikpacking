# Product Roadmap

**Last updated:** 2026-10-20

This is the living roadmap for Pack. It collects future-development ideas that
were previously spread across design documents. Items are directional rather
than scheduled commitments; sequencing and timelines will be decided when each
item is taken up.

## Server-Side AI Key

**Status:** Proposed — priority (next up)

Move the OpenRouter call from the browser/phone onto the sync server, so the
API key lives on the server once and no device ever needs it pasted in
(including fresh iPhone installs).

- Add an authenticated AI endpoint to `server/server.mjs` (same sync-token
  check), holding the OpenRouter key server-side; keep the existing typed
  errors, retry and dedup from `src/ai/client.ts`.
- Point the four AI features (`parseTrip`, `learnFromHistory`,
  `importNotion`, via `src/ai/client.ts`) at it; remove the per-device key
  field from `ApiSettings` once it works.
- Cap request size and rate on the endpoint (it spends money).

Considered and parked (2026-10-20): running AI through the user's ChatGPT
subscription via `codex exec` on the server, to avoid paying for credits.
Concerns: likely much slower per request (a full agent per call), unclear
whether OpenAI's terms allow a ChatGPT-plan Codex as an app backend, and new
exposure from an agent reachable over the internet. Haiku via OpenRouter is
cheap, so not worth it now. If revisited, first time ~5 trip-parse runs
locally and build only if all return valid JSON and the median is under 10s.

## Smarter Trip Reuse

**Status:** Proposed

Make previous packing behavior more useful when creating new trips.

- Proactively suggest promoting items that are repeatedly added as one-offs to
  the master list. Manual promotion is already available during trip review.
- Allow a new trip to be marked as similar to a past trip so its packing list
  can be used as a stronger starting point.
- Keep suggestions understandable and user-controlled; learned behavior should
  never silently rewrite the master list.

Source: [Packing app design](superpowers/specs/2026-03-17-packing-app-design.md#deferred-out-of-scope-for-v1)

## Native iPhone App

**Status:** Shipped 2026-10-20 (installed on iPhone via AltStore, iOS 26.6.2)

Package the existing React app as a native iPhone app using Capacitor, reusing
the current interface while improving storage durability.

- Switch routing and asset configuration for the Capacitor environment.
- Move persistence to native durable storage so iOS cannot evict the packing
  data like browser local storage.
- Adapt service-worker and OpenRouter behavior for the native URL scheme.
- Distribute by sideloading via AltStore Classic, with SideStore as the
  fallback. No Apple Developer account is needed (free Apple ID).

Confirmed 2026-10-20: macOS AltServer 1.7.3 installs and runs Pack on iOS
26.6.2. SideStore stays the documented fallback.

Details: [iOS app](ios.md).
Source: [Sync design, Phase 2](sync-design.md#10-phase-2--iphone-app-via-capacitor-built-2026-10-20)

## Sync and Security Hardening

**Status:** Deferred hardening

Strengthen the existing sync service after its current architecture has had
more production use.

- Limit server request-body size.
- Use timing-safe authentication comparisons.
- Add tombstone garbage collection with a suitable retention period.
- Add rate limiting and exclude authorization data from proxy logs.
- ~~Use Capacitor Preferences if native durable storage is introduced.~~ Done (2026-10-20, iOS app).

Source: [Sync design, deferred hardening](sync-design.md#11-deferred-hardening-recorded-so-it-isnt-lost)

## Longer-Term Product and Code Quality

**Status:** Exploratory backlog

Improve accessibility, adaptability, and maintainability when product needs
justify the investment.

- Complete a full accessibility audit, including screen-reader testing and
  color-contrast remediation.
- Add internationalization support if Pack expands beyond its current audience.
- Revisit the nullable `masterItemId` data model and consider a discriminated
  item type if the migration benefit comes to outweigh the risk.
- Expand automated coverage where it protects new or high-risk behavior.

Source: [Plan C design, out of scope](superpowers/specs/2026-03-28-plan-c-grown-up-design.md#out-of-scope)

## Maintaining This Roadmap

When work begins, update its status here and link the approved design or
implementation plan. When work ships, move it to the project history or mark it
complete rather than leaving its status ambiguous.
