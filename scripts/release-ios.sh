#!/usr/bin/env bash
# Build Pack.ipa and stage a self-hosted AltStore/SideStore source in build/ios/release/
# (Pack-<version>.ipa, icon.png, source.json). Upload that folder to /var/www/pack/ios/ —
# see docs/ios.md — and installed copies offer it as an in-app update.
# Usage: scripts/release-ios.sh            (ALLOW_DIRTY=1 to stage uncommitted work)
set -euo pipefail
cd "$(dirname "$0")/.."

BASE_URL=https://pack.imrankhan.fyi/ios
OUT=build/ios

if [ -n "$(git status --porcelain)" ] && [ "${ALLOW_DIRTY:-}" != "1" ]; then
  echo "Error: uncommitted changes. Commit first (or ALLOW_DIRTY=1)."
  exit 1
fi

# Timestamp version: always increases, so AltStore/SideStore always see a newer build.
STAMP=$(date +%y%m%d%H%M)
VERSION="1.0.$STAMP"
scripts/build-ipa.sh "$VERSION" "$STAMP"

REL="$OUT/release"
IPA_NAME="Pack-$VERSION.ipa"
mkdir -p "$REL"
cp "$OUT/Pack.ipa" "$REL/$IPA_NAME"
cp public/icon-512.png "$REL/icon.png"
SIZE=$(stat -f%z "$REL/$IPA_NAME")

# Source format: https://faq.altstore.io/developers/make-a-source
# appPermissions must match the app exactly (currently no entitlements or privacy keys).
VERSION="$VERSION" STAMP="$STAMP" SIZE="$SIZE" IPA_NAME="$IPA_NAME" BASE_URL="$BASE_URL" \
  COMMIT="$(git describe --always --dirty)" OUTFILE="$REL/source.json" node -e '
const e = process.env
const source = {
  name: "Pack",
  subtitle: "Personal packing list",
  iconURL: `${e.BASE_URL}/icon.png`,
  website: "https://pack.imrankhan.fyi",
  tintColor: "#e05a33",
  nsfw: false,
  apps: [{
    name: "Pack",
    bundleIdentifier: "fyi.imrankhan.pack",
    developerName: "Imran Khan",
    subtitle: "A smarter packing list",
    localizedDescription: "Master list, reusable kits and trips, synced with pack.imrankhan.fyi.",
    iconURL: `${e.BASE_URL}/icon.png`,
    tintColor: "#e05a33",
    category: "utilities",
    versions: [{
      version: e.VERSION,
      buildVersion: e.STAMP,
      date: new Date().toISOString(),
      localizedDescription: `Build from ${e.COMMIT}`,
      downloadURL: `${e.BASE_URL}/${e.IPA_NAME}`,
      size: Number(e.SIZE),
      minOSVersion: "15.0",
    }],
    appPermissions: { entitlements: [], privacy: {} },
  }],
  news: [],
}
require("fs").writeFileSync(e.OUTFILE, JSON.stringify(source, null, 2) + "\n")
'

echo "Staged $VERSION ($SIZE bytes) in $REL"
ls -1 "$REL"
