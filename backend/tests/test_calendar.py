"""The release calendar: an expectation read off a series' own releases,
never a date written anywhere (docs/adr/0031)."""

from __future__ import annotations

import datetime as dt

from hogcycle.gold.calendar import MIN_RELEASES, next_period_end, next_release

D = dt.date
AUGUST = D(2026, 8, 31)


def monthly(lags: list[int], *, last: D = AUGUST) -> list[dict]:
    """One dated monthly print per lag, ending at `last`."""
    rows = []
    y, m = last.year, last.month
    for lag in reversed(lags):
        end = next_period_end(D(y, m, 1) - dt.timedelta(days=1), "monthly")
        assert end is not None
        rows.append(
            {
                "obs_date": end,
                "value": 1.0,
                "granularity": "monthly",
                "published_on": end + dt.timedelta(days=lag),
            }
        )
        y, m = (y, m - 1) if m > 1 else (y - 1, 12)
    return list(reversed(rows))


def test_the_next_period_follows_the_latest_cadence():
    assert next_period_end(D(2026, 8, 31), "monthly") == D(2026, 9, 30)
    assert next_period_end(D(2026, 12, 31), "monthly") == D(2027, 1, 31)
    assert next_period_end(D(2026, 6, 30), "quarterly") == D(2026, 9, 30)
    assert next_period_end(D(2026, 12, 31), "quarterly") == D(2027, 3, 31)
    assert next_period_end(D(2026, 10, 8), "weekly") == D(2026, 10, 15)
    assert next_period_end(D(2025, 12, 31), "annual") == D(2026, 12, 31)


def test_usual_is_the_median_lag_and_by_is_the_longest():
    rows = monthly([20, 25, 28, 28, 30, 59])
    assert rows[-1]["obs_date"] == D(2026, 8, 31)
    nxt = next_release(rows, today=D(2026, 10, 19))
    assert nxt == {
        "period": "2026-09-30",
        "usual": "2026-10-28",  # 28 days, the median
        "by": "2026-11-28",  # 59 days, the longest on record
        "overdue": False,
    }


def test_overdue_only_once_later_than_any_release_on_record():
    rows = monthly([28] * 8)
    assert next_release(rows, today=D(2026, 10, 28))["overdue"] is False
    assert next_release(rows, today=D(2026, 10, 29))["overdue"] is True


def test_too_few_releases_set_no_expectation():
    assert next_release(monthly([28] * (MIN_RELEASES - 1)), today=D(2026, 10, 1)) is None


def test_an_undated_latest_value_sets_none():
    rows = monthly([28] * 8)
    rows[-1] = {**rows[-1], "published_on": None}
    assert next_release(rows, today=D(2026, 10, 1)) is None


def test_a_cadence_change_is_followed():
    """能繁母猪存栏 went quarterly at the end of 2025: after a quarter-end
    print the next period is the next quarter, not the next month."""
    rows = monthly([28] * 8, last=D(2026, 5, 31))
    rows.append(
        {"obs_date": D(2026, 6, 30), "value": 1.0, "granularity": "quarterly",
         "published_on": D(2026, 7, 23)}
    )
    assert next_release(rows, today=D(2026, 10, 1))["period"] == "2026-09-30"


def test_nothing_is_written_back():
    rows = monthly([28] * 8)
    before = [dict(r) for r in rows]
    next_release(rows, today=D(2027, 1, 1))
    assert rows == before
