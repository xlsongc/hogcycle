# Next steps after 2026-10-19

Where phase 2 ([plan](2026-10-14-phase-2-upgrade.md)) stands, and what to do
next, in order. Item ids are the plan's.

## Done, by plan item

| | item | where |
|---|---|---|
| P0 | Q1 local collector installed and running daily; D1 heartbeat; B1 12px CJK grid; B2 AA contrast | ADR-0023, commits of 10-15 |
| core | E5 contract versioned and validated; A1 time travel; A4/A5 breaks and coarse marks; A2 place at release date | ADR-0024–0026 |
| breadth | C2 豆粕, 猪肉 (500县); C1 猪肉进口, 猪杂碎进口, 规模/散养 profit and cost; 统计局 出栏 and 产量 per quarter from YTD totals; C3 发改委 生猪出场价格 | ADR-0027, ADR-0030 |
| robustness | D2 failure classes; D3 shape drift before parse; D4 lapse warning; E1 quality checks; E2 run log and health; E6 property tests; E3 one DuckDB connection; E8 status inside caliber bounds | ADR-0028, 0029, 0032 |
| calendar | D5 next release and overdue, never written to `published_on` | ADR-0031 |
| readers | B3 phone layout; B4 theme before paint; B5 terms in place; B6 percentile depth; B8 focus and table semantics; A6 series search (`/`, ⌘K); A7 keyboard reading; B10 `next-env.d.ts` ignored | — |
| decisions | Q5 no compaction (stands, no ADR needed until ~10k files); Q6 dbt rejected, ADR-0010 closed | ADR-0010 |
| fixes today | shared upstream file fetched once and a failed fetch not repeated (USDA cost 13 min on 10-19); CJK coverage check in the build | — |

## Tomorrow, in order

1. **Check the morning runs.** `gh run list --limit 6`. The 10-20 GitHub
   collect should show USDA fetched once (one download, not two) and
   `hogcycle status` should print the new "next release" column. The local
   collector (07:30 UTC) pulls origin first, so it collects the five new
   series from 10-20 on: check `data/bronze/hog_output_ytd/_manifest.jsonl`
   exists afterwards. If USDA times out again, it is the host
   (`apps.fas.usda.gov`), not us: answered 200 from here on 10-19 evening.
2. **Watch the first real calendar event.** The 202609 joint release is
   expected around 10-26 to 10-30 (`usual` 10-26/10-28, `by` 11-03 for the
   quarterly series). When it lands: 2026Q3 sow, hog inventory, the Q3 YTD
   出栏 and 产量 totals, so `hog_output_quarter` gains 2026Q3. Confirm the
   quarter equals 前3季度 − 上半年 on its series page.
3. **A3 — revision rings on wall and compare (S).** `panel.revisions` is in
   the contract already. Mark points whose period has more than one print
   with a ring, linked to the series page's trail. `charts/base/marks.ts`.
4. **B9 — table twins (M).** Compare has no table view, and the series page
   shows 12 rows plus the CSV. Add a "show all N readings" expansion on the
   series page and a month-end table under the overlay.
5. **A8 — range statistics on the series page (M).** Brush a span: first and
   last value, % change, min and max with dates. Q4 allows it only for a
   reader-chosen range, each number labelled "computed in your browser".
6. **B7 — weight (M).** Measure first (Lighthouse, throttled). Then slice the
   contract per page: the wall and compare still import all 40 panels
   (≈408 KB raw).

## Before 2026-12-31

- **Q2 / C6 — 猪粮比价.** `hog_corn_ratio`'s acknowledgement lapses on
  12-31; `status` and the `ack-lapsing` issue start warning on 12-17. The
  joint release's monthly 猪粮比价 stopped with the 202508 edition (the drift
  check found it), so there is still no machine-readable primary. Decide:
  retire (ADR-0018's default) or renew with a reason. Never auto-retire.

## Later (P3)

- A9 cycle overlay on reader-chosen anchors; C4 listed companies' monthly
  sales reports (cninfo PDFs, new dependency, tier decision); C5 大商所 LH
  (needs a runner reach probe and a market-tier ADR, no mirror without a
  week-by-week check); C3 remainder (白条猪批发价 ×2, 县乡零售, 36城后腿肉) —
  config plus replay, each a new caliber panel, worth it only if the price
  tier can stay readable.
- The verification layer: a backtest that reads only `published()`.

## Notes for whoever picks this up

- New Chinese copy or a new indicator name: the build now fails on a
  character the font subset lacks. Re-cut with
  `frontend/scripts/subset-cjk-font.sh <zpix source>` (needs fonttools from
  `.venv`: `PATH="$PWD/.venv/bin:$PATH"`). The zpix source is not in the repo
  (licence, see `Zpix-NOTICE.md`).
- The browser window in this setup does not resize; phone width was checked
  in a 390px same-origin iframe, whose media queries are the phone's.
