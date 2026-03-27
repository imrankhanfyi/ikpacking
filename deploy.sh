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

echo "Done — live at http://94.130.96.213"
