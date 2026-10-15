# 23. A collector that stops is a failure within days, judged from what it fetched

Date: 2026-10-15 · Status: Accepted

Extends [ADR-0022](0022-collect-where-the-source-answers.md), which made one
machine the collector for every `reach: cn` source and GitHub the watchdog.

## Context

ADR-0022 said that if the local job stopped, the stale-series issue would
report it "within that series' cadence". The phase-2 audit found the job had
never been installed. From 2026-10-12, nothing collected 能繁母猪存栏, any
农业农村部 series or 玄田's daily tables, and nothing said so. The first
alarm would have been the 21-day limit on daily corn, about 2026-11-02. For
`sow_inventory` it would have been 150 days.

A series' cadence is the wrong clock for this question. Staleness asks whether
the *publisher* has moved on. A dead collector is a different fact, and it is
already known the first morning nothing is fetched. It was also invisible from
GitHub when the job *did* run and one source failed: the local run's
`SOURCE OUTAGE` exit code reaches only a log file on the laptop.

## Decision

**Liveness is read from bronze, per source group.** Every successful fetch
appends a line to its indicator's bronze manifest, and the manifests are
committed. So the newest `fetched_at` over the indicators of one
(`reach`, `adapter`) pair answers "has this source been reached lately, from
where it answers?" A failed fetch writes nothing, so a collector that runs
but reaches nothing counts as dead, which it is.

| group | limit | why |
|---|---|---|
| `anywhere/*` | 36 hours | GitHub's cron runs daily, and a missed run is itself a failure |
| `cn/*` | 72 hours | a laptop that sleeps through a weekend is not broken. Three missed days are |

- `hogcycle status` prints the groups. `--fail-on-stale` fails on a group past
  its limit, as it does on a stale series. `--json` adds one `kind: heartbeat`
  line per group, and the stale-series issue lists them in their own table.
- A group with no fetch on record fails. "Never collected" is not "fine".
- The limits are constants beside the staleness defaults, so anyone loosening
  one does it in a reviewed diff.

**Why not a heartbeat file.** A job that writes "I ran" proves only that it
ran. The manifest proves the job reached the source. It also needs no new
file and no bootstrap, since its history starts with the warehouse.

## Consequences

- The gap that motivated this would have failed GitHub's run on 2026-10-15,
  three days in, instead of in November.
- One source unreachable from the collector's network is now visible in a
  day or three, not after its series' staleness limit.
- A week away from the laptop opens the stale-series issue. That is true, and
  it closes on the first run back. If it becomes noise, the answer is a second
  collector (ADR-0022 names two), not a longer limit.
- A retired series is still fetched every day, so it still counts as
  evidence. The heartbeat is about reaching hosts, not about series.
