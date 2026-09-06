# 11. Equities live outside the causal wall

Date: 2026-09-06 · Status: Accepted

## Context

The owner holds positions in hog-farming equities, so 牧原, 温氏, 新希望,
神农, 巨星 and 华统 belong in the project. Where they belong is less obvious.

The `tier` taxonomy is not a set of labels; it is a claim about the physical
cycle — capacity leads price by 10-12 months, margin decides whether a
capacity move persists, noise moves equities without moving the cycle. A share
price is not a link in that chain. It is a claim on the chain, priced by
people forming a view about it.

## Decision

`equity` is a tier, but equities carry `in_wall: false`: they are absent from
the causal wall and from the reading tiles, and present in the overlay.

Source is 新浪 (`stock_zh_a_daily`), not 东方财富. Daily, 后复权, stored at
full fidelity in silver and thinned to weekly in gold for the contract.

## Consequences

- The wall keeps meaning what it says. Interleaving a share price among
  capacity and margin panels would dilute the taxonomy into decoration.
- The overlay is where equities are actually informative, because the question
  worth asking — does the market lead or lag 能繁母猪 — needs two series on one
  axis and a lag control, which is exactly what the overlay provides.
- **Not 东方财富**: `push2his.eastmoney.com` answers the first request and then
  returns empty responses for hours. 新浪 is a different host, so its failure
  mode is independent of anything else here.
- **Adjustment bases differ between providers** (同日牧原: 新浪 882.87,
  东财 845.81). 后复权 series must never be mixed across sources — switching
  provider means switching series, not refreshing one.
- A 1.5s floor between upstream calls now applies to every akshare fetch. A
  16-indicator run takes ~27s, which is nothing for a daily job and keeps us a
  polite client of a free service.
- 神农 (2021) and 巨星/华统 (2017) list later than the others. Short series are
  a fact about the listing, not a collection gap.
