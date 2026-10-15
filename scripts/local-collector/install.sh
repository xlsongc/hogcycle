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

# launchd runs the job with a bare PATH, where `python3` is the system's 3.9
# and the backend needs 3.11. Resolve the interpreter here, from the shell
# that is installing, and write it into the job: a collector that cannot
# install itself fails every morning in a log nobody reads.
PY="${HOGCYCLE_PYTHON:-$(command -v python3 || true)}"
if [[ -z "$PY" ]] || ! "$PY" -c 'import sys; sys.exit(sys.version_info < (3, 11))'; then
  echo "need Python 3.11 or later; found ${PY:-none}. Set HOGCYCLE_PYTHON=/path/to/python3." >&2
  exit 2
fi
PY="$("$PY" -c 'import sys; print(sys.executable)')"

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
  <key>EnvironmentVariables</key>
  <dict><key>HOGCYCLE_PYTHON</key><string>$PY</string></dict>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>30</integer></dict>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST

launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "installed $LABEL: daily at 09:30 with $PY, log at $LOG"
