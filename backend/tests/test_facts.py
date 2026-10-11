"""The facts the overview page states in words.

Each one is printed as a sentence ("lowest since 2019", "below 5:1 for 9
weeks"), and a sentence reads as more authoritative than a chart. So these
tests pin the definitions to cases a reader would check by eye.
"""

from __future__ import annotations

import datetime as dt

from hogcycle.gold.facts import extreme, threshold_run

D = dt.date


def rows(*pairs: tuple[dt.date, float | None]):
    return [{"obs_date": d, "value": v} for d, v in pairs]


def monthly(values: list[float]):
    """One value per month from 2020-01, dated the 28th."""
    out, y, m = [], 2020, 1
    for v in values:
        out.append((D(y, m, 28), v))
        m += 1
        if m == 13:
            y, m = y + 1, 1
    return rows(*out)


# --------------------------------------------------------------------------
# extreme
# --------------------------------------------------------------------------

def test_lowest_since_names_the_last_time_it_was_this_low():
    # 30 months: a dip to 5 in month 3, then higher, then 5.5 at the end.
    series = monthly([10, 9, 5] + [12] * 26 + [5.5])
    got = extreme(series, series[-1], min_history=24)
    assert got == {"kind": "low", "since": "2020-03-28", "all": False}


def test_lowest_in_the_whole_record_says_so():
    series = monthly([10] * 29 + [4])
    got = extreme(series, series[-1], min_history=24)
    assert got == {"kind": "low", "since": "2020-01-28", "all": True}


def test_highest_is_found_too():
    series = monthly([10] * 29 + [20])
    assert extreme(series, series[-1], min_history=24)["kind"] == "high"


def test_an_extreme_inside_a_year_is_not_stated():
    """'Lowest since March' describes the calendar, not the cycle."""
    series = monthly([1] + [10] * 20 + [5] + [12] * 7 + [6])  # last ≤6 was 8 months ago
    assert extreme(series, series[-1], min_history=24) is None


def test_a_short_series_gets_no_extreme():
    series = monthly([10] * 12 + [1])
    assert extreme(series, series[-1], min_history=24) is None


def test_extreme_never_looks_past_the_reading_it_describes():
    """A wall rebuilt as of a past date must not reach forward."""
    series = monthly([10] * 29 + [4, 3])
    assert extreme(series, series[-2], min_history=24)["all"] is True


# --------------------------------------------------------------------------
# threshold_run
# --------------------------------------------------------------------------

def test_run_below_counts_back_to_the_last_crossing():
    series = rows((D(2026, 7, 1), 5.3), (D(2026, 7, 8), 4.9), (D(2026, 7, 15), 4.6))
    assert threshold_run(series, 5.0) == {"side": "below", "since": "2026-07-08", "n": 2}


def test_on_the_line_is_breakeven_not_a_loss():
    series = rows((D(2026, 7, 1), 4.8), (D(2026, 7, 8), 5.0))
    assert threshold_run(series, 5.0) == {"side": "above", "since": "2026-07-08", "n": 1}


def test_gaps_do_not_break_or_extend_a_run():
    series = rows((D(2026, 7, 1), 4.8), (D(2026, 7, 8), None), (D(2026, 7, 15), 4.7))
    assert threshold_run(series, 5.0)["n"] == 2


# --------------------------------------------------------------------------
# first_seen, off the bitemporal store
# --------------------------------------------------------------------------

def test_first_seen_is_the_first_fetch_even_after_a_revision(tmp_path):
    from hogcycle.contracts.schema import Observation
    from hogcycle.storage.silver import SilverStore

    silver = SilverStore(tmp_path)

    def obs(value: float, fetched: dt.datetime) -> Observation:
        return Observation(
            indicator="sow_inventory", obs_date=D(2026, 6, 30), value=value,
            unit="万头", granularity="quarterly", source="t", snapshot_id="t",
            fetched_at=fetched,
        )

    first = dt.datetime(2026, 7, 16, 1, tzinfo=dt.UTC)
    silver.append_changes([obs(3780.0, first)])
    silver.append_changes([obs(3790.0, dt.datetime(2026, 9, 1, 1, tzinfo=dt.UTC))])

    now = dt.datetime(2026, 10, 1, tzinfo=dt.UTC)
    assert silver.first_seen("sow_inventory", D(2026, 6, 30), moment=now) == first
    # ...and as of a moment before anything was learned, nothing.
    before = dt.datetime(2026, 7, 1, tzinfo=dt.UTC)
    assert silver.first_seen("sow_inventory", D(2026, 6, 30), moment=before) is None
