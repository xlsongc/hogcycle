"""The test that justifies the whole storage design.

能繁母猪 gets restated after the fact. If silver overwrote, the March figure
you see today would be the revised one, and any claim that your signal "would
have caught the turn" would be unfalsifiable. These tests pin down that the
store can still hand back the number as it stood on a given day.
"""

from __future__ import annotations

import datetime as dt

import pytest

from hogcycle.bronze import BronzeStore
from hogcycle.collectors.akshare_adapter import AkshareAdapter
from hogcycle.pipeline import collect_one
from hogcycle.registry import IndicatorSpec
from hogcycle.schema import Observation, ValidationError, validate
from hogcycle.silver import SilverStore

UTC = dt.timezone.utc

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
    revises=True,
)


class FakeAdapter(AkshareAdapter):
    """Same normalise() as the real adapter; only fetch() is stubbed."""

    def __init__(self, records):
        self._records = records

    def fetch(self, spec):
        return {"columns": ["date", "value"], "records": self._records}


def _stores(tmp_path):
    return BronzeStore(tmp_path / "bronze"), SilverStore(tmp_path / "silver")


def test_revision_is_appended_not_overwritten(tmp_path):
    bronze, silver = _stores(tmp_path)

    day1 = dt.datetime(2026, 4, 20, tzinfo=UTC)
    first = FakeAdapter([{"date": "2026-03-31", "value": 3920.0}])
    r1 = collect_one(SPEC, first, bronze, silver, now=day1)
    assert r1.ok and r1.rows_written == 1

    # A month later the same obs_date comes back restated.
    day2 = dt.datetime(2026, 5, 20, tzinfo=UTC)
    second = FakeAdapter([{"date": "2026-03-31", "value": 3904.0}])
    r2 = collect_one(SPEC, second, bronze, silver, now=day2)
    assert r2.rows_written == 1

    march = dt.date(2026, 3, 31)
    # What we believed in April is still recoverable...
    assert silver.as_of(dt.datetime(2026, 4, 25, tzinfo=UTC))[march] == 3920.0
    # ...and today's answer is the revision.
    assert silver.as_of(dt.datetime(2026, 6, 1, tzinfo=UTC))[march] == 3904.0

    trail = silver.revisions("sow_inventory")
    assert [v for _, _, v in trail] == [3920.0, 3904.0]


def test_unchanged_reruns_write_nothing(tmp_path):
    bronze, silver = _stores(tmp_path)
    records = [{"date": "2026-03-31", "value": 3920.0}]

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
    collect_one(SPEC, FakeAdapter([{"date": "2026-03-31", "value": 3920.0}]),
                bronze, silver, now=dt.datetime(2026, 4, 20, tzinfo=UTC))

    assert silver.as_of(dt.datetime(2026, 4, 1, tzinfo=UTC)) == {}


def test_unit_drift_aborts_the_batch():
    """元/公斤 quietly becoming 元/500克 is the failure this catches."""
    obs = [
        Observation("hog_price_wai3", dt.date(2026, 9, 4), 5.47, "CNY/kg",
                    "akshare:x", "abc", dt.datetime.now(UTC))
    ]
    with pytest.raises(ValidationError, match="outside"):
        validate(obs, unit="CNY/kg", lo=8.0, hi=60.0)


def test_parser_break_is_loud_not_silent(tmp_path):
    """If akshare renames its columns we must fail, never write zero rows quietly."""
    bronze, silver = _stores(tmp_path)

    class Renamed(FakeAdapter):
        def fetch(self, spec):
            return {"columns": ["dt", "px"], "records": [{"dt": "2026-03-31", "px": 3920}]}

    result = collect_one(SPEC, Renamed([]), bronze, silver,
                         now=dt.datetime(2026, 4, 20, tzinfo=UTC))
    assert not result.ok
    assert "no date column" in result.error
    # ...and the payload is preserved so the fix is replayable offline.
    assert len(bronze.history("sow_inventory")) == 1
