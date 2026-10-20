# Pack — project rules

## Every app change ships to web AND iPhone
Imran wants the iPhone app updated automatically with every change; never wait to be asked.
After any change that affects the app (src/, public/, index.html, capacitor.config.ts, ios/):
1. Verify: `npm test`, `npm run build`, and `npm run test:ios` (UI tests on the tokenless
   "Pack UITest" simulator; review the screenshots in build/ios/uitest-screenshots/).
2. `/ship` (commit, merge, push).
3. `./deploy.sh`. It deploys the web app AND publishes a new iPhone build to the AltStore
   source. If the auto-mode classifier blocks it, ask Imran to run `! ./deploy.sh`; don't work
   around it.
4. Confirm `curl -s https://pack.imrankhan.fyi/ios/source.json` shows the new version, then tell
   Imran to tap **Update** on Pack in AltStore. AltStore never installs updates by itself
   (observed 2026-10-20).
Data needs no release: it syncs through the server. Docs-only changes: `SKIP_IOS=1 ./deploy.sh`
or skip the deploy entirely.
Retire this rule if deploys move to CI.

## Never test against prod
Never run UI tests on Imran's own "iPhone 17" simulator, which holds the real sync token.
Installing a new build there is fine. iPhone setup and release details: docs/ios.md.
