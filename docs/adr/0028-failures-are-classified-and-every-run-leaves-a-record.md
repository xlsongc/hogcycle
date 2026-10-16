# 28. A failure says which kind it is, and every run leaves a record

Date: 2026-10-16 · Status: Accepted

Extends [ADR-0022](0022-collect-where-the-source-answers.md) (collect from
where the source answers) and
[ADR-0023](0023-a-collector-that-stops-is-a-failure-within-days.md)
(liveness from bronze).

## Context

A collection fails in one of three ways. Each needs a different response,
and the code treated them all alike.

- **The network hiccuped.** A timeout, a reset or a 5xx. Trying again in a
  few seconds is right.
- **The host refuses this network.** 农业农村部 answers GitHub's runners with
  403 and 海关 with a 412 challenge (ADR-0022). Asking again cannot change the
  answer and is impolite. The weekly adapter retried any error three times
  inside its own fetch, and the pipeline retried the whole fetch three times
  more, so a refusing host was asked up to nine times per report per run.
- **The answer arrived and is not what we understand.** A page that is gone, a
  renamed 指标 or a value out of range. Trying again cannot fix it. It needs a
  person.

All three printed as `FAIL` and an exception message. The local collector's
output goes only to a log file on one laptop. So from GitHub, "the collector
ran and was refused" and "the collector never ran" looked the same: bronze
gets nothing in either case (ADR-0023).

## Decision

- **Every failure is classed as `transient`, `blocked` or `structure`.**
  Statuses 401, 403, 407, 412 and 451 are `blocked`. Timeouts, connection
  errors, 408, 425, 429 and 5xx are `transient`. A 404 or 410 on a page we
  expected, and every parse, shape or validation error, is `structure`. An
  adapter that gathers several pages (the monthly editions, the weekly
  articles) and gets none classes the whole failure from what each page did:
  `blocked` if any page was refused, else `transient` if any timed out, else
  `structure`.
- **Only `transient` is retried**, with backoff, at both the request and the
  fetch level. A `blocked` failure says so: "this host refuses this network;
  see `reach`". When every indicator on an adapter is blocked, the run
  reports a blocked source, not a flaky one.
- **Every `collect` appends one line to `data/runs/<reach>/<yyyy-mm>.jsonl`.**
  The line says where the run happened (GitHub or a local machine), when it
  started and ended, and for each indicator: ok, rows, failure class and
  message. The file is append-only and committed with the data, so the local
  collector's runs reach GitHub. `status` shows the latest run per reach and
  its failures by class, and `--json` carries them.
- **Liveness is still read from bronze (ADR-0023).** The run log explains a
  silence; it does not stand in for one. A run that reached nothing is dead
  whatever its log says.

## Consequences

- A refusing host is asked once per run instead of up to nine times.
- When the `cn` heartbeat fails, the last run line says why: refused, timed
  out, or no line at all, meaning the job never ran.
- One more append-only file per reach per month, a few kilobytes. Runs from
  two places write to different files, so they never conflict on push.
