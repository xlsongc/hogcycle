#!/usr/bin/env bash
# Keep exactly one open `ack-lapsing` issue while any upstream_dark
# acknowledgement is within 14 days of its review_by, and close it once none
# is.
#
# An acknowledgement quiets a known outage until a date (ADR-0015), and on
# the day after it the run turns red by itself. That is the point, but a
# deadline nobody sees coming lands as a surprise red run. Two weeks ahead the
# issue opens; it is edited in place every day and commented on once more
# when the nearest deadline is 3 days out, so each comment means something.
# Nothing here renews or retires a series: a person decides which.
#
#   lapse-issue.sh <status --json lines>
#
# Needs gh (with GH_TOKEN) and jq, both on GitHub's ubuntu runners.
set -euo pipefail

JSONL="$1"
LABEL="ack-lapsing"
WARN=14
LAST=3
RUN_URL="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"

select='select(.kind == "series" and .acknowledged and .lapses_in_days != null
  and .lapses_in_days <= $warn)'
lapsing="$(jq -r --argjson warn "$WARN" "$select | .indicator" "$JSONL" | sort | paste -sd, -)"
open="$(gh issue list --label "$LABEL" --state open --json number --jq '.[0].number // empty')"

if [[ -z "$lapsing" ]]; then
  if [[ -n "$open" ]]; then
    gh issue close "$open" --comment "No acknowledgement is within $WARN days of lapsing as of $(date -u +%F): renewed, removed, or lapsed into the stale-series issue. Run: $RUN_URL"
  fi
  exit 0
fi

nearest="$(jq -s -r --argjson warn "$WARN" "[.[] | $select | .lapses_in_days] | min" "$JSONL")"
stage="$WARN"
if (( nearest <= LAST )); then stage="$LAST"; fi

body="$(mktemp)"
trap 'rm -f "$body"' EXIT
{
  # Read back on the next run to decide whether anything changed.
  echo "<!-- lapsing: $lapsing; stage: $stage -->"
  echo "### Acknowledgements about to lapse"
  echo
  echo "Each of these is stale upstream and acknowledged until \`review_by\`."
  echo "On the day after, it fails the run again by itself (docs/adr/0015)."
  echo "Before then, decide in a commit that says why:"
  echo
  echo "- the primary-source fix is built: remove \`upstream_dark\`;"
  echo "- the caliber is closed upstream: mark the series \`retired\`;"
  echo "- the fix is still being built: renew \`review_by\`, at most 92 days out."
  echo
  echo "| series | latest | dark for | review by | lapses in |"
  echo "|---|---|---|---|---|"
  jq -r --argjson warn "$WARN" "$select"' | "| `\(.indicator)` | \(.latest) | \(.age_days)d | \(.review_by) | \(.lapses_in_days)d |"' "$JSONL"
  echo
  echo "Last checked: $RUN_URL"
} > "$body"

title="Acknowledgement lapses in ${nearest}d: $lapsing"
if [[ -z "$open" ]]; then
  gh label create "$LABEL" --color b7532b \
    --description "An upstream_dark acknowledgement is about to lapse (ADR-0015)" --force >/dev/null
  gh issue create --title "$title" --label "$LABEL" --body-file "$body"
  exit 0
fi

# tr: a body touched in the web editor comes back with CRLF line endings.
previous="$(gh issue view "$open" --json body --jq .body | tr -d '\r' \
  | sed -n 's/^<!-- lapsing: \(.*\) -->$/\1/p')"
gh issue edit "$open" --title "$title" --body-file "$body" >/dev/null
if [[ "$previous" != "$lapsing; stage: $stage" ]]; then
  gh issue comment "$open" --body "Now ${nearest} days from lapsing: \`$lapsing\`. Run: $RUN_URL"
fi
