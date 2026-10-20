"""The profit and breakeven estimate: fitted on the official months, carried
forward on weekly prices, and honest about when it was knowable
(docs/adr/0034)."""

from __future__ import annotations

import datetime as dt
import math

import pytest

from hogcycle.contracts.schema import Observation
from hogcycle.gold.estimate import ESTIMATES, MIN_MONTHS, fit
from hogcycle.storage.silver import SilverStore

UTC = dt.UTC
WEEKLY_AT = dt.datetime(2026, 9, 5, tzinfo=UTC)
OFFICIAL_AT = dt.datetime(2026, 9, 20, tzinfo=UTC)
NOW = dt.datetime(2026, 10, 20, tzinfo=UTC)
A, B, C, W = 800.0, 240.0, 12.0, 135.0
PROFIT_EST, BREAKEVEN_EST = ESTIMATES


def week_days(start: dt.date, end: dt.date) -> list[dt.date]:
    out, d = [], start
    while d <= end:
        out.append(d)
        d += dt.timedelta(days=7)
    return out


def ob(indicator: str, d: dt.date, v: float, g: str, at: dt.datetime) -> Observation:
    return Observation(
        indicator=indicator, obs_date=d, value=v, unit="x", granularity=g,
        source="test", snapshot_id="t", fetched_at=at,
    )


def month_end(y: int, m: int) -> dt.date:
    return dt.date(y + m // 12, m % 12 + 1, 1) - dt.timedelta(days=1)


def world(
    tmp_path, *, months: int = 36, gap: tuple[dt.date, dt.date] | None = None
) -> SilverStore:
    """Weekly prices on independent cycles, and official monthly cost and
    profit generated from them by the model's own form, exactly."""
    silver = SilverStore(tmp_path / "silver")
    days = week_days(dt.date(2022, 1, 5), dt.date(2025, 12, 31))
    hog = {d: 16 + 4 * math.sin(i / 9) for i, d in enumerate(days)}
    feed = {d: 3.2 + 0.4 * math.sin(i / 13 + 1) for i, d in enumerate(days)}
    piglet = {d: 30 + 12 * math.sin(i / 7 + 2) for i, d in enumerate(days)}
    obs = [ob("hog_price_county", d, v, "weekly", WEEKLY_AT) for d, v in hog.items()]
    obs += [
        ob("feed_price_county", d, v, "weekly", WEEKLY_AT)
        for d, v in feed.items()
        if not (gap and gap[0] <= d <= gap[1])
    ]
    obs += [ob("piglet_price", d, v, "weekly", WEEKLY_AT) for d, v in piglet.items()]

    def mean(series: dict[dt.date, float], y: int, m: int) -> float:
        xs = [v for d, v in series.items() if (d.year, d.month) == (y, m)]
        return sum(xs) / len(xs)

    for k in range(months):
        y, m = 2022 + (3 + k) // 12, (3 + k) % 12 + 1
        ly, lm = 2022 + k // 12, k % 12 + 1
        cost = A + B * mean(feed, ly, lm) + C * mean(piglet, ly, lm)
        revenue = W * mean(hog, y, m)
        end = month_end(y, m)
        obs += [
            ob("scale_cost_per_head", end, cost, "monthly", OFFICIAL_AT),
            ob("scale_profit_per_head", end, revenue - cost, "monthly", OFFICIAL_AT),
        ]
    silver.append_changes(obs)
    return silver


def test_the_fit_recovers_the_model_the_official_months_were_made_from(tmp_path):
    model = fit(world(tmp_path), NOW)
    assert model is not None and model.months == 36
    assert model.intercept == pytest.approx(A, abs=1e-6)
    assert model.feed == pytest.approx(B, abs=1e-6)
    assert model.piglet == pytest.approx(C, abs=1e-6)
    assert model.weight == pytest.approx(W, abs=1e-9)


def test_profit_and_breakeven_agree_and_carry_no_release_date(tmp_path):
    silver = world(tmp_path)
    profit = {r["obs_date"]: r for r in PROFIT_EST.rows(silver, NOW)}
    breakeven = {r["obs_date"]: r for r in BREAKEVEN_EST.rows(silver, NOW)}
    hog = {r["obs_date"]: r["value"] for r in silver.series("hog_price_county", moment=NOW)}
    assert profit.keys() == breakeven.keys()
    # Weeks past the last official month are estimated too: that is the point.
    assert max(profit) > dt.date(2025, 6, 30)
    for d, r in profit.items():
        assert r["published_on"] is None
        assert r["fetched_at"] >= OFFICIAL_AT
        # profit = W·hog − cost and breakeven = cost / W, so the two meet.
        # Both are rounded (to 1 and to 0.01), hence the tolerance.
        assert r["value"] == pytest.approx(W * (hog[d] - breakeven[d]["value"]), abs=1.5)


def test_before_the_official_months_were_known_there_is_no_estimate(tmp_path):
    silver = world(tmp_path)
    assert PROFIT_EST.rows(silver, OFFICIAL_AT - dt.timedelta(days=1)) == []


def test_too_few_official_months_fit_nothing(tmp_path):
    assert fit(world(tmp_path, months=MIN_MONTHS - 1), NOW) is None


def test_a_week_whose_lagged_price_is_missing_is_not_bridged(tmp_path):
    gap = (dt.date(2024, 1, 1), dt.date(2024, 2, 29))
    silver = world(tmp_path, gap=gap)
    weeks = {r["obs_date"] for r in PROFIT_EST.rows(silver, NOW)}
    lag = dt.timedelta(days=91)
    hog = [r["obs_date"] for r in silver.series("hog_price_county", moment=NOW)]
    # Thirteen weeks after the middle of a two-month hole in the feed price
    # there is no estimate; thirteen weeks after its edges' neighbours, there is.
    margin = dt.timedelta(days=8)
    inside = [d for d in hog if gap[0] + margin <= d - lag <= gap[1] - margin]
    outside = [d for d in hog if dt.date(2023, 10, 1) <= d - lag <= dt.date(2023, 11, 30)]
    assert inside and outside
    assert not weeks & set(inside)
    assert set(outside) <= weeks
