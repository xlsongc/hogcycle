# 22. Each source is collected from where it answers, and GitHub watches all of them

Date: 2026-10-12 · Status: Accepted

## Context

The scheduled run on 2026-10-12 took 43 minutes and collected none of the
Chinese government data:

- `www.moa.gov.cn` answered every monthly-release page with **HTTP 403**.
  The day before, a manual run on the same runner image fetched the same
  pages without trouble.
- `xt.yangzhu.vip` (玄田) **never answered**. akshare sets no timeout, so each
  call hung for about seven minutes, three times over.

From a residential connection outside China, the same machine that
developed this, both hosts answered normally throughout. The block is on
datacenter addresses, not on foreign ones. The pipeline caught it as
designed (`SOURCE OUTAGE: every indicator on adapter 'moa' failed`). But a
warehouse whose most important series depend on a cloud runner's IP
reputation will keep losing days. For the daily series that upstream keeps
for only about a year (ADR-0004), a lost day is lost for good.

## Decision

- **`reach` on every indicator**: `anywhere` (the default) or `cn`, meaning
  the source needs an ordinary network. 17 indicators are `cn`: everything
  from 农业农村部 (`moa`, `moa_weekly`) and everything from 玄田. USDA,
  行情宝 and the equities answer from anywhere. USDA *has* to stay there,
  because the development machine's resolver cannot find its host.
- **`hogcycle collect --reach anywhere|cn`.** The GitHub workflow collects
  `anywhere`. `scripts/local-collector/collect.sh` collects `cn` in its own
  clone (never a working checkout), commits and pushes. `install.sh`
  schedules it daily with launchd. A missed calendar job runs when the
  machine wakes.
- **GitHub stays the watchdog.** Its staleness check covers every series,
  whoever collects it. If the local job stops, the stale-series issue
  (ADR-0015) reports it within that series' cadence. The two collectors
  write disjoint folders, so their pushes rebase without conflict.
- **akshare calls get a 60-second socket timeout.** A host that will not
  answer now fails in a minute, not seven.

## Consequences

- The most important series now depend on one person's machine being on
  some time each day. That trade is made knowingly: a laptop that is
  sometimes asleep beats a runner that is always refused, and the watchdog
  makes an absence visible rather than silent.
- If a host starts answering datacenters again, flipping its `reach` back
  is a one-line change. If one starts refusing them, the GitHub run's
  `SOURCE OUTAGE` line says so first.
- A collector in a mainland cloud region, or a runner with a residential
  address, would remove the dependency on one machine. Either is the same
  `--reach cn` command run somewhere else.
