"""Period labels are the seam where upstream messiness meets the store.

Every shape here was observed in a live akshare response. The convention
under test is that a label resolves to the END of its period — these series
are point-in-time stocks or period averages, and the end date is the only
reading that stays correct when granularities sit side by side.
"""

from __future__ import annotations

import datetime as dt

import pytest

from hogcycle.registry.periods import PeriodParseError, parse_period


@pytest.mark.parametrize(
    ("label", "date", "granularity"),
    [
        ("2009", dt.date(2009, 12, 31), "annual"),
        ("2024", dt.date(2024, 12, 31), "annual"),
        ("2025年一季度（末）", dt.date(2025, 3, 31), "quarterly"),
        ("2025年二季度（末）", dt.date(2025, 6, 30), "quarterly"),
        ("2025年三季度（末）", dt.date(2025, 9, 30), "quarterly"),
        ("2025年四季度（末）", dt.date(2025, 12, 31), "quarterly"),
        ("2025年7月", dt.date(2025, 7, 31), "monthly"),
        ("2025年10月", dt.date(2025, 10, 31), "monthly"),
        ("2024年2月", dt.date(2024, 2, 29), "monthly"),  # leap year
        ("2018年第01周", dt.date(2018, 1, 7), "weekly"),
        ("2026年第33周", dt.date(2026, 8, 16), "weekly"),
    ],
)
def test_chinese_labels_resolve_to_period_end(label, date, granularity):
    period = parse_period(label, default="daily")
    assert period.date == date
    assert period.granularity == granularity


def test_bare_dates_inherit_the_declared_frequency():
    """A daily and a weekly series both arrive as plain dates; only the config
    can tell them apart, so the label must not invent a granularity."""
    assert parse_period("2026-08-31", default="daily").granularity == "daily"
    assert parse_period("2026-08-31", default="weekly").granularity == "weekly"
    assert parse_period(dt.date(2026, 8, 31), default="weekly").date == dt.date(2026, 8, 31)
    assert parse_period(
        dt.datetime(2026, 8, 31, 12, 0, tzinfo=dt.UTC), default="daily"
    ).date == dt.date(2026, 8, 31)


@pytest.mark.parametrize(
    "raw", ["2026/08/31", "20260831", "2026年8月31日"]
)
def test_alternate_date_formats(raw):
    assert parse_period(raw, default="daily").date == dt.date(2026, 8, 31)


@pytest.mark.parametrize(
    "raw", ["", "  ", "第3周", "2025年13月", "next tuesday", "2025年五季度"]
)
def test_unparseable_labels_raise_rather_than_guess(raw):
    with pytest.raises(PeriodParseError):
        parse_period(raw, default="daily")


def test_quarter_and_month_labels_can_collide_on_one_date():
    """2025年三季度（末）and a hypothetical 2025年9月 both land on 09-30.
    The parser is allowed to produce that; catching it is validation's job,
    and it must be a hard failure rather than an arbitrary pick."""
    q = parse_period("2025年三季度（末）", default="monthly")
    m = parse_period("2025年9月", default="monthly")
    assert q.date == m.date == dt.date(2025, 9, 30)
    assert q.granularity != m.granularity
