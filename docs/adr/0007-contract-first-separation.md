# 7. Contract-first frontend/backend separation

Date: 2026-09-05 · Status: Accepted

## Context

"Frontend/backend separation" usually means two deployed services. Phase 1 is
a static site, so there is no backend service to separate from — yet the
boundary still needs to be real, because phase 3 adds an HTTP API and nothing
on the frontend should change when it does.

## Decision

The boundary is a **published data contract**, not a network hop:
`contracts/wall.schema.json`. Python validates its export against it; the
frontend generates its TypeScript types from it. Phase 1 delivers the document
as a build-time file; phase 3 serves the identical shape at the same path.

## Consequences

- The frontend never imports parquet, DuckDB, akshare or pandas. One JSON
  document is its entire input surface.
- One source of truth spans the whole pipeline: `config/sources.yaml` →
  Python types → JSON Schema → TypeScript. An indicator whose unit or
  granularity changes breaks the frontend build, not a production chart.
- The schema lives at the top level, not inside either half. Neither side owns
  it; it is the agreement between them.
- Cost: a schema change is a two-sided change. That friction is the point.
