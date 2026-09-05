# 2. Medallion layers and bronze immutability

Date: 2026-09-05 · Status: Accepted

## Context

Standard medallion architecture describes layers by increasing cleanliness.
That framing does not carry the property this project needs.

## Decision

Three layers, distinguished by **mutability rules** rather than cleanliness:

| Layer | Rule |
|---|---|
| bronze | never modified, never deleted; content-addressed |
| silver | append-only; a revision is a new row |
| gold | pure derivation; rebuildable; computes, never judges |

`bronze.write()` runs **before** `normalise()` in the pipeline.

## Consequences

- A parser bug is fixable offline: correct the parser, replay bronze, rebuild
  silver. Zero HTTP requests. This matters because you cannot re-fetch
  yesterday — the endpoint returns today.
- Content addressing means a day where nothing changed costs one manifest line
  and zero payload bytes.
- Ordering bronze before normalise means a *failed* indicator still preserves
  its payload. When sow_inventory could not be parsed for months, the evidence
  was still being banked.
- gold being pure derivation is why it is gitignored: it is a cache, and
  tracking a full recompute daily would bloat the audit trail for nothing.
