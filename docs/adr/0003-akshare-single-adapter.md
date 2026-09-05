# 3. akshare behind a single adapter; the pure/impure split

Date: 2026-09-05 · Status: Accepted

## Context

akshare wraps every source phase 1 needs, and upstream (玄田数据/中国养猪网,
行情宝) exposes JSON endpoints rather than HTML, so hand-written scrapers would
be redundant work with a worse failure surface. But akshare renames columns
between releases, ships roughly daily, and returns wildly different shapes for
different `symbol` values of the *same* function.

## Decision

One adapter module is the only code that knows akshare exists. It implements a
two-method protocol:

    fetch(spec)      impure: network, clock
    normalise(...)   pure: payload -> observations. No IO, no clock, no globals.

## Consequences

- An akshare schema change touches one file.
- Because `normalise` is pure, every parser bug is reproducible from a bronze
  blob and fixable without a single request. This is the same property 0002
  depends on; the two decisions are mutually reinforcing.
- Adding a non-akshare source (see 0005) means a new adapter, not a rewrite.
