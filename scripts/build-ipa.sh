#!/usr/bin/env bash
# Build an unsigned Pack.ipa. Usage: scripts/build-ipa.sh [MARKETING_VERSION] [BUILD_NUMBER]
set -euo pipefail
cd "$(dirname "$0")/.."

MARKETING_VERSION="${1:-}"
BUILD_NUMBER="${2:-}"
OUT=build/ios

npm run build:ios

EXTRA=()
[ -n "$MARKETING_VERSION" ] && EXTRA+=("MARKETING_VERSION=$MARKETING_VERSION")
[ -n "$BUILD_NUMBER" ] && EXTRA+=("CURRENT_PROJECT_VERSION=$BUILD_NUMBER")

rm -rf "$OUT"
mkdir -p "$OUT"

xcodebuild archive -quiet \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -destination 'generic/platform=iOS' \
  -archivePath "$OUT/Pack.xcarchive" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO \
  ${EXTRA[@]+"${EXTRA[@]}"}

mkdir -p "$OUT/Payload"
cp -R "$OUT/Pack.xcarchive/Products/Applications/App.app" "$OUT/Payload/"
(cd "$OUT" && zip -qry Pack.ipa Payload && rm -rf Payload)
echo "Built $OUT/Pack.ipa"
