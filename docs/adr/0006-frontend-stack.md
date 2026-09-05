# 6. Frontend stack: Next.js + TypeScript + ECharts

Date: 2026-09-05 · Status: Accepted

## Context

Phase 1 renders a wall of aligned time-series panels from a static dataset.
The project doubles as a data-engineering portfolio piece, and the owner
expects to add bespoke visual design on top of the basic charts later.

Observable Framework was the initial recommendation and was rejected on
reconsideration. Its strongest claimed advantage — build-time Python data
loaders — is not actually exclusive to it: any build-time JSON export gives
the same clean boundary. What remains is real but narrow (Plot built in,
Markdown pages), against a hard ceiling: no component model, so custom
interactive design means imperative DOM code with no reuse, and app-shaped
features later (saved views, auth, dynamic queries) fight the page model.

## Decision

Next.js (App Router) + TypeScript + ECharts. Static export for phase 1.
Bespoke visuals use `d3-scale` + hand-written SVG in a React component rather
than adding visx.

## Consequences

- `echarts.connect()` links crosshair, tooltip and dataZoom across all panels
  natively — the exact interaction the design needs, and the part that would
  be hand-written in any other library.
- Canvas rendering keeps the wall responsive as series and points grow; SVG
  degrades around 10-20k nodes.
- `output: 'export'` gives a free static site now; removing that one line
  turns on API routes in phase 3 without changing frameworks.
- Heavier setup than Observable Framework — roughly a project scaffold plus a
  type-generation script, paid once.
- ECharts must be imported by component, not wholesale, or the bundle is ~1MB.
