"""USDA PSD, from a slice of the captured bulk file: China's sow stocks and
pork production, with USDA's forecasts for the years not yet ended.

Two things are tested hardest. A forecast is a different kind of row — it
may describe the future and be published before its period — and only an
indicator declared `forecast` may carry one. And a release day is set only
where the file says it: rows last set in an earlier month keep a NULL day
rather than an invented one.
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import pytest

from hogcycle.collectors.usda_psd import UsdaPsdAdapter
from hogcycle.contracts.validation import ValidationError, validate
from hogcycle.registry.loader import load_registry

FIXTURE = Path(__file__).parent / "fixtures" / "usda_psd.json"
CONFIG = Path(__file__).resolve().parents[2] / "config" / "sources.yaml"
NOW = dt.datetime(2026, 10, 12, tzinfo=dt.UTC)
D = dt.date


@pytest.fixture(scope="module")
def registry():
    return load_registry(CONFIG)


@pytest.fixture(scope="module")
def payload():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def read(registry, payload, indicator):
    spec = registry[indicator]
    return spec, UsdaPsdAdapter().normalise(spec, payload, snapshot_id="f", fetched_at=NOW)


def test_a_beginning_stock_is_the_year_end_before(registry, payload):
    """Sow Beginning Stocks of 2026 is the herd on 1 January 2026: the same
    instant as 统计局's 2025 year-end figure, which it equals."""
    _, obs = read(registry, payload, "usda_sow_stocks")
    by_date = {o.obs_date: o.value for o in obs}
    assert by_date[D(2025, 12, 31)] == 39610.0  # = 3,961 万头
    assert by_date[D(2026, 12, 31)] == 37300.0  # USDA's forecast for the end of 2026


def test_a_flow_ends_with_its_year(registry, payload):
    _, obs = read(registry, payload, "usda_pork_production")
    assert obs[-1].obs_date == D(2027, 12, 31)
    assert {o.granularity for o in obs} == {"annual"}


def test_only_rows_set_in_the_files_month_get_its_day(registry, payload):
    _, obs = read(registry, payload, "usda_sow_stocks")
    released = {o.obs_date: o.published_on for o in obs}
    assert released[D(2026, 12, 31)] == D(2026, 10, 9)
    assert released[D(2023, 12, 31)] is None, "set in an earlier month: day unknown"


def test_only_a_declared_forecast_may_describe_the_future(registry, payload):
    spec, obs = read(registry, payload, "usda_sow_stocks")
    assert validate(obs, unit=spec.unit, lo=spec.lo, hi=spec.hi, forecast=True)
    with pytest.raises(ValidationError, match="future"):
        validate(obs, unit=spec.unit, lo=spec.lo, hi=spec.hi)


def test_an_unknown_attribute_names_what_the_file_has(registry, payload):
    spec = registry["usda_sow_stocks"]
    renamed = {**payload, "rows": [
        {**r, "attribute": "Sows, Beginning"} for r in payload["rows"]
    ]}
    with pytest.raises(KeyError, match="Sows, Beginning"):
        UsdaPsdAdapter().normalise(spec, renamed, snapshot_id="f", fetched_at=NOW)
