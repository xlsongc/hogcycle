"""What a scale farm earns on a hog, estimated weekly from prices that are
still printed (docs/adr/0034).

The joint release printed 规模养殖每头成本 and 每头净利润 every month until
its 202508 edition, then stopped. Losses are what make farms cull sows, so
the margin tier lost the reading the cycle turns on. The prices behind those
numbers did not stop: the ministry's weekly 500-county report still prints
the hog price, the fattening-feed price and the piglet price.

So the cost is modelled on the months both exist, and carried forward:

    cost     = a + b · feed price + c · piglet price    (both 13 weeks earlier)
    revenue  = w · hog price                             (w: a calibrated weight)
    profit   = revenue − cost
    breakeven = cost ÷ w                                 (the hog price at zero)

The lag is the time between buying the feed and the piglet and selling the
hog: a model with prices of the same week fitted cost with an error of 90
元/head, with three months' lag 33. `w` is not a liveweight: it is whatever
turns the 500-county price into the release's revenue (cost + profit), 136
kg on average, which also absorbs the gap between the two price calibers.

Checked out of sample before it was built: fit on the first 24, 28 or 32
months, predicting the rest, the profit was off by 45–51 元/head on a series
that swings ±388, correlated 0.93–0.98, and had the sign right in 94–100% of
months.

It is an estimate, and it says so. It is its own indicator, never drawn as
the official series. It is refitted from silver as known at the export's
moment, so a past day sees the model it could have had. And it carries no
release date, because nobody released it: it is knowable from the day this
warehouse could compute it, the latest of its inputs and its calibration.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from typing import Any, Literal

from ..registry.spec import IndicatorSpec
from ..storage.silver import SilverStore

HOG = "hog_price_county"
FEED = "feed_price_county"
PIGLET = "piglet_price"
COST = "scale_cost_per_head"
PROFIT = "scale_profit_per_head"

LAG_DAYS = 91
# A lagged price is taken from the reading nearest t − LAG_DAYS, and only if
# one sits this close: the weekly report skips a week now and then, and a
# gap is not to be bridged with a price from a month away.
MATCH_DAYS = 7
LAG_MONTHS = 3
# Two years of overlap at least: fewer months than that cannot separate the
# feed effect from the piglet effect.
MIN_MONTHS = 24


@dataclass(frozen=True, slots=True)
class Fit:
    intercept: float
    feed: float
    piglet: float
    weight: float
    months: int
    # The newest fetch among the calibration rows: before it, this model
    # could not have been fitted.
    fetched_at: dt.datetime

    def cost(self, feed: float, piglet: float) -> float:
        return self.intercept + self.feed * feed + self.piglet * piglet


def _month(d: dt.date) -> tuple[int, int]:
    return (d.year, d.month)


def _shift(ym: tuple[int, int], months: int) -> tuple[int, int]:
    total = ym[0] * 12 + ym[1] - 1 + months
    return (total // 12, total % 12 + 1)


def _monthly_means(rows: list[dict[str, Any]]) -> dict[tuple[int, int], float]:
    sums: dict[tuple[int, int], list[float]] = {}
    for r in rows:
        if r["value"] is not None:
            sums.setdefault(_month(r["obs_date"]), []).append(r["value"])
    return {k: sum(v) / len(v) for k, v in sums.items()}


def _solve3(a: list[list[float]], b: list[float]) -> list[float] | None:
    """Gaussian elimination with partial pivoting, for the 3×3 normal
    equations; None when the system is singular (one input never moved)."""
    m = [[*row, rhs] for row, rhs in zip(a, b, strict=True)]
    n = 3
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(m[r][col]))
        if abs(m[pivot][col]) < 1e-12:
            return None
        m[col], m[pivot] = m[pivot], m[col]
        for r in range(n):
            if r != col:
                f = m[r][col] / m[col][col]
                m[r] = [x - f * y for x, y in zip(m[r], m[col], strict=True)]
    return [m[i][n] / m[i][i] for i in range(n)]


def fit(silver: SilverStore, moment: dt.datetime) -> Fit | None:
    """Least squares of the official cost on the lagged monthly mean feed
    and piglet prices, and the mean revenue-to-price ratio, over every month
    with all five inputs known at `moment`. None below MIN_MONTHS."""
    cost = {_month(r["obs_date"]): r for r in silver.series(COST, moment=moment)}
    profit = {_month(r["obs_date"]): r for r in silver.series(PROFIT, moment=moment)}
    hog = _monthly_means(silver.series(HOG, moment=moment))
    feed = _monthly_means(silver.series(FEED, moment=moment))
    piglet = _monthly_means(silver.series(PIGLET, moment=moment))

    xs: list[tuple[float, float, float]] = []
    ys: list[float] = []
    weights: list[float] = []
    fetched: list[dt.datetime] = []
    for ym in sorted(cost.keys() & profit.keys()):
        c, p = cost[ym]["value"], profit[ym]["value"]
        before = _shift(ym, -LAG_MONTHS)
        known = ym in hog and before in feed and before in piglet
        if c is None or p is None or not known:
            continue
        xs.append((1.0, feed[before], piglet[before]))
        ys.append(c)
        weights.append((c + p) / hog[ym])
        fetched += [cost[ym]["fetched_at"], profit[ym]["fetched_at"]]
    if len(xs) < MIN_MONTHS:
        return None

    xtx = [[sum(x[i] * x[j] for x in xs) for j in range(3)] for i in range(3)]
    xty = [sum(x[i] * y for x, y in zip(xs, ys, strict=True)) for i in range(3)]
    coef = _solve3(xtx, xty)
    if coef is None:
        return None
    return Fit(
        intercept=coef[0],
        feed=coef[1],
        piglet=coef[2],
        weight=sum(weights) / len(weights),
        months=len(xs),
        fetched_at=max(fetched),
    )


def _nearest(
    rows: list[dict[str, Any]], target: dt.date
) -> dict[str, Any] | None:
    best = min(rows, key=lambda r: abs((r["obs_date"] - target).days), default=None)
    if best is None or abs((best["obs_date"] - target).days) > MATCH_DAYS:
        return None
    return best


@dataclass(frozen=True, slots=True)
class Estimate:
    spec: IndicatorSpec
    kind: Literal["profit", "breakeven"]

    def rows(self, silver: SilverStore, moment: dt.datetime) -> list[dict[str, Any]]:
        model = fit(silver, moment)
        if model is None:
            return []
        feed = [r for r in silver.series(FEED, moment=moment) if r["value"] is not None]
        piglet = [r for r in silver.series(PIGLET, moment=moment) if r["value"] is not None]
        out: list[dict[str, Any]] = []
        for h in silver.series(HOG, moment=moment):
            if h["value"] is None:
                continue
            then = h["obs_date"] - dt.timedelta(days=LAG_DAYS)
            f, p = _nearest(feed, then), _nearest(piglet, then)
            if f is None or p is None:
                continue
            cost = model.cost(f["value"], p["value"])
            value = (
                model.weight * h["value"] - cost
                if self.kind == "profit"
                else cost / model.weight
            )
            out.append(
                {
                    "obs_date": h["obs_date"],
                    "value": round(value, 0 if self.kind == "profit" else 2),
                    "granularity": h["granularity"],
                    "unit": self.spec.unit,
                    # Nobody released it: knowable from when it could be
                    # computed, never dated by the inputs' release.
                    "published_on": None,
                    "fetched_at": max(
                        h["fetched_at"], f["fetched_at"], p["fetched_at"], model.fetched_at
                    ),
                }
            )
        return out

    def first_seen(
        self, silver: SilverStore, obs_date: dt.date, *, moment: dt.datetime
    ) -> dt.datetime | None:
        return next(
            (
                r["fetched_at"]
                for r in self.rows(silver, moment)
                if r["obs_date"] == obs_date
            ),
            None,
        )


def _estimate(
    id: str, name_zh: str, name_en: str, unit: str, lo: float, hi: float,
    kind: Literal["profit", "breakeven"],
) -> Estimate:
    return Estimate(
        spec=IndicatorSpec(
            id=id,
            name_zh=name_zh,
            name_en=name_en,
            tier="margin",
            freq="weekly",
            unit=unit,
            lo=lo,
            hi=hi,
            adapter="gold",
            call={"estimate": kind},
        ),
        kind=kind,
    )


ESTIMATES: tuple[Estimate, ...] = (
    _estimate(
        "profit_per_head_est", "每头净利润（规模养殖，估算）",
        "Net profit per hog (scale farms, estimated)", "CNY/head", -3000.0, 5000.0,
        "profit",
    ),
    _estimate(
        "breakeven_price_est", "盈亏平衡猪价（规模养殖，估算）",
        "Breakeven hog price (scale farms, estimated)", "CNY/kg", 3.0, 60.0, "breakeven",
    ),
)
