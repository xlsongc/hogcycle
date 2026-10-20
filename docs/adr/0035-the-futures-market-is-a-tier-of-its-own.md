# 35. The futures market is a tier of its own, read from a checked mirror

Date: 2026-10-20 · Status: Accepted

Bends [ADR-0018](0018-weekly-prices-from-the-ministry.md) and the
CLAUDE.md rule "prefer the primary source to a mirror", and settles the
phase-2 plan's C5 and Q7 ("futures later"), on the owner's instruction to
make the site useful past its original rules.

## Context

Every series here measures something that has happened. A reader of a hog
site also wants to know where prices are going. The project will not
forecast. The CLAUDE.md reasons stand: about three cycles of history, so
any rule fits its own sample. But one forward-looking number exists that is
not ours to make. The Dalian Commodity Exchange's live-hog contract (LH,
listed 2021-01-08) prices every coming odd month, with money behind every
price.

The exchange's own data endpoint refuses this project: akshare's
`get_futures_daily(market="DCE")` gets a page that is not JSON. Sina
Finance serves the same contracts, one request each, with open, high, low,
close, settle, volume and open interest.

## Decision

- **A new tier, `market`, kept off the wall** like `equity`. It is an
  expectation, not a link in the physical chain. Tier text says so, and its
  colour is the overlay palette's seventh slot rather than a fourth wall hue.
- **Two series.** `lh_futures_main` is Sina's main continuous contract
  (LH0), the daily settle since listing, for history and overlays. It jumps
  when the main contract rolls, and its about text says so.
  `lh_futures_curve` is a `forecast` indicator: one observation per listed
  contract, dated at its delivery month's end, valued at its latest settle,
  with `published_on` the trading day of that settle. A new settle is a new
  print of the same period, so silver keeps the curve as it stood on every
  collected day.
- **The mirror was checked before use, not trusted.** On four days
  (2026-09-15, 09-30, 10-09, 10-19) Sina's close matched 100ppi's
  independently published futures price for both the near and the dominant
  contract, 7 of 7 to the yuan.
- **Failures stay loud.** A month Sina has nothing for is not listed. Any
  other error propagates, and a run that finds no contract at all fails.
  Sina writes a settle of 0 on days without one (2021-12-30, 2024-09-25),
  and validation rejected it. The config now declares `zero_is_null` for
  that column, which is the existing, declared way to say so.
- **The curve's revision trail is not shipped in the contract.** Six prints
  a trading day would outgrow every page. Silver and the per-series CSV keep
  all of it.
- **`reach: cn` until GitHub's runners are probed.** Sina answers this
  machine; whether it answers a datacenter address is not known, so the
  local collector takes it.
- Contract 1.6.0: the tier enum gains `market` (an added value; a minor bump
  per ADR-0024).

## Consequences

- The overview shows the market's prices for the coming year under the
  thesis chart, as bars from zero with the settle date. On 2026-10-20 they
  run from 9,750 (2611) to 12,965 元/吨 (2709), so the market prices a
  recovery but not past the estimated breakeven (ADR-0034). The calibers
  differ, and neither is converted to the other's unit.
- Compare can lay LH0 over any spot price, indexed, because units differ.
- If Sina stops serving a contract or changes its columns, shape drift
  (ADR-0032) and validation say so. If it ever disagrees with 100ppi, that is
  a reason to stop using it, not to average the two.
