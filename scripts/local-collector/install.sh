#!/usr/bin/env bash
# Schedule collect.sh daily with launchd (macOS), as the current user.
#
# 09:30 local time. launchd runs a missed calendar job when the machine next
# wakes, so a laptop asleep at 09:30 collects when it is opened. The daily
# series upstream keeps for about a year (ADR-0004) tolerate a late run, not
# a skipped week, and the GitHub watchdog reports the latter.
#
#   scripts/local-collector/install.sh       # install or update
#   scripts/local-collector/install.sh -u    # remove
set -euo pipefail

LABEL="com.hogcycle.collect"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/collect.sh"
LOG="$HOME/Library/Logs/hogcycle-collect.log"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
if [[ "${1:-}" == "-u" ]]; then
  rm -f "$PLIST"
  echo "removed $LABEL"
  exit 0
fi

mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG")"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>-lc</string><string>"$SCRIPT"</string></array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>30</integer></dict>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST

launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "installed $LABEL: daily at 09:30, log at $LOG"
