# 19. The overview answers one question, and the instrument panel is gone

Date: 2026-10-12 · Status: Accepted

Revises the overview described in
[ADR-0016](0016-pages-and-a-crosshair-synced-by-time.md).

## Context

The front page opened on an instrument panel that filled the first screen.
It had:

- a live clock ticking to the hundredth of a second;
- a pixel pig;
- thirteen segmented gauges with one block lit on most of them;
- a centre card reading 「分位 004」.

Every gauge was filled from the contract, so nothing on it was invented. But
it answered no question a reader arrives with. The page's main question,
where the cycle stands, was not on screen until the reader had scrolled past
it. And every number on the panel sat at the same size and weight.

## Decision

The first screen answers "where does the hog cycle stand" with three
readings in causal order:

| card | reading | why this one |
|---|---|---|
| 产能 | 能繁母猪存栏 | the one real leading indicator |
| 价格 | 生猪成交均价 | the deepest price series (2015-) |
| 利润 | 猪粮比价（500县集贸） | still published; 发改委's is the fallback |

Each card gives, in the order a reader asks:

1. the value, at three times the numeral grid;
2. its direction, as a run of consecutive moves or the last change;
3. how unusual it is, as a multi-year extreme or its own-history
   percentile;
4. a five-year sparkline;
5. the period it describes ("2026年2季度末", not "2026-06-30");
6. the day it was published, and how many days after the period that was.

Every line is a fact gold computes (`change`, `streak`, `extreme`,
`percentile`) or a field the contract carries. A stale reading keeps its
card and says it is stale before anything else.

Below the cards come:

- **The thesis chart**, with a switch to place sow readings at their
  publication date ([ADR-0017](0017-publication-date-is-a-third-time.md)).
- **Latest releases**, ordered by the publisher's date. Ordering by
  collection date would put a backfill on top.
- **Worth noting**: threshold runs, multi-year extremes and stopped series.
- **The readings table.**

Two presentation rules come with it:

- **Direction is shown, not judged.** Arrows and changes are in plain ink,
  never red for down and green for up. Falling sow numbers are good news to
  a pork buyer and bad news to a farmer, and on a Chinese market screen red
  means up anyway.
- **Units are displayed in the reader's language** (元/公斤, 「4.56 : 1」),
  while the contract keeps the source's form (ADR-0014).

The sparkline is a server-rendered SVG. A card needs the shape and nothing
to hover, and three canvases would add a hydration pass for a picture that
never changes. Pixel faces get larger only at whole multiples of their grid:
headings at `--type-2x` (24px for zpix, 22px for Departure Mono), and the
card value at 33px, three times 11px.

## Consequences

- `components/hud/` and its two stylesheets are deleted. The CLAUDE.md rule
  "nothing in the header is invented" becomes "nothing on a card is
  invented", which is the same rule applied to what replaced the header.
- The overview page is about 105 KB of HTML, because the server passes its
  client components two panels, not the contract.
- Fixed in passing: the panel's tier colour was resolved from CSS on the
  client and fell back to the capacity blue on the server. That gave a
  hydration mismatch on every price panel. It is now a `var()` reference,
  the same on both sides.
