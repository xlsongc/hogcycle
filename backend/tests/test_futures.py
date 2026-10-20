"""The live-hog futures curve: one observation per listed contract, at its
delivery month, from Sina's copy of the exchange's settles (docs/adr/0035).

`futures_lh_curve.json` is the bronze snapshot of 2026-10-20, cut to the
last three trading days of each of the six contracts then listed.
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import pandas as pd
import pytest

from hogcycle.collectors.futures import FuturesCurveAdapter, contracts_from
from hogcycle.pipeline import collect_one
from hogcycle.registry.loader import load_registry
from hogcycle.storage.bronze import BronzeStore
from hogcycle.storage.silver import SilverStore

FIXTURES = Path(__file__).parent / "fixtures"
CONFIG = Path(__file__).resolve().parents[2] / "config" / "sources.yaml"
NOW = dt.datetime(2026, 10, 20, 12, tzinfo=dt.UTC)
D = dt.date


@pytest.fixture(scope="module")
def spec():
    return load_registry(CONFIG)["lh_futures_curve"]


@pytest.fixture(scope="module")
def payload():
    return json.loads((FIXTURES / "futures_lh_curve.json").read_text("utf-8"))


def test_each_contract_is_its_delivery_month_at_its_latest_settle(spec, payload):
    obs = FuturesCurveAdapter().normalise(spec, payload, snapshot_id="f", fetched_at=NOW)
    assert [(o.obs_date, o.value, o.published_on) for o in obs] == [
        (D(2026, 11, 30), 9750.0, D(2026, 10, 20)),
        (D(2027, 1, 31), 10110.0, D(2026, 10, 20)),
        (D(2027, 3, 31), 10010.0, D(2026, 10, 20)),
        (D(2027, 5, 31), 11155.0, D(2026, 10, 20)),
        (D(2027, 7, 31), 12120.0, D(2026, 10, 20)),
        (D(2027, 9, 30), 12965.0, D(2026, 10, 20)),
    ]
    assert {o.granularity for o in obs} == {"monthly"}


def test_the_odd_months_from_this_one_are_asked_for():
    odd = [1, 3, 5, 7, 9, 11]
    codes = [c for c, _, _ in contracts_from(D(2026, 10, 20), "LH", odd, 14)]
    assert codes == ["LH2611", "LH2701", "LH2703", "LH2705", "LH2707", "LH2709", "LH2711"]


def test_the_shape_is_the_columns_not_the_contracts_that_roll(payload):
    assert FuturesCurveAdapter().shape(payload) == frozenset(
        {"date", "open", "high", "low", "close", "volume", "hold", "settle"}
    )


def table(code: str) -> pd.DataFrame:
    return pd.DataFrame(
        [{"date": "2026-10-20", "open": 1.0, "high": 1.0, "low": 1.0,
          "close": 1.0, "volume": 1, "hold": 1, "settle": 10000.0}]
    )


def test_a_month_sina_has_nothing_for_is_not_listed(spec, monkeypatch):
    import akshare as ak

    def answer(symbol):
        if symbol in ("LH2611", "LH2701"):
            return table(symbol)
        raise ValueError("Length mismatch: Expected axis has 0 elements")

    monkeypatch.setattr(ak, "futures_zh_daily_sina", answer)
    monkeypatch.setattr("hogcycle.collectors.futures._throttle", lambda: None)
    got = FuturesCurveAdapter(today=lambda: D(2026, 10, 20)).fetch(spec)
    assert sorted(got["contracts"]) == ["LH2611", "LH2701"]


def test_no_contract_at_all_fails_rather_than_an_empty_curve(spec, monkeypatch):
    import akshare as ak

    def nothing(symbol):
        raise ValueError("Length mismatch: Expected axis has 0 elements")

    monkeypatch.setattr(ak, "futures_zh_daily_sina", nothing)
    monkeypatch.setattr("hogcycle.collectors.futures._throttle", lambda: None)
    with pytest.raises(ValueError, match="no LH contract listed"):
        FuturesCurveAdapter(today=lambda: D(2026, 10, 20)).fetch(spec)


def test_another_error_is_not_mistaken_for_an_unlisted_month(spec, monkeypatch):
    import akshare as ak

    def broken(symbol):
        raise ValueError("could not convert string to float: 'abc'")

    monkeypatch.setattr(ak, "futures_zh_daily_sina", broken)
    monkeypatch.setattr("hogcycle.collectors.futures._throttle", lambda: None)
    with pytest.raises(ValueError, match="could not convert"):
        FuturesCurveAdapter(today=lambda: D(2026, 10, 20)).fetch(spec)


class Serves(FuturesCurveAdapter):
    def __init__(self, payload):
        super().__init__()
        self.payload = payload

    def fetch(self, spec):
        return self.payload


def test_a_forecast_of_coming_months_passes_validation_into_silver(spec, payload, tmp_path):
    bronze, silver = BronzeStore(tmp_path / "b"), SilverStore(tmp_path / "s")
    result = collect_one(spec, Serves(payload), bronze, silver, now=NOW)
    assert result.ok and result.rows_written == 6
    rows = silver.series("lh_futures_curve", moment=NOW)
    assert rows[-1]["obs_date"] == D(2027, 9, 30) and rows[-1]["value"] == 12965.0
