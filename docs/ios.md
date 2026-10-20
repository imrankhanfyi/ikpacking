# Pack on iPhone — setup guide

Pack's iPhone app is the same app as the website. It's installed outside the App Store using
**AltStore** (free Apple ID), and the website keeps working as before. Your data syncs between
them through the same server.

Updates arrive inside AltStore: when a new version is published, AltStore shows an **Update**
button for Pack.

> Steps marked **(you)** need your hands or your Apple ID. Everything else is already done.

## 0. Publishing updates (automatic with each deploy)

`./deploy.sh` deploys the website **and** publishes a new iPhone build to the source.
Run it after any app change (`SKIP_IOS=1 ./deploy.sh` for website-only). To publish by hand:
run `scripts/release-ios.sh` (stages `build/ios/release/`), then:

```bash
ssh root@94.130.96.213 'mkdir -p /var/www/pack/ios' && scp build/ios/release/* root@94.130.96.213:/var/www/pack/ios/
```

Check it's live: https://pack.imrankhan.fyi/ios/source.json should show the app details.

## 1. Install AltServer on the Mac (you, once)

Source: [AltStore's official macOS guide](https://faq.altstore.io/altstore-classic/how-to-install-altstore-macos).

1. Download AltServer from [altstore.io](https://altstore.io), then move **AltServer.app** to
   Applications and open it. It runs from the menu bar (a diamond icon), not the Dock.
2. Make it start at login: System Settings → General → Login Items → add AltServer. The weekly
   refresh only happens while AltServer is running.
3. If AltServer shows an **"Install Mail Plug-in…"** alert, follow
   [the Mail plug-in steps](https://faq.altstore.io/altstore-classic/how-to-install-altstore-macos/enable-mail-plug-in).
   Otherwise skip this.

## 2. Put AltStore on the iPhone (you, once)

1. Plug the iPhone into the Mac with a cable, unlock it, and tap **Trust** if asked.
2. In Finder, click the iPhone in the sidebar and tick **"Show this iPhone when on Wi-Fi"**. This
   lets refreshes happen without the cable later.
3. Click the AltServer menu-bar icon → **Install AltStore** → choose your iPhone.
4. Enter your Apple ID and password. AltStore says these are sent only to Apple. They're
   never stored in this project and I never see them.
5. On the iPhone: **Settings → General → VPN & Device Management** → tap your Apple ID → **Trust**.
6. On the iPhone: **Settings → Privacy & Security → Developer Mode** → on, then restart when
   asked. The option may only appear after step 3.

## 3. Add Pack's source and install Pack (you, once)

1. Open **AltStore** on the iPhone → **Sources** tab → **+** → enter
   `https://pack.imrankhan.fyi/ios/source.json`.
2. Find **Pack** in that source → **Free / Install**. Keep the Mac awake on the same Wi-Fi while
   it installs.
3. Open Pack → **Manage → API key**:
   - Paste your **sync token** into Server sync → **Save & connect**. Copy it on the Mac first;
     Universal Clipboard lets you paste it on the phone.
   - Optionally paste your OpenRouter key (it isn't synced between devices).

Your trips should appear within a few seconds.

## 4. Keeping it running

- **Free Apple IDs sign apps for 7 days.** AltStore refreshes Pack automatically in the
  background whenever the iPhone and the Mac (with AltServer running) are on the same Wi-Fi. You
  can also open AltStore → **My Apps** → **Refresh All**.
- **If it lapses**, Pack won't open until you refresh it. **Nothing is lost**: your data is on the
  server and stays in the app. pack.imrankhan.fyi in Safari works in the meantime.
- Free accounts allow **3 sideloaded apps** at a time (AltStore itself counts as one).

## If AltStore ever stops working → SideStore

Confirmed working on 2026-10-20: AltServer 1.7.3 (Mac) with iOS 26.6.2. If a future iOS update
breaks it (install fails, or Pack crashes on launch), switch to **SideStore**
([official docs](https://docs.sidestore.io)). SideStore refreshes from the phone itself, with no
plugging in after the first setup. Pack's source URL works in SideStore too.

## For maintainers

- Build web + iOS: `npm run build:ios`
- Automated UI tests (simulator, never touches prod): `npm run test:ios`
- Stage a release: `scripts/release-ios.sh` (refuses uncommitted work unless `ALLOW_DIRTY=1`)
- Source format reference: [AltStore — make a source](https://faq.altstore.io/developers/make-a-source).
  `appPermissions` must match the app exactly. Today the app has no entitlements and no privacy
  keys, so it's empty. If a plugin that needs permissions (camera etc.) is added, update it in
  `scripts/release-ios.sh`.
