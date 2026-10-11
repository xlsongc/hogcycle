# 15. A known outage is acknowledged with a deadline, and the page still says so

Date: 2026-10-11 · Status: Accepted

Extends [ADR-0013](0013-sow-inventory-moves-to-the-primary-source.md), which
made a series that stops advancing a failure.

## Context

The staleness guard worked exactly as designed. Three 玄田 weekly tables
stopped advancing in mid-August 2026:

| series | last row | upstream call |
|---|---|---|
| `piglet_price` | 2026-08-20 | `futures_hog_cost(仔猪价格)` |
| `hog_corn_ratio` | 2026-08-19 | `futures_hog_supply(猪粮比价)` |
| `carcass_price` | 2026年第33周 | `futures_hog_supply(白条肉)` |

The collect run went red on 2026-09-16, the first day the 30-day weekly limit
allowed. Then it stayed red for 26 days and nobody acted.

That is the failure ADR-0013 set out to prevent, in a different form. A run
that is red every day for a cause everyone already knows teaches the reader
to stop looking at it, and the next freeze would have landed on a run that
was already red. Meanwhile the site went on showing August numbers as current
readings, including "below the 5:1 breakeven, losing money" under a
two-month-old 猪粮比价. The guard's verdict never reached the page.

It was not the network. A VPN or WAF problem shows up as a failed request,
which the pipeline already reports as `FAIL` or `SOURCE OUTAGE`. These calls
succeed and return old rows. A local fetch and the GitHub runner agreed on
the same last dates, and 玄田's daily tables on the same host (玉米, 外三元)
were current to the day. It is the ADR-0013 failure: the mirror stopped
updating some tables and keeps serving them.

ADR-0013 already noted that `retired` was doing two jobs: *closed* (the
caliber ended upstream) and *unreachable* (our source stopped). Marking these
three `retired` would have turned CI green by deepening that conflation, and
nothing would ever have brought them back to anyone's attention.

## Decision

### A third state: `upstream_dark`, with a deadline

```yaml
upstream_dark:
  acknowledged: 2026-10-11
  review_by: 2026-12-31     # at most 92 days after `acknowledged`
  reason: 玄田周度表停更 …    # what broke and what replaces it
```

| state | meaning | collected | fails the run | on the page |
|---|---|---|---|---|
| live | advancing | yes | when stale | as stale when stale |
| `upstream_dark` | caliber alive, our source stopped, fix owned | yes | **not until `review_by`** | **as stale** |
| `retired` | caliber closed upstream | yes | never | off the wall |

- **The fact is never softened.** `Staleness.stale` stays true. Only
  `failing`, which decides the exit code, honours the acknowledgement.
- **It expires by itself.** The day after `review_by` the run fails again
  with `ack lapsed`. Renewing means a commit that edits the date, so it is a
  decision someone made, not a setting someone forgot.
- **92 days at most**, so no acknowledgement can quietly last a year.
- **A series that resumes while still marked** is reported ("still marked
  dark"). Left in place, the mark would hide the next freeze until it lapsed.
- `retired` together with `upstream_dark` is rejected at load time.

### Staleness travels in the contract

Every reading carries `stale` (required) and `age_days`, judged at the wall's
own `generated_at`. That means `export --as-of` shows what was stale *on that
day*. A stale reading keeps its tile, because hiding it is the silent kind of
failure. Its digits drop to the unlit ink, and its note says how old it is
*before* any note about the present. The header gauge and the ratio scale
carry a `STALE` / `停更` tag in text, not colour alone.

### An alarm that reaches a person

The collect workflow keeps one open `stale-series` issue while anything is
failing, and closes it when nothing is. It edits the issue body daily (no
notification), and comments only when the set of failing series changes, so
a notification always means something new happened. `hogcycle status --json`
is the interface it reads.

### Interim primary source for 仔猪

The joint release's `全国仔猪价格` is the 农业农村部 500-county market survey,
as its own footnote states. It is the same survey 玄田 was mirroring weekly:
across 55 shared months it equals the monthly mean of 玄田's weekly values to
the cent in 43 and within 1% in 53. It enters as a **separate indicator**,
`piglet_price_monthly`, because a monthly mean is not a weekly reading, and
it takes the header slot while the weekly series is dark. 猪粮比价 and
白条肉出厂价 have no equivalent in the release (its 白条猪 price is
*wholesale*, not ex-plant), so they wait for their own adapters.

## Consequences

- The run is green again, and that green means something: no unowned freeze.
- By 2026-12-31 the three series need primary-source adapters (发改委 weekly
  猪粮比价, the 农业农村部 slaughter-monitoring weekly price, the 500县 weekly
  bulletin from ADR-0005), or a deliberate renewal.
- `meat_price_index` is still `retired` under the old, conflated meaning. It
  has been dark since 2025-10 with no replacement planned, so a 92-day mark
  would only be renewed by habit. It stays as is, and ADR-0013's note about
  it still applies.
