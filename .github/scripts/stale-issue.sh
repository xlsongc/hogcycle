#!/usr/bin/env bash
# Keep exactly one open `stale-series` issue while any series fails the
# staleness guard, or any source group has gone unfetched (ADR-0023), and
# close it once none does.
#
# A red run was not enough. The guard caught three 玄田 tables freezing in
# 2026-08 on the first day it could, and the run then stayed red for 26 days
# without anyone acting, because a daily red run is a sound you learn not to
# hear. An issue reaches a person. It is edited in place every day, which
# sends no notification, and commented on only when the set of failing series
# changes, so that a comment always means something new happened.
#
#   stale-issue.sh <status table> <status --json lines>
#
# Needs gh (with GH_TOKEN) and jq, both on GitHub's ubuntu runners.
set -euo pipefail

TABLE="$1"
JSONL="$2"
LABEL="stale-series"
RUN_URL="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"

failing="$(jq -r 'select(.failing) | .indicator' "$JSONL" | sort | paste -sd, -)"
open="$(gh issue list --label "$LABEL" --state open --json number --jq '.[0].number // empty')"

if [[ -z "$failing" ]]; then
  if [[ -n "$open" ]]; then
    gh issue close "$open" --comment "Every series is advancing or acknowledged as of $(date -u +%F). Closing. Run: $RUN_URL"
  fi
  exit 0
fi

body="$(mktemp)"
trap 'rm -f "$body"' EXIT
{
  # Read back on the next run to decide whether anything changed.
  echo "<!-- failing: $failing -->"
  if jq -e -s 'any(.[]; .failing and .kind == "heartbeat")' "$JSONL" >/dev/null; then
    echo "### Source groups nobody has fetched"
    echo
    echo "No successful fetch within the limit. The collector that reaches these"
    echo "hosts has stopped, or cannot reach them from where it runs; see"
    echo "docs/adr/0023. For \`cn/*\` that is scripts/local-collector."
    echo
    echo "| group | last fetched | age | limit |"
    echo "|---|---|---|---|"
    jq -r 'select(.failing and .kind == "heartbeat")
      | "| `\(.indicator)` | \(.latest // "never") | \(.age_hours // "—")h | \(.limit_hours)h |"' "$JSONL"
    echo
  fi
  if jq -e -s 'any(.[]; .failing and .kind == "series")' "$JSONL" >/dev/null; then
    echo "### Series that stopped advancing"
    echo
    echo "Nobody has acknowledged these, or the acknowledgement has lapsed. An"
    echo "upstream that keeps serving its last payload looks identical to a quiet"
    echo "day; see docs/adr/0013."
    echo
    echo "| series | latest | age | limit | acknowledgement |"
    echo "|---|---|---|---|---|"
    jq -r 'select(.failing and .kind == "series")
      | "| `\(.indicator)` | \(.latest) | \(.age_days)d | \(.limit)d | \(
          if .review_by then "lapsed \(.review_by)" else "none" end) |"' "$JSONL"
    echo
    echo "**Fix:** move the series to its primary source. If you own that fix but it is"
    echo "not built yet, add \`upstream_dark\` with a \`review_by\` (at most 92 days) to"
    echo "\`config/sources.yaml\`. Do not loosen \`max_age_days\`: that is for a cadence"
    echo "that is genuinely slow, not for a source that stopped."
    echo
  fi
  echo "Last checked: $RUN_URL"
  echo
  echo "<details><summary>hogcycle status</summary>"
  echo
  echo '```'
  cat "$TABLE"
  echo '```'
  echo "</details>"
} > "$body"

title="Stale: $failing"
if [[ -z "$open" ]]; then
  gh label create "$LABEL" --color d03b3b \
    --description "A series stopped advancing (hogcycle status --fail-on-stale)" --force >/dev/null
  gh issue create --title "$title" --label "$LABEL" --body-file "$body"
  exit 0
fi

# tr: a body touched in the web editor comes back with CRLF line endings.
previous="$(gh issue view "$open" --json body --jq .body | tr -d '\r' \
  | sed -n 's/^<!-- failing: \(.*\) -->$/\1/p')"
gh issue edit "$open" --title "$title" --body-file "$body" >/dev/null
if [[ "$previous" != "$failing" ]]; then
  gh issue comment "$open" --body "Failing set changed: \`${previous:-none}\` → \`$failing\`. Run: $RUN_URL"
fi
