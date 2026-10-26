# Product Roadmap

**Last updated:** 2026-10-26

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

## Public App Store Release

**Status:** Exploring (discussed 2026-10-26; nothing built)

Release Pack free on the App Store, aiming for a few hundred users. The main
goal is to use it as a test case for future app projects, so the reusable parts
matter as much as Pack itself: the developer account, the upload pipeline, the
sign-in pattern, and a privacy and App Review checklist.

**Why it's a real project:** the server is built for one person. It checks a
single shared token (`PACK_SYNC_TOKEN`) and keeps everyone's data in one
`data.json`, so anyone who connects shares the same trips. The AI key is also
pasted into each device.

**Rough order:**

1. **Enrol in the Apple Developer Program** ($99/yr; Imran does this).
2. **Probe App Review before building accounts.** Submit the current app with
   few changes. Decision rule, agreed in advance: if it's approved, or rejected
   only for missing account or privacy items, continue with this plan. If it's
   rejected as a website in a wrapper with too little native function
   (guideline 4.2), stop and rethink. Try adding native features before
   considering a rewrite.
3. **Accounts and per-user data.** Recommended: Sign in with Apple only (no
   passwords, no email service, and it can be reused on future projects). The
   simpler fallback is an anonymous token per install, with the existing QR
   connect link for a second device, but anyone who loses their token loses
   their data. Either way, include account deletion inside the app (an App Store
   requirement), and move Imran's existing data into his account carefully. That
   step can't be undone on production, so take backups first.
4. **Server-side AI key with a cap per user.** See "Server-Side AI Key" above. For public
   users it needs per-user limits so a few heavy users can't run up the
   OpenRouter bill. Check current pricing before setting the cap.
5. **Required security hardening.** See "Sync and Security Hardening" below.
   It's optional for one user and required for strangers.
6. **Store listing:** app name (plain "Pack" is probably taken; names must be
   unique), privacy policy, privacy labels, screenshots, age rating, and a
   support URL.
7. **Upload pipeline:** build, sign and upload to App Store Connect from
   `deploy.sh`.

**Estimate:** roughly 3–5 working sessions of code. On the calendar, expect
about 1–2 weeks, mostly waiting on Apple (enrolment, plus one or more review
rounds) and on Imran's decisions. These are estimates, not measured.

**Not first: a Swift/SwiftUI rewrite.** The Capacitor app already stores data
natively on the phone, and one codebase serves both the website and the iPhone.
A rewrite would split that in two, and the sync merge logic in
`shared/syncMerge.mjs` would have to be reproduced exactly in Swift. The app is
small (about 3,200 lines across 50 TypeScript files in `src/`, not counting
`*.test.*`), so a rewrite is doable if needed. Reconsider only if App Review
rejects the wrapper, or if future projects will be native Swift apps (open
question).

**Smaller alternative:** if the only goal were to stop AltStore's 7-day
re-signing, TestFlight with the same Developer account would do it with no app
changes. Builds last 90 days.

## Sync and Security Hardening

**Status:** Deferred hardening (becomes required before a public App Store
release; see above)

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
