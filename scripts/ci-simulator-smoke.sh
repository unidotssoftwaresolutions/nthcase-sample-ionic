#!/usr/bin/env bash
# CI only (GitHub's macOS runner): installs the Simulator .app on an iOS 26 simulator, opens it, opens the deep link,
# and saves a screenshot of each. The simulator is named by its UDID throughout: never "booted", which means every
# booted simulator on the machine.
#
#   scripts/ci-simulator-smoke.sh <output folder> <path to App.app>
set -euo pipefail

out="$1"
app="$2"
mkdir -p "$out"

udid=$(xcrun simctl list devices available -j | python3 -c '
import json, sys
devices = json.load(sys.stdin)["devices"]
for runtime in sorted(devices, reverse=True):
    if ".iOS-26-" not in runtime:
        continue
    for device in devices[runtime]:
        if device["name"].startswith("iPhone"):
            print(device["udid"])
            sys.exit(0)
sys.exit("No iPhone simulator with an iOS 26 runtime on this runner")
')
echo "Simulator: $udid"

xcrun simctl boot "$udid"
xcrun simctl bootstatus "$udid" -b
xcrun simctl install "$udid" "$app"
xcrun simctl launch "$udid" com.nthcase.sample
sleep 15
xcrun simctl io "$udid" screenshot "$out/01-launch.png"
xcrun simctl openurl "$udid" "nthcase-sample://item/7"
sleep 5
xcrun simctl io "$udid" screenshot "$out/02-deep-link.png"
xcrun simctl shutdown "$udid"
