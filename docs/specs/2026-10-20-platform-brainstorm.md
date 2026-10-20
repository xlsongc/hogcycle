# From a wall to a platform: brainstorm and feasibility (2026-10-20)

The owner asked for more than the phase-2 backlog: research what would make
this genuinely useful, allowing the original rules to bend, and look at how
well-known US sites do it. This is the list, what each costs, what was
checked, and what was built.

## What the reference sites do that we do not

| site | what it does well | what we take |
|---|---|---|
| FRED (St. Louis Fed) | Every series page can be redrawn as change, % change, % change from a year ago, or an index, and the units say which | Unit transforms on the series page |
| ALFRED | Every vintage of a series, as it was on any day | We already have this (ADR-0025). It deserves to be said louder |
| Iowa State, *Estimated Livestock Returns* | A monthly estimate of what a farrow-to-finish hog earned, with the method and its assumptions printed | A profit and breakeven estimate, calibrated and labelled as ours |
| CME Group, lean hog futures | The forward curve: what the market prices each coming month at | The 大商所 LH futures, as the market's own expectation |
| USDA AMS / Mysteel seasonal charts | Each year drawn over the calendar, so this year is read against the usual season | A seasonal view on weekly and daily series |
| Our World in Data | Chart, table, sources and download on every chart | Mostly there: every chart now has a table twin |

## Ideas, value and feasibility

| # | idea | value | feasibility, as checked | call |
|---|---|---|---|---|
| 1 | **Profit and breakeven estimate.** The official 规模养殖每头成本/净利润 stopped with the 202508 joint release, so the margin tier lost its most direct reading | High: losses drive sow culling, and nothing on the site says where margins are now | Checked on 41 overlapping months. Cost = a + b·feed + c·piglet, both 3 months earlier. Revenue = a calibrated weight × the 500-county hog price. Holdout errors (fit on 24/28/32 months, test on the rest): profit RMSE 45–51 元/head against a spread of ±388, r 0.93–0.98, sign right 94–100% | **Build** (ADR-0034) |
| 2 | **LH futures** (大商所 live hog): the main continuous contract | High: the only forward-looking number we can show without making one up. It is the market's expectation, not ours | Sina's LH0 answers from here (daily since 2021-01-08, settle included). DCE's own endpoint refuses (JSON error). 100ppi's basis answers, one request per day | **Build** the main contract (ADR-0035). The full curve waits: a contract per delivery month does not fit one indicator yet |
| 3 | **Unit transforms** (FRED): level, change, % change, % from a year ago | Medium-high: YoY is how the industry reads 能繁母猪 | Browser-side over a reader-chosen transform (ADR-0033). Small | **Build** |
| 4 | **Seasonal view**: each year over the calendar, with the past years' range | Medium-high: hog prices are seasonal (Spring Festival) | Browser-side, small; daily and weekly series only | **Build** |
| 5 | **Lead-lag scan** on compare: correlation of the shifted series at each lag 0–24 | Medium: puts a number on "10–12 months" | Browser-side over a reader-chosen pair. Few cycles, so it is labelled as a description, not a law | **Build** |
| 6 | **Feeds and an API**: an Atom feed of releases, and JSON per series beside the CSV | Medium: subscribing beats checking | Static files written at export. Small | **Build** |
| 7 | Province price map (搜猪) | Medium | `spot_hog_soozhu` hung for over two minutes from here. Unreliable | Drop for now |
| 8 | Automatic phase call ("we are in the deleveraging phase") | Looks high, is low: about three cycles of history, so any rule is fitted to its own sample | Easy to build, impossible to validate | **Still no.** The estimate, the futures and the reader's own cycles answer the same need honestly |
| 9 | Price forecast model | Same problem as 8, plus the futures market already does it with money behind it | — | No. Show the futures |
| 10 | E-mail alerts | Medium | Needs a sending service and addresses: outward-facing, owner's decision | Later, via the feed (6) first |
| 11 | Weekly digest pages (an archive of "this week") | Medium | Export-time, static. Medium | Later |
| 12 | Backtest on `published()` | High for the thesis | Medium-large | Next session |

## Rules that bend, and how

- **"Nothing on a card is invented" / "gold computes, it does not judge".**
  An estimate is a model, not a measurement. It bends this rule, and does so
  in the open. It is its own indicator with 估算/estimate in its name, never
  drawn as the official series. Its method, inputs and measured holdout
  error are on its page. It is refitted from silver as of each export, so
  time travel still holds (ADR-0034).
- **"Prefer the primary source to a mirror."** DCE refuses us, so the futures
  come from Sina's mirror. That is allowed for a market tier that stays off
  the wall, with the mirror named as the source and the settle checked
  against 100ppi's dominant-contract price (ADR-0035).
- **"The page renders, it does not compute."** Already narrowed by ADR-0033.
  Transforms, seasonality and the lag scan are reader-chosen views of the
  data, so they fall under it.

## What was built on 2026-10-20

| # | built | where |
|---|---|---|
| 1 | `profit_per_head_est`, `breakeven_price_est` (weekly). The overview's margin card shows the profit. The latest week is −382 元/head, breakeven 13.70 元/kg | ADR-0034, `gold/estimate.py` |
| 2 | Tier `market`: `lh_futures_main` (daily since 2021-01-08) and `lh_futures_curve` (a forecast, by delivery month). The overview shows the curve | ADR-0035, `collectors/futures.py` |
| 3 | Units on the series page: level, change and % from a year ago, % from the reading before (`?u=`) | `lib/transform.ts` |
| 4 | Season by season on daily, weekly and monthly series | `lib/seasons.ts` |
| 5 | Which shift lines up best, under the compare overlay | `lib/leadLag.ts` |
| 6 | `feed.xml`, `zh/feed.xml`, `data/index.json`, `data/series/<id>.json` | `export/feeds.py` |

Found on the way: gold's week-on-week and year-on-year changes gave
percentages across zero, so a deepening loss read "+8.5%" and "+9.5% YoY".
Neither does now.
