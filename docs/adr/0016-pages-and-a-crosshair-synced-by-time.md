# 16. The site is three pages, and panels share a crosshair by time

Date: 2026-10-11 · Status: Accepted

Extends [ADR-0014](0014-the-site-speaks-two-languages.md) (one prerendered page
per language) and revises one consequence of
[ADR-0006](0006-frontend-stack.md) (`echarts.connect()` as the crosshair).

## Context

The site was one page doing four jobs at once: a dashboard, an explorer, a
methodology note and a data-health report. Each was laid out at the same
weight. The instrument header (13 gauges), then 21 equal tiles, then 13
equal panels, then the overlay, the table and the caveats, about 4,900px in
all. A reader found no place to start. The same reading appeared three times
(gauge, tile, panel header), and the one claim the project exists to test,
that capacity leads price, was not on screen until a reader set up the
overlay by hand.

Hovering a panel moved a dashed line and rewrote a grey header in each panel.
Nothing appeared near the cursor, and the time axis existed only under the
last of 13 panels, about 1,900px down. Then there was a bug that predated
all of this. `echarts.connect()` links pointers by **series and data index**.
That is right for charts plotting the same rows and wrong for small
multiples. A pointer on 2022-07-27 put 二元母猪价格 on 2021-09-30, because
"observation 185" is a different date in every series. It looked plausible
on the live site only because nobody compared dates across panels.

## Decision

### Three pages per language, each answering one question

| page | path | question |
|---|---|---|
| Overview | `/`, `/zh/` | where the cycle stands, and what changed |
| Causal-chain wall | `/wall/`, `/zh/wall/` | how the whole chain reads at any date |
| Compare | `/compare/`, `/zh/compare/` | does one series lead another, and by how much |

- **The overview** puts the thesis on screen by default: 能繁母猪存栏 shifted
  by a lead the reader picks (none, 10 or 12 months; biology, not a fit),
  directly above the hog price. That is two panels on one axis, never a dual
  axis. The 21 equal tiles become one table grouped by tier, with a position
  strip instead of a segmented bar. With one block lit, the bar read as
  broken.
- **"What the numbers say"** states computed facts in words: monthly and
  quarterly readings first collected in the last 30 days, runs against a
  domain threshold, and multi-year extremes. Gold computes them
  (`gold/facts.py`) and the contract carries them (`first_seen`, `extreme`,
  `threshold_run`), because the page renders numbers rather than working
  them out. Each has a fixed definition. None says what the facts mean
  together, which would be the phase call this project refuses to make.
- **View state is in the URL**: the time window, a dragged zoom, the compare
  selection and its shift. A view is a link.
- A site nav sits in each root layout. The language link goes to the same
  page in the other language. The theme is remembered in browser storage,
  because changing language is a full page load.

### Crosshair sync by time

The chart under the pointer broadcasts the pointer's *time*. Every other
chart in its group places its own crosshair at that time on its own axis
(`charts/base/pointerSync.ts`). Only the hovered chart broadcasts, which is
what stops the charts echoing each other. With this:

- the hovered panel prints its reading beside the cursor;
- every panel's header shows its reading *at that date*, or "nothing near
  this date" when nothing is within the granularity's tolerance;
- a dot marks the observation being read, drawn by the panel itself rather
  than by ECharts' highlight, which lit the nearest point at any distance;
- a time axis pinned above the wall carries the hovered date, and scrubbing
  along it drives every panel;
- dragging across any panel zooms all of them; a double-click resets.

## Consequences

- The contract is still one document, imported by every page, about 250 KB.
  The overview passes its client components only the panels they draw, but
  splitting the contract per page is the next step. It belongs with the
  per-series pages, which need a different slice anyway.
- `first_seen` is transaction time. For a backfilled series it is the
  backfill date, not the publisher's release date, so the overview says
  "collected", never "released". A true release-time axis is the
  `published_at` work this does not attempt.
- ADR-0006 named `connect()` as the main reason ECharts won. The stack choice
  stands, since the canvas renderer and the component model still carry it.
  But the one feature that tipped the choice turned out to be wrong for small
  multiples, and the replacement is about 80 lines.
- New copy means new CJK glyphs, so the zpix subset was re-cut. That also
  restored nine glyphs (英, 语, 译 and others) that had been missing since
  ADR-0014.
