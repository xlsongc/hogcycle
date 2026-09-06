"""The guard against a source that stops without failing.

This is the regression net for an eleven-month blind spot: `sow_inventory`
came from a mirror that froze in 2025年10月 and kept serving its last rows, so
every run logged `ok, 0 rows` — byte-identical to a healthy quiet day.
"""

from __future__ import annotations

import datetime as dt

import pytest

from hogcycle.registry.spec import Extract, IndicatorSpec
from hogcycle.registry.staleness import DEFAULT_MAX_AGE_DAYS, check, limit_for

TODAY = dt.date(2026, 9, 6)


def spec(**kw) -> IndicatorSpec:
    base = dict(
        id="s",
        name_zh="s",
        tier="capacity",
        freq="monthly",
        unit="万头",
        lo=0.0,
        hi=1e9,
        adapter="moa",
        call={"fn": "moa_hog_release"},
        extract=Extract(value="x"),
    )
    return IndicatorSpec(**{**base, **kw})


def test_the_freeze_that_motivated_this_would_now_be_caught():
    """The real numbers: a monthly series whose last value was 2025-10-31,
    checked on the day the freeze was actually discovered."""
    s = check(spec(freq="monthly"), dt.date(2025, 10, 31), today=TODAY)
    assert s.stale
    assert s.age_days == 310
    assert "STALE" in s.note


def test_a_series_inside_its_own_cadence_is_not_stale():
    s = check(spec(freq="monthly"), dt.date(2026, 7, 31), today=TODAY)
    assert not s.stale
    assert s.note == "37d"


def test_quarterly_cadence_survives_the_gap_between_prints():
    """2026Q2 prints ~20 days after quarter end and nothing follows until
    2026Q3 lands in October, so the latest obs_date legitimately ages past
    110 days. An alarm here would fire every autumn, and an alarm that cries
    wolf annually gets muted."""
    q2, october = dt.date(2026, 6, 30), dt.date(2026, 10, 15)
    # Mid-October is the pinch: Q2 is 107 days old and Q3 has not printed yet.
    assert not check(spec(freq="monthly", max_age_days=150), q2, today=october).stale
    # Without the override the monthly default fires here — every single year.
    assert check(spec(freq="monthly"), q2, today=october).stale
    # And it is not stale earlier in the gap either.
    assert not check(spec(freq="monthly", max_age_days=150), q2, today=TODAY).stale


def test_retired_is_finished_not_frozen():
    """A closed caliber must not raise an alarm no matter how old, or the
    permanent red trains the reader to ignore every red."""
    s = check(spec(retired=True), dt.date(2025, 5, 31), today=TODAY)
    assert not s.stale
    assert s.note == "retired"
    assert s.age_days == 463  # still reported, just not alarming


def test_never_collected_is_reported_but_not_stale():
    """Absence is a different problem with a different fix, and calling it
    stale would bury the real one."""
    s = check(spec(), None, today=TODAY)
    assert not s.stale
    assert s.note == "no data"


def test_the_explicit_limit_wins_over_the_frequency_default():
    assert limit_for(spec(freq="daily")) == DEFAULT_MAX_AGE_DAYS["daily"]
    assert limit_for(spec(freq="daily", max_age_days=400)) == 400


def test_thresholds_span_more_than_one_publication_cycle():
    """Each limit has to clear two cadences plus the publication lag, or the
    guard fires on ordinary gaps — 春节 closes physical trade for two weeks."""
    for freq, days in (("daily", 14), ("weekly", 14), ("monthly", 62)):
        assert DEFAULT_MAX_AGE_DAYS[freq] > days


def test_a_nonsense_limit_is_rejected_at_load_time():
    with pytest.raises(ValueError, match="max_age_days"):
        spec(max_age_days=0)


# --------------------------------------------------------------------------
# Not staleness, but the same instinct: do not claim more than the data holds
# --------------------------------------------------------------------------

