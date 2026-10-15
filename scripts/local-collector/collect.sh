#!/usr/bin/env bash
# Collect the sources that refuse datacenter addresses, from this machine.
#
# 农业农村部 answers GitHub's runners with 403 and 玄田 does not answer them
# at all, while both serve an ordinary connection (ADR-0022). Indicators
# marked `reach: cn` in config/sources.yaml are collected here; the GitHub run
# collects the rest and checks every series for staleness, so if this job
# stops, the stale-series issue says so within a cadence.
#
# Runs in its own clone, never in a working checkout: a collector that
# committed into someone's half-finished branch would be worse than none.
#
#   scripts/local-collector/collect.sh            # once, by hand
#   scripts/local-collector/install.sh            # daily, via launchd
set -euo pipefail

REPO="${HOGCYCLE_REPO:-https://github.com/xlsongc/hogcycle.git}"
HOME_DIR="${HOGCYCLE_COLLECTOR_HOME:-$HOME/.hogcycle-collector}"
PY="${HOGCYCLE_PYTHON:-python3}"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

if ! "$PY" -c 'import sys; sys.exit(sys.version_info < (3, 11))' 2>/dev/null; then
  log "need Python 3.11 or later, got $("$PY" --version 2>&1 || echo "no $PY");" \
    "set HOGCYCLE_PYTHON or rerun install.sh from a shell that has one"
  exit 2
fi

if [[ ! -d "$HOME_DIR/.git" ]]; then
  log "cloning $REPO into $HOME_DIR"
  git clone --quiet "$REPO" "$HOME_DIR"
fi
cd "$HOME_DIR"

git checkout --quiet main
git pull --quiet --rebase origin main

if [[ ! -x .venv/bin/hogcycle ]] || [[ backend/pyproject.toml -nt .venv/.installed ]]; then
  log "installing the backend into .venv"
  "$PY" -m venv .venv
  .venv/bin/pip install --quiet --upgrade pip
  .venv/bin/pip install --quiet -e ./backend
  touch .venv/.installed
fi

# Partial success is still success here too: the run's own exit code says
# whether a whole source was unreachable, and the commit below keeps
# whatever did collect either way.
set +e
.venv/bin/hogcycle collect --reach cn
status=$?
set -e

git add data/
if git diff --cached --quiet; then
  log "no change today"
  exit "$status"
fi
git -c user.name="hogcycle-local" -c user.email="bot@users.noreply.github.com" \
  commit --quiet -m "data: $(date -u +%Y-%m-%d) (local)"

# The GitHub run may have pushed in the meantime. It writes other series'
# folders, so a rebase never meets a conflict; three tries cover a race.
for attempt in 1 2 3; do
  if git pull --quiet --rebase origin main && git push --quiet origin main; then
    log "pushed"
    exit "$status"
  fi
  log "push attempt $attempt failed; retrying"
  sleep $((attempt * 20))
done
log "could not push; the commit stays in $HOME_DIR and goes out next run"
exit 1
