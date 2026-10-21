"""The live-hog futures curve: every settle of every contract, at its
delivery month, from Sina's copy of the exchange's settles (docs/adr/0035).

`futures_lh_curve.json` is the bronze snapshot of 2026-10-20, cut to the
last three trading days of each of the six contracts then listed. Every
trading day is a print of its contract's delivery month.
"""

from __future__ import annotations

import dataclasses
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


LATEST = [
    (D(2026, 11, 30), 9750.0, D(2026, 10, 20)),
    (D(2027, 1, 31), 10110.0, D(2026, 10, 20)),
    (D(2027, 3, 31), 10010.0, D(2026, 10, 20)),
    (D(2027, 5, 31), 11155.0, D(2026, 10, 20)),
    (D(2027, 7, 31), 12120.0, D(2026, 10, 20)),
    (D(2027, 9, 30), 12965.0, D(2026, 10, 20)),
]


def test_every_settle_is_a_print_of_its_delivery_month(spec, payload):
    obs = FuturesCurveAdapter().normalise(spec, payload, snapshot_id="f", fetched_at=NOW)
    assert len(obs) == 18, "three trading days of six contracts"
    lh2611 = [(o.published_on, o.value) for o in obs if o.obs_date == D(2026, 11, 30)]
    assert lh2611 == [
        (D(2026, 10, 16), 10085.0),
        (D(2026, 10, 19), 10000.0),
        (D(2026, 10, 20), 9750.0),
    ]
    latest = {o.obs_date: o for o in obs if o.published_on == D(2026, 10, 20)}
    assert [(d, o.value, o.published_on) for d, o in sorted(latest.items())] == LATEST
    assert {o.granularity for o in obs} == {"monthly"}


def test_a_day_sina_wrote_zero_for_is_not_a_print(spec, payload):
    blank = json.loads(json.dumps(payload))
    blank["contracts"]["LH2611"]["records"][1]["settle"] = 0.0
    blanks = dataclasses.replace(spec, zero_is_null=True)
    obs = FuturesCurveAdapter().normalise(blanks, blank, snapshot_id="f", fetched_at=NOW)
    days = [o.published_on for o in obs if o.obs_date == D(2026, 11, 30)]
    assert days == [D(2026, 10, 16), D(2026, 10, 20)]


def test_the_odd_months_from_this_one_are_asked_for():
    odd = [1, 3, 5, 7, 9, 11]
    codes = [c for c, _, _ in contracts_from(D(2026, 10, 20), "LH", odd, 14)]
    assert codes == ["LH2611", "LH2701", "LH2703", "LH2705", "LH2707", "LH2709", "LH2711"]


def test_a_backfill_asks_for_expired_contracts_too(spec, monkeypatch):
    import akshare as ak

    asked = []

    def answer(symbol):
        asked.append(symbol)
        return table(symbol)

    monkeypatch.setattr(ak, "futures_zh_daily_sina", answer)
    monkeypatch.setattr("hogcycle.collectors.futures._throttle", lambda: None)
    FuturesCurveAdapter(today=lambda: D(2026, 10, 20), back=5).fetch(spec)
    assert asked[:4] == ["LH2605", "LH2607", "LH2609", "LH2611"]
    assert asked[-1] == "LH2711"


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
    assert result.ok and result.rows_written == 18
    rows = silver.series("lh_futures_curve", moment=NOW)
    assert [(r["obs_date"], r["value"], r["published_on"]) for r in rows] == LATEST


def test_history_learned_after_the_latest_settle_leaves_it_current(spec, payload, tmp_path):
    """The curve was first collected with only its latest day; the backfill
    of every earlier settle comes later. Today's settle stays the value, and
    each past day is still there for `published()`."""
    bronze, silver = BronzeStore(tmp_path / "b"), SilverStore(tmp_path / "s")
    today_only = json.loads(json.dumps(payload))
    for t in today_only["contracts"].values():
        t["records"] = t["records"][-1:]
    collect_one(spec, Serves(today_only), bronze, silver, now=NOW)
    later = NOW + dt.timedelta(hours=6)
    result = collect_one(spec, Serves(payload), bronze, silver, now=later)
    assert result.ok and result.rows_written == 12
    rows = silver.series("lh_futures_curve", moment=later)
    assert [(r["obs_date"], r["value"], r["published_on"]) for r in rows] == LATEST
    on_16th = silver.published("lh_futures_curve", by=D(2026, 10, 16), moment=later)
    assert on_16th[0]["value"] == 10085.0
