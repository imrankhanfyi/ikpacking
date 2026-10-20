#!/bin/bash
set -e

# Ensure everything is committed and pushed before deploying
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: uncommitted changes. Commit and push first."
  exit 1
fi

if [ -n "$(git log @{u}..HEAD 2>/dev/null)" ]; then
  echo "Error: unpushed commits. Run 'git push' first."
  exit 1
fi

echo "Building..."
npm run build

echo "Deploying to server..."
scp -r dist/* root@94.130.96.213:/var/www/pack/

# iPhone app: build a new IPA and update the AltStore source so the phone
# offers the update (see docs/ios.md). SKIP_IOS=1 for a web-only deploy.
if [ "${SKIP_IOS:-}" != "1" ]; then
  echo "Publishing iPhone build..."
  scripts/release-ios.sh
  ssh root@94.130.96.213 'mkdir -p /var/www/pack/ios'
  scp build/ios/release/* root@94.130.96.213:/var/www/pack/ios/
fi

echo "Done — live at http://94.130.96.213"
