# Next steps (written 2026-10-19, updated 2026-10-25)

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
| 10-20 | A8 window facts on the series page; A9 cycles laid over each other from reader-named starts; B9 every reading on the series page, a month-end table on compare; A3 rings on revised periods | ADR-0033 |
| decisions | Q4 browser computes only over reader-chosen inputs; Q5 no compaction; Q6 dbt rejected, ADR-0010 closed | ADR-0033, ADR-0010 |
| 10-21 | The futures market's track record: every contract's life since LH2109, each delivered contract's settle 1/3/6/9 months ahead against its last; both futures series collected from GitHub | ADR-0036 |
| 10-24 | The weekly digest: `/week/` and an issue per ISO week since W37, each the difference between what was knowable at two Sundays (moves, releases, the curve, what is due); a line on the overview; `week.xml` per language. Futures confirmed collected from GitHub 10-22 to 10-24, both `ok` | ADR-0039 |
| 10-25 | Findable and shareable: canonical, other-language and card metadata on every page, one site card (`public/og.png`, `scripts/og-card.mjs`), `sitemap.xml` (114 pages), a bilingual 404, an issue's summary copied as text. The calculator keeps weight, cost, basis and batch size in the reader's browser and draws the futures curve against the cost | ADR-0040 |
| 10-21 (late) | Readable, premium redesign: Inter on a type scale, the pixel face only for the wordmark and section numbers, zpix removed (it needed a commercial licence); answers before method; a price strip; a footer. A margin calculator (`/calc/`) and a data page (`/datasets/`). How the site could pay: [making it pay](2026-10-21-making-it-pay.md) | ADR-0037, ADR-0038 |

Fixed on 10-20:

- **The hover label showed no value since 10-15.** The label is inverted,
  and B1's rule paints every `<b>` in ink, so the price was ink on ink.
  The label's emphasis now inherits its colour. It is live and checked.
- **The local run of 10-20 took eleven hours.** launchd started it in a
  six-second maintenance wake on battery, and the Mac slept mid-run. The
  script now holds a `caffeinate -is` assertion. On power that keeps the
  machine up. On battery with the lid shut macOS may still sleep.
- Frontend tests run under `node --test` (`npm test`, in CI). CI and deploy
  are on Node 24.

Fixed on 10-21:

- **Silver made an older release current when it was learned after a newer
  one** (543ee2b). Found before it fired: the futures backfill would have
  shown each contract's previous settle as today's. Dated rows are now
  judged against the release in force on their own day, and a fourth
  property test checks any arrival order. No current value changed.
- The local run of 10-21 took one minute (07:30:07 to 07:31:06): the
  `caffeinate` fix holds on power.

## B7 weight: measured, deferred

Measured on the 10-20 build, gzipped: ECharts is already tree-shaken (one
199 KB chunk, line + scatter only), and React plus Next is about 120 KB. The
data travels inline in each page's HTML: compare is 78 KB, the wall 57 KB,
the overview 27 KB, a series page 9 KB. The wall and compare need every
panel by design, so slicing the contract per page saves little. Revisit if
the panel count doubles, or with a throttled Lighthouse run showing a
problem.

Later on 10-20 the site went past the phase-2 plan, on the owner's ask
([brainstorm](2026-10-20-platform-brainstorm.md)): a profit and breakeven
estimate (ADR-0034), the futures market as its own tier (ADR-0035), units,
seasons and a lag scan on the pages, and Atom feeds and a JSON index.

## Tomorrow, in order

1. **Done 10-24: the futures from GitHub.** The 01:00 UTC collect (it
   starts nearer 05:00) was green 10-22, 10-23 and 10-24 with
   `lh_futures_main` and `lh_futures_curve` both `ok`, and the local run no
   longer lists them.
2. **Decisions for the owner, both written up.**
   - 猪粮比价: [the options](2026-10-21-hog-corn-ratio-decision.md). The
     recommendation is A, retire it. Due before 12-17, when the warning
     starts.
   - How the site could earn money: [making it pay](2026-10-21-making-it-pay.md).
     Nothing outward-facing has been started.
   - Visitor analytics: **the owner said not for now (10-24).** Do not add a
     beacon or ask again unprompted; the setup (Cloudflare Web Analytics,
     the owner's account, the token pasted back) is in the pay memo if the
     owner raises it.
3. **Watch the first real calendar event.** The 202609 joint release is
   expected around 10-26 to 10-30 (`usual` 10-26/10-28, `by` 11-03 for the
   quarterly series). When it lands, check: 2026Q3 sow and hog inventory, the
   Q3 YTD 出栏 and 产量 totals, and `hog_output_quarter` gaining 2026Q3, which
   should equal 前3季度 − 上半年 on its series page. Shape drift (ADR-0032)
   will name anything the workbook renamed.
4. **The verification layer (P3, the reason for the storage).** A backtest
   that reads only `published()`. Start with a CLI that answers, per month,
   what 能繁母猪 the public could see on that day, and how long after the
   period. That is the input any lead test must use. Gold computes; it does
   not call turns. The futures record (ADR-0036) is the same idea done for
   the market; the sow figure deserves it more.
5. **Watch the estimate (ADR-0034).** It is fitted on 41 frozen months.
   If the joint release ever prints 规模养殖成本 again, re-check the model
   against it. Next estimate candidates, each needing its own holdout test
   first: 自繁自养 vs 外购仔猪 profit, and the sow-culling margin. A track
   record like the market's needs vintages of the estimate, kept from now.
6. **Platform, next round** (from the brainstorm and the pay memo). The
   weekly digest is done (ADR-0039). Next: check the first issue that holds
   a joint release (W44, around 10-26 to 10-30) reads right, with
   `released` filled and nothing due twice. Findability and the
   calculator's memory and breakeven chart are done (ADR-0040). What is left
   there is the owner's: submitting `sitemap.xml` to a search console needs
   their account, and a root `robots.txt` would need a user-site repository
   (`xlsongc.github.io`). E-mail is the owner's call, because it is
   outward-facing; `week.xml` is what a mailing tool would read. Small one
   left: the English price strip truncates long names.
7. **A small one: a cycle start from the chart.** Today a start is typed as
   a month. Clicking a reading on the series chart to add it would be
   faster, but drag already zooms and a tap already reads, so it needs a
   mode. Only if readers ask.

## Before 2026-12-31

- **Q2 / C6 — 猪粮比价.** `hog_corn_ratio`'s acknowledgement lapses on
  12-31, and `status` and the `ack-lapsing` issue start warning on 12-17.
  The joint release's monthly 猪粮比价 stopped with the 202508 edition (the
  drift check found it), so there is still no machine-readable primary.
  Decide: retire (ADR-0018's default) or renew with a reason. Never
  auto-retire.

## Later (P3)

- C4 listed companies' monthly sales reports (cninfo PDFs, new dependency,
  tier decision). C5 大商所 LH: done through Sina's mirror (ADR-0035, 0036). C3 remainder (白条猪批发价
  ×2, 县乡零售, 36城后腿肉): config plus replay, each a new caliber panel,
  worth it only if the price tier can stay readable.

## Notes for whoever picks this up

- Font sizes come from the `--text-*` tokens (ADR-0037); the build fails
  on a literal size. Chinese needs no font work any more: zpix is gone.
- Anything drawn on an inverted background (ink fill) must set its own
  emphasis colour: `b, strong` are ink page-wide.
- A browser-side computation needs ADR-0033's justification: an input only
  the reader can choose, and no answer from gold.
- An editor here briefly holds `.git/index.lock` now and then; retry a
  failed commit rather than deleting the lock.
