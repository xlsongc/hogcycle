"""The tests that justify the whole storage design.

能繁母猪 gets restated after the fact. If silver overwrote, the March figure
you see today would be the revised one, and any claim that your signal "would
have caught the turn" would be unfalsifiable. These tests pin down that the
store can still hand back the number as it stood on a given day.
"""

from __future__ import annotations

import datetime as dt

import pytest

from hogcycle.collectors.akshare import AkshareAdapter
from hogcycle.contracts.schema import Observation
from hogcycle.contracts.validation import ValidationError, validate
from hogcycle.pipeline import collect_one
from hogcycle.registry.spec import Extract, IndicatorSpec
from hogcycle.storage.bronze import BronzeStore
from hogcycle.storage.silver import SilverStore

UTC = dt.UTC

SPEC = IndicatorSpec(
    id="sow_inventory",
    name_zh="能繁母猪存栏",
    tier="capacity",
    freq="monthly",
    unit="万头",
    lo=1000.0,
    hi=10000.0,
    adapter="akshare",
    call={"fn": "futures_hog_supply", "symbol": "生猪产能"},
    extract=Extract(period="周期", value="能繁母猪存栏"),
    revises=True,
)


class FakeAdapter(AkshareAdapter):
    """Same normalise() as the real adapter; only fetch() is stubbed."""

    def __init__(self, records):
        self._records = records

    def fetch(self, spec):
        return {"columns": ["周期", "能繁母猪存栏"], "records": self._records}


def _stores(tmp_path):
    return BronzeStore(tmp_path / "bronze"), SilverStore(tmp_path / "silver")


def test_revision_is_appended_not_overwritten(tmp_path):
    bronze, silver = _stores(tmp_path)

    day1 = dt.datetime(2026, 4, 20, tzinfo=UTC)
    first = FakeAdapter([{"周期": "2026年3月", "能繁母猪存栏": 3920.0}])
    r1 = collect_one(SPEC, first, bronze, silver, now=day1)
    assert r1.ok and r1.rows_written == 1

    # A month later the same obs_date comes back restated.
    day2 = dt.datetime(2026, 5, 20, tzinfo=UTC)
    second = FakeAdapter([{"周期": "2026年3月", "能繁母猪存栏": 3904.0}])
    r2 = collect_one(SPEC, second, bronze, silver, now=day2)
    assert r2.rows_written == 1

    march = dt.date(2026, 3, 31)
    # What we believed in April is still recoverable...
    known_april = silver.as_of(
        dt.datetime(2026, 4, 25, tzinfo=UTC), indicator="sow_inventory"
    )
    assert known_april[march] == 3920.0
    # ...and today's answer is the revision.
    known_now = silver.as_of(
        dt.datetime(2026, 6, 1, tzinfo=UTC), indicator="sow_inventory"
    )
    assert known_now[march] == 3904.0

    trail = silver.revisions("sow_inventory")
    assert [v for _, _, v in trail] == [3920.0, 3904.0]


def test_unchanged_reruns_write_nothing(tmp_path):
    bronze, silver = _stores(tmp_path)
    records = [{"周期": "2026年3月", "能繁母猪存栏": 3920.0}]

    r1 = collect_one(SPEC, FakeAdapter(records), bronze, silver,
                     now=dt.datetime(2026, 4, 20, tzinfo=UTC))
    r2 = collect_one(SPEC, FakeAdapter(records), bronze, silver,
                     now=dt.datetime(2026, 4, 21, tzinfo=UTC))

    assert r1.rows_written == 1
    assert r2.rows_written == 0, "an unchanged rerun must not grow silver"
    # Bronze still logs both fetches but stores one blob.
    hist = bronze.history("sow_inventory")
    assert len(hist) == 2
    assert [h["new_content"] for h in hist] == [True, False]


def test_as_of_ignores_the_future(tmp_path):
    """The guard against lookahead bias: data learned later is invisible."""
    bronze, silver = _stores(tmp_path)
    collect_one(SPEC, FakeAdapter([{"周期": "2026年3月", "能繁母猪存栏": 3920.0}]),
                bronze, silver, now=dt.datetime(2026, 4, 20, tzinfo=UTC))

    assert silver.as_of(
        dt.datetime(2026, 4, 1, tzinfo=UTC), indicator="sow_inventory"
    ) == {}


def test_series_preserves_per_row_granularity(tmp_path):
    """A wall panel has to be able to draw an annual point differently from a
    monthly one; silver must therefore carry granularity per row, not per
    indicator."""
    bronze, silver = _stores(tmp_path)
    collect_one(
        SPEC,
        FakeAdapter([
            {"周期": "2024", "能繁母猪存栏": 4078.0},
            {"周期": "2025年一季度（末）", "能繁母猪存栏": 4039.0},
            {"周期": "2025年7月", "能繁母猪存栏": 4042.0},
        ]),
        bronze, silver, now=dt.datetime(2026, 4, 20, tzinfo=UTC),
    )
    rows = silver.series("sow_inventory")
    assert [r["granularity"] for r in rows] == ["annual", "quarterly", "monthly"]
    assert [r["obs_date"] for r in rows] == [
        dt.date(2024, 12, 31), dt.date(2025, 3, 31), dt.date(2025, 7, 31)
    ]


def test_two_indicators_sharing_a_date_do_not_collide(tmp_path):
    """as_of() keys by obs_date, so it must be scoped to one indicator or two
    series landing on the same date would silently overwrite each other."""
    _, silver = _stores(tmp_path)
    at = dt.datetime(2026, 1, 2, tzinfo=UTC)
    day = dt.date(2026, 1, 1)
    for name, value in (("a", 10.0), ("b", 99.0)):
        silver.append_changes([
            Observation(name, day, value, "u", "daily", "src", "snap", at)
        ])
    later = dt.datetime(2026, 3, 1, tzinfo=UTC)
    assert silver.as_of(later, indicator="a") == {day: 10.0}
    assert silver.as_of(later, indicator="b") == {day: 99.0}


def test_unit_drift_aborts_the_batch():
    """元/公斤 quietly becoming 元/500克 is the failure this catches."""
    obs = [
        Observation("hog_price_wai3", dt.date(2026, 9, 4), 5.47, "CNY/kg",
                    "daily", "akshare:x", "abc", dt.datetime.now(UTC))
    ]
    with pytest.raises(ValidationError, match="outside"):
        validate(obs, unit="CNY/kg", lo=8.0, hi=60.0)


def test_parser_break_is_loud_not_silent(tmp_path):
    """If akshare renames its columns we must fail, never write zero rows quietly."""
    bronze, silver = _stores(tmp_path)

    class Renamed(FakeAdapter):
        def fetch(self, spec):
            return {"columns": ["dt", "px"], "records": [{"dt": "2026年3月", "px": 3920}]}

    result = collect_one(SPEC, Renamed([]), bronze, silver,
                         now=dt.datetime(2026, 4, 20, tzinfo=UTC))
    assert not result.ok
    assert "周期" in result.error
    assert not result.error.startswith("'"), "KeyError quoting must not leak"
    # ...and the payload is preserved so the fix is replayable offline.
    assert len(bronze.history("sow_inventory")) == 1
