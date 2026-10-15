# 24. The contract carries a version, and every export is validated against the schema

Date: 2026-10-15 · Status: Accepted

Extends [ADR-0007](0007-contract-first-separation.md).

## Context

ADR-0007 made `contracts/wall.schema.json` the only interface between the
pipeline and the page. Two things the boundary needs were missing.

- **No version.** A `wall.json` exported by one checkout and built by another
  had no way to say which shape it was. That matters more now: time travel
  (the next ADR) adds fields to every panel. The daily deploy exports from
  that day's data, so an old or new payload can meet a frontend from either
  side.
- **The check was not the schema.** `write_contract` checked required keys
  and point order by hand. It was deliberately dependency-free, and it did
  not check types, enums or `additionalProperties`. A tier misspelled
  `capactiy`, a value exported as a string, or a stray field would all have
  passed. The schema promised more than anything enforced.

## Decision

- **`contract_version`, required, declared once.** The schema states it as a
  `const` on the property. `write_contract` stamps it from the schema, the
  type generator emits it as `CONTRACT_VERSION`, and neither side writes the
  number anywhere else.
- **Semver, read as compatibility.** A field that is added and optional is a
  minor bump: an older page ignores it. Anything else is a major bump:
  removing or renaming a field, making one required, or changing what one
  means. The page refuses a payload whose major differs from the schema it
  was built against, and that fails the static build, not a chart in
  production. This document starts at 1.0.0.
- **Every export validates against the schema with `jsonschema`.** That
  includes the deploy's export, not only CI's. Errors name the JSON path.
  Point order and non-empty panels stay as hand-written checks, since JSON
  Schema cannot say "ascending".
- **CI exports the committed silver** and validates it, so a code change that
  breaks the shape fails on the push that made it.

## Consequences

- A runtime dependency on `jsonschema`, which the export previously avoided.
  It is the reference implementation of the standard the contract is written
  in, and the hand-written check had drifted from it on every field it did
  not happen to list.
- A schema change is now a version decision, made in the same diff. That
  friction is the point, as ADR-0007 said of the boundary itself.
