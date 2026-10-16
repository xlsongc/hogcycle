"""Checks that validation cannot make one batch at a time (docs/adr/0029).

    error   the store itself is wrong: a duplicate bitemporal key. Fails
            `status --fail-on-stale`, like a stale series.
    warn    two sources that measure the same thing have stopped agreeing.
            Printed every run, never fails it: which one moved is a question
            for a person.

The thresholds are the measured agreement of each pair with room for an
ordinary month, recorded in the ADR. Loosening one is a reviewed diff.
"""

from __future__ import annotations

import datetime as dt
import statistics
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from .gold.series import all_specs, rows_of
from .registry.spec import Registry
from .storage.silver import SilverStore

ERROR = "error"
WARN = "warn"
OK = "ok"

# 仔猪价格: the month's weekly mean against the monthly print. 56 of 56 months
# within 2% to 2026-08, the worst 1.8% (2022-12).
PIGLET_MAX_PCT = 2.0
# 猪粮比价: NDRC minus 500-county, the same week. Mean 0.256, sd 0.155, worst
# 0.63 over 231 weeks (ADR-0018).
RATIO_MEAN_GAP = 0.26
RATIO_MAX_DRIFT = 0.5
# Year-end sows: 统计局 and USDA's estimate are identical from 2023.
SOWS_FROM = 2023
SOWS_MAX_PCT = 0.5


@dataclass(frozen=True, slots=True)
class Check:
    name: str
    level: str  # ok / warn / error
    detail: str

    def as_json(self) -> dict[str, Any]:
        return {"kind": "quality", "check": self.name, "level": self.level,
                "detail": self.detail}


def unique_keys(silver: SilverStore) -> Check:
    rows = silver.query(
        """
        SELECT indicator, obs_date, fetched_at, published_on, COUNT(*) AS n
        FROM silver GROUP BY ALL HAVING COUNT(*) > 1
        ORDER BY indicator, obs_date LIMIT 5
        """
    )
    if not rows:
        return Check("unique bitemporal key", OK, "no duplicate rows")
    shown = "; ".join(f"{r[0]} {r[1]} fetched {r[2]:%Y-%m-%d %H:%M} ×{r[4]}" for r in rows)
    return Check(
        "unique bitemporal key", ERROR,
        f"duplicate (indicator, obs_date, fetched_at, published_on): {shown}",
    )


def _values(
    registry: Registry, silver: SilverStore, indicator: str
) -> dict[dt.date, float]:
    spec = next(s for s in all_specs(registry) if s.id == indicator)
    moment = dt.datetime.now(dt.UTC)
    return {
        r["obs_date"]: r["value"]
        for r in rows_of(spec, silver, moment=moment)
        if r["value"] is not None
    }


def piglet_months(weekly: dict[dt.date, float], monthly: dict[dt.date, float]) -> Check:
    name = "仔猪价格 weekly mean ~ monthly print"
    by_month: dict[tuple[int, int], list[float]] = defaultdict(list)
    for d, v in weekly.items():
        by_month[(d.year, d.month)].append(v)
    gaps = [
        (d, (statistics.mean(by_month[(d.year, d.month)]) - v) / v * 100)
        for d, v in sorted(monthly.items())
        if (d.year, d.month) in by_month and v
    ]
    if not gaps:
        return Check(name, OK, "no month in both")
    within = sum(abs(g) <= PIGLET_MAX_PCT for _, g in gaps)
    last, gap = gaps[-1]
    detail = (
        f"{within}/{len(gaps)} months within {PIGLET_MAX_PCT}%; "
        f"latest {last:%Y-%m} {gap:+.2f}%"
    )
    return Check(name, WARN if abs(gap) > PIGLET_MAX_PCT else OK, detail)


def ratio_weeks(ndrc: dict[dt.date, float], county: dict[dt.date, float]) -> Check:
    name = "猪粮比价 NDRC ~ 500-county"
    # The NDRC week ends up to six days before the county's collection day.
    pairs = []
    for d, v in sorted(county.items()):
        near = [x for x in ndrc if 0 <= (d - x).days <= 6]
        if near:
            pairs.append((d, ndrc[max(near)] - v))
    if not pairs:
        return Check(name, OK, "no week in both")
    last, gap = pairs[-1]
    drift = gap - RATIO_MEAN_GAP
    detail = (
        f"{len(pairs)} weeks; mean gap {statistics.mean(g for _, g in pairs):.3f}; "
        f"latest {last} {gap:+.2f} ({drift:+.2f} from {RATIO_MEAN_GAP})"
    )
    return Check(name, WARN if abs(drift) > RATIO_MAX_DRIFT else OK, detail)


def sow_year_ends(nbs: dict[dt.date, float], usda: dict[dt.date, float]) -> Check:
    name = "能繁母猪 统计局 ~ USDA year-end"
    # USDA counts in 1000 head; 万头 is 10,000.
    pairs = [
        (d, (usda[d] / 10 - v) / v * 100)
        for d, v in sorted(nbs.items())
        if d.month == 12 and d.year >= SOWS_FROM and d in usda and v
    ]
    if not pairs:
        return Check(name, OK, f"no year-end from {SOWS_FROM} in both")
    off = [(d, g) for d, g in pairs if abs(g) > SOWS_MAX_PCT]
    if off:
        listed = ", ".join(f"{d.year} {g:+.2f}%" for d, g in off)
        return Check(name, WARN, f"differ by more than {SOWS_MAX_PCT}%: {listed}")
    return Check(name, OK, f"{len(pairs)} year-ends within {SOWS_MAX_PCT}%")


def run_checks(registry: Registry, silver: SilverStore) -> list[Check]:
    known = {s.id for s in all_specs(registry)}

    def v(indicator: str) -> dict[dt.date, float]:
        return _values(registry, silver, indicator)

    pairs = [
        (("piglet_price", "piglet_price_monthly"), piglet_months),
        (("hog_corn_ratio", "hog_corn_ratio_county"), ratio_weeks),
        (("sow_inventory", "usda_sow_stocks"), sow_year_ends),
    ]
    # A pair whose series are not both configured has nothing to compare.
    return [unique_keys(silver)] + [
        check(v(a), v(b)) for (a, b), check in pairs if {a, b} <= known
    ]
