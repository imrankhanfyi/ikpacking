#!/usr/bin/env bash
# Run the local-only iOS UI tests against the real app on a DEDICATED simulator ("Pack UITest").
# The fresh simulator has no sync token, so nothing here can reach the production server.
# Usage: npm run test:ios   (env: SKIP_BUILD=1 to skip the web build)
set -uo pipefail
cd "$(dirname "$0")/.."

SIM_NAME="Pack UITest"
RUNTIME="com.apple.CoreSimulator.SimRuntime.iOS-26-5"
BUNDLE_ID="fyi.imrankhan.pack"
OUT=build/ios
RESULT="$OUT/uitest.xcresult"
SHOTS="$OUT/uitest-screenshots"
mkdir -p "$OUT"

[ -z "${SKIP_BUILD:-}" ] && { npm run build:ios || exit 1; }

UDID=$(xcrun simctl list devices | grep -F "$SIM_NAME (" | grep -oE '[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}' | head -1)
if [ -z "$UDID" ]; then
  echo "Creating simulator '$SIM_NAME'"
  UDID=$(xcrun simctl create "$SIM_NAME" "iPhone 17" "$RUNTIME") || exit 1
fi
echo "Using simulator '$SIM_NAME' ($UDID)"
xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1
xcrun simctl terminate "$UDID" "$BUNDLE_ID" >/dev/null 2>&1
xcrun simctl uninstall "$UDID" "$BUNDLE_ID" >/dev/null 2>&1

rm -rf "$RESULT" "$SHOTS"
PACK_UITEST_SCRATCH="$PWD/$OUT/uitest-scratch" \
xcodebuild test -project ios/App/App.xcodeproj -scheme App \
  -destination "platform=iOS Simulator,id=$UDID" \
  -resultBundlePath "$RESULT" CODE_SIGNING_ALLOWED=NO > "$OUT/uitest.log" 2>&1
XC=$?

mkdir -p "$SHOTS"
RAW="$OUT/uitest-attachments-raw"; rm -rf "$RAW"
xcrun xcresulttool export attachments --path "$RESULT" --output-path "$RAW" >/dev/null 2>&1
python3 -I - "$RAW" "$SHOTS" <<'PY'
import json, os, re, shutil, sys
raw, out = sys.argv[1:3]
mf = os.path.join(raw, "manifest.json")
if not os.path.exists(mf): sys.exit(0)
skip = ("UI Snapshot", "Synthesized Event", "Debug description", "App UI hierarchy", "Screen Recording")
for t in json.load(open(mf)):
    test = re.sub(r"\W+", "_", t["testIdentifier"].split("/")[-1]).strip("_")
    d = os.path.join(out, test); os.makedirs(d, exist_ok=True)
    for a in t["attachments"]:
        n = a["suggestedHumanReadableName"]
        if n.startswith(skip): continue
        base = re.sub(r"_\d+_[0-9A-F-]{36}", "", n)   # strip xcresult's index/uuid suffix
        shutil.copy(os.path.join(raw, a["exportedFileName"]), os.path.join(d, base))
PY
rm -rf "$RAW"

echo; echo "=== Per-test results ==="
xcrun xcresulttool get test-results tests --path "$RESULT" 2>/dev/null | python3 -I -c '
import json, sys
def walk(n):
    if n.get("nodeType") == "Test Case": print("%-6s %s" % (n.get("result","?").upper(), n["name"]))
    for c in n.get("children", []): walk(c)
for n in json.load(sys.stdin).get("testNodes", []): walk(n)
'
echo; echo "Screenshots + notes: $SHOTS"
echo "Result bundle:       $RESULT"
echo "Full log:            $OUT/uitest.log"
exit $XC
