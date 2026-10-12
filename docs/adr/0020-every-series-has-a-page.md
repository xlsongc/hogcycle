# 20. Every series has its own page, and its description travels in the contract

Date: 2026-10-12 · Status: Accepted

## Context

A reader meeting 「仔猪价格 19.77」 on the overview had nowhere to find out
what that number is. They could not learn who publishes it, how late it
appears, whether it has ever been corrected, or how to take the numbers
away. Every name linked to the wall, which answers a different question: how
the whole chain reads at a date.

## Decision

- **`/series/<id>/` and `/zh/series/<id>/`** are prerendered for every
  series in the contract (`dynamicParams = false`, so an unknown id is a 404
  in the static export). Every series name on the site links there: the
  overview cards, the release feed, the facts, the table and the wall's
  panel titles. A page shows, in order:
  1. what the series is and who publishes it, with a link to the source page;
  2. the latest reading with its period, release date and computed facts;
  3. the full history, with the window presets and the release-date
     placement;
  4. when it becomes public (the release-lag summary, or a plain statement
     that the source does not say);
  5. its revision trail;
  6. its recent readings.
- **Descriptions live in `config/about.yaml`** and travel in the contract in
  both languages, as names do (ADR-0014). A series without one fails the
  export. `url` is a page a reader can check, or null where the only address
  is an API. It is never a guessed page.
- **The revision trail is contract data** (`panels[].revisions`): every period
  whose value changed, each value with its release date and the day the
  warehouse learned it. Today it holds one entry, the 2023-10-25 仔猪
  correction from ADR-0018.
- **One CSV per series**, written by `hogcycle export` into
  `frontend/public/data/series/`. They have full resolution and full depth,
  since the wall thins daily equities, and are gitignored and rebuilt on
  deploy like gold. The wall, the files and the trail all resolve a series
  through `gold/series.py`, so a download cannot disagree with the chart
  beside it.
- **The language link keeps the reader on the same path**: it swaps the
  locale prefix instead of mapping a nav page.

## Consequences

- 52 more static pages, about 48 KB each, since the server hands each page
  one panel, not the contract.
- Writing a series' description is now part of adding the series. That is
  deliberate: a page that says nothing about its own number would be the
  same failure as an indicator with no English name.