def test_a_short_series_gets_no_percentile():
    """屠宰量 begins 2025-07 with 13 monthly points, all inside one year. A
    percentile over that would read as cycle position while describing a
    single winter."""
    from hogcycle.gold.wall import MIN_HISTORY_FOR_PERCENTILE, percentile

    short = [float(i) for i in range(13)]
    assert percentile(short, 6.0) is None

    # build_wall always asks where the series' own latest value sits, so the
    # target is drawn from the list — the ends are 0 and 100.
    long = [float(i) for i in range(MIN_HISTORY_FOR_PERCENTILE)]
    assert percentile(long, long[0]) == 0
    assert percentile(long, long[-1]) == 100
    # A target above everything is still a percentage, not 104.
    assert percentile(long, 1e9) == 100


# --------------------------------------------------------------------------
# A whole source going dark is not "partial success"
# --------------------------------------------------------------------------

def _result(indicator: str, ok: bool):
    from hogcycle.pipeline import Result

    return Result(indicator, ok, 0, False, None if ok else "upstream failed")


def test_one_source_going_dark_is_detected_even_when_most_series_are_fine():
    """The real case: 6 of 20 indicators failed on a GitHub runner and the run
    went green, because 14 others succeeded. Those 6 were every moa series —
    the project's leading indicator among them — and the source was simply
    unreachable from that IP."""
    from pathlib import Path

    from hogcycle.cli.main import _source_outages
    from hogcycle.registry.loader import load_registry

    reg = load_registry(Path(__file__).resolve().parents[2] / "config" / "sources.yaml")
    results = [
        _result(s.id, ok=(s.adapter != "moa")) for s in reg
    ]
    outages = _source_outages(reg, results)
    assert set(outages) == {"moa"}
    assert "sow_inventory" in outages["moa"]


def test_a_single_flaky_series_is_not_an_outage():
    """One endpoint misbehaving must not go red, or the alarm gets muted."""
    from pathlib import Path

    from hogcycle.cli.main import _source_outages
    from hogcycle.registry.loader import load_registry

    reg = load_registry(Path(__file__).resolve().parents[2] / "config" / "sources.yaml")
    results = [_result(s.id, ok=(s.id != "sow_inventory")) for s in reg]
    assert _source_outages(reg, results) == {}


# --------------------------------------------------------------------------
# Year-on-year, which the header puts next to the headline number
# --------------------------------------------------------------------------

def _row(d: dt.date, v: float | None):
    return {"obs_date": d, "value": v, "granularity": "quarterly", "unit": "万头"}


def test_yoy_matches_the_figure_the_source_publishes_itself():
    """统计局 reported 2026Q2 能繁母猪存栏 at 3780, down 6.5% year on year.
    Deriving it from our own series has to land on the same number, or the
    series is not what it claims to be."""
    from hogcycle.gold.wall import year_on_year

    rows = [_row(dt.date(2025, 6, 30), 4043.0), _row(dt.date(2026, 6, 30), 3780.0)]
    assert year_on_year(rows, rows[-1]) == -6.5


def test_yoy_is_none_when_nothing_sits_near_the_anniversary():
    """A series that began this year has no year-on-year, and inventing one
    from the oldest point available would compare across seasons."""
    from hogcycle.gold.wall import year_on_year

    rows = [_row(dt.date(2026, 3, 31), 100.0), _row(dt.date(2026, 6, 30), 120.0)]
    assert year_on_year(rows, rows[-1]) is None


def test_yoy_ignores_later_observations():
    """Rebuilding the wall as it stood on a past date must not reach forward."""
    from hogcycle.gold.wall import year_on_year

    rows = [
        _row(dt.date(2025, 6, 30), 4043.0),
        _row(dt.date(2026, 6, 30), 3780.0),
        _row(dt.date(2026, 9, 30), 3600.0),
    ]
    assert year_on_year(rows, rows[1]) == -6.5
