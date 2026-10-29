# 猪粮比价 (`hog_corn_ratio`): the decision due 2026-12-31

Written 2026-10-21 for the owner. Plan items Q2 / C6. Nothing changes
until the owner picks an option: a series is never retired automatically
(CLAUDE.md, ADR-0015).

## Where it stands

- **The series stopped on 2026-08-19.** The 玄田 weekly table we read
  still answers, but it has served the same last row since then. Its
  `upstream_dark` acknowledgement (ADR-0015) runs to **2026-12-31**. From
  **12-17** `hogcycle status` and the `ack-lapsing` issue start warning,
  and on 01-01 the daily run goes red.
- **The primary has no machine-readable copy.** 发改委价格监测中心 publishes
  the weekly ratio on 中国价格信息网 as an image only. The latest public
  issue there was for 2026-06-24 (released 06-29). The monthly 猪粮比价 in
  the five-ministry joint release stopped with the 202508 edition (the
  drift check found it gone).
- **What it said last.** 4.55 on 2026-08-19, below 5:1 for 26 weeks
  running since 2026-02-25. That is the 发改委 "excessive fall" first-level
  warning line.

## What the site has instead

| reading | caliber | latest | how it relates |
|---|---|---|---|
| `hog_corn_ratio_county` 猪粮比价（500县集贸） | 农业农村部 500-county markets, hog ÷ corn from the same collection day, computed in gold | 4.50 on 2026-10-15 | Over the 230 weeks it shares with 发改委's ratio: r = 0.996, 0.26 lower on average, up to 0.63 apart (ADR-0018). So it carries no 5:1 line |
| `profit_per_head_est` 养殖利润（估算） | our model, calibrated on the 41 official months (ADR-0034) | −382 元/head, week of 2026-10-15 | Profit and loss per head directly, which is what the ratio stood in for. Holdout: within 45–51 元/head, right sign 94–100% |
| `breakeven_price_est` | same model | 13.70 元/kg | Against a 500-county hog price of 10.89 元/kg |

The overview's margin card already shows the estimate. The county ratio is
on the wall beside it.

## Options

**A. Retire it (recommended; ADR-0018's default).** Mark `hog_corn_ratio`
`retired` in config with the reason. Its six years of history stay on its
own page and in the CSV, its panel leaves the wall, and the run stays
green. The 5:1 line stays drawn on the history it was defined on. If
发改委 ever publishes the weekly ratio in a readable form again, that is a
new source with its own id, continuing this one through `caliber_from`
(ADR-0026).

- For: no readable primary for four months, the monthly print gone since
  202508, and two better readings already on the site.
- Against: the 5:1 line is the one number the policy literature quotes, and
  the site would no longer show where the current week sits against it.

**B. Renew the acknowledgement with a reason, to 2027-03-31 at most.** Only
worth it with a concrete path to a primary: 发改委 resuming text releases,
or another official channel found to carry the weekly figure. Reading the
image (OCR) would be a new dependency on a fragile path, and a misread
digit in a ratio near 5 is exactly the confident wrong answer the project
exists to avoid. Not recommended without a new source in hand.

**Not options**, and why:

- *Draw 5:1 on the county ratio.* The line is defined on 发改委's caliber;
  the county ratio runs 0.26 lower, so weeks would cross the line on one
  and not the other. Two calibers on one threshold is the mistake CLAUDE.md
  names first.
- *Shift the county ratio by +0.26 and call it 猪粮比价.* An invented series
  wearing an official name.

## What the owner needs to say

"A" or "B (with the new source)". With A, the change is one config block
and a line in this file; it can land any day before 12-17 so the warning
never fires.

## The owner's answer (2026-10-29)

**Neither yet: keep it as it is and look for a replacement source nearer
the time.** Nothing changes now; the acknowledgement still runs to 12-31.
When `status` and the `ack-lapsing` issue start warning on 12-17, look
again for a readable primary for the weekly ratio (发改委 text releases on
中国价格信息网 or 发改委's own site, or another official channel carrying the
same figure). With one in hand, that is B with the new source; without one,
put A to the owner again before 12-31.
