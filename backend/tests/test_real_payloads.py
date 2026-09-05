"""Parse the shapes upstream actually returns.

Every test in the inherited suite fed `FakeAdapter` a synthetic
`{"date": ..., "value": ...}` frame, so all five passed while the two most
important indicators could not be collected at all: 能繁母猪存栏 arrives as a
wide table with Chinese period labels, and 玉米 is priced in 元/吨 against a
config that declared 元/公斤.

These fixtures are real payloads captured from bronze. They are the regression
net for that class of failure — a schema change upstream breaks a test here
before it breaks a collection run.
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import pytest

from hogcycle.collectors.akshare import AkshareAdapter
from hogcycle.contracts.validation import ValidationError, validate
from hogcycle.registry.loader import load_registry

FIXTURES = Path(__file__).parent / "fixtures"
CONFIG = Path(__file__).resolve().parents[2] / "config" / "sources.yaml"
UTC = dt.UTC
NOW = dt.datetime(2026, 9, 6, tzinfo=UTC)


@pytest.fixture(scope="module")
def registry():
    return load_registry(CONFIG)


# Indicators that share one upstream call share its fixture — the same way
# they share a single fetch at runtime.
FIXTURE_ALIAS = {"hog_weight": "hog_price_index"}


def payload(name: str) -> dict:
    name = FIXTURE_ALIAS.get(name, name)
    return json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))


def normalise(registry, indicator: str):
    spec = registry[indicator]
    obs = AkshareAdapter().normalise(
        spec, payload(indicator), snapshot_id="fixture", fetched_at=NOW
    )
    return spec, obs


# --------------------------------------------------------------------------
# 能繁母猪存栏 — the series the whole project exists for
# --------------------------------------------------------------------------

def test_sow_inventory_parses_from_a_wide_table(registry):
    """The failure that motivated this rewrite: 5 columns, none named `value`."""
    _spec, obs = normalise(registry, "sow_inventory")
    assert len(obs) == 22
    assert {o.unit for o in obs} == {"万头"}


def test_sow_inventory_keeps_three_granularities_apart(registry):
    """Annual, quarter-end and month-end readings share one column upstream.
    Flattening them would claim they are the same kind of measurement."""
    _, obs = normalise(registry, "sow_inventory")
    by_gran = {}
    for o in obs:
        by_gran.setdefault(o.granularity, []).append(o)

    assert set(by_gran) == {"annual", "quarterly", "monthly"}
    # 2009-2024 are annual figures, stamped at year end.
    assert by_gran["annual"][0].obs_date == dt.date(2009, 12, 31)
    # For this series granularity also encodes caliber: quarter-end rows come
    # from 国家统计局, month rows are 农业农村部 定点监测 extrapolations.
    assert dt.date(2025, 9, 30) in {o.obs_date for o in by_gran["quarterly"]}
    assert dt.date(2025, 10, 31) in {o.obs_date for o in by_gran["monthly"]}


def test_sow_inventory_values_survive_the_round_trip(registry):
    _, obs = normalise(registry, "sow_inventory")
    known = {o.obs_date: o.value for o in obs}
    # The African swine fever collapse — capacity leading price by ~a year.
    assert known[dt.date(2017, 12, 31)] == 4226.0
    assert known[dt.date(2018, 12, 31)] == 3189.0
    assert known[dt.date(2019, 12, 31)] == 3080.0
    assert known[dt.date(2025, 10, 31)] == 3990.0


def test_sow_inventory_passes_validation(registry):
    spec, obs = normalise(registry, "sow_inventory")
    assert validate(obs, unit=spec.unit, lo=spec.lo, hi=spec.hi, accept=spec.accept)


# --------------------------------------------------------------------------
# 玉米 — the unit bug
# --------------------------------------------------------------------------

def test_corn_is_priced_per_tonne_not_per_kg(registry):
    """akshare returns ~2374 元/吨. The old config declared CNY/kg with range
    [0.5, 10.0], so every run was rejected by its own outlier tripwire."""
    spec, obs = normalise(registry, "corn_price")
    assert spec.unit == "CNY/tonne"
    assert all(500 <= o.value <= 5000 for o in obs)
    assert validate(obs, unit=spec.unit, lo=spec.lo, hi=spec.hi)


def test_corn_under_the_old_kg_bounds_would_still_abort(registry):
    """Guards the tripwire itself: the range check must still catch a genuine
    unit change rather than having been widened into uselessness."""
    _, obs = normalise(registry, "corn_price")
    with pytest.raises(ValidationError, match="outside"):
        validate(obs, unit="CNY/tonne", lo=0.5, hi=10.0)


# --------------------------------------------------------------------------
# 白条肉 — 第N周 period labels
# --------------------------------------------------------------------------

def test_carcass_price_parses_chinese_week_labels(registry):
    spec, obs = normalise(registry, "carcass_price")
    assert {o.granularity for o in obs} == {"weekly"}
    assert obs[0].obs_date == dt.date(2018, 1, 7)  # 2018年第01周 -> ISO week end
    assert validate(obs, unit=spec.unit, lo=spec.lo, hi=spec.hi)


# --------------------------------------------------------------------------
# 行情宝 — one call, two indicators, and genuinely duplicated rows
# --------------------------------------------------------------------------

def test_two_indicators_share_one_upstream_call(registry):
    """成交均价 and 成交均重 come from the same wide frame, so the pipeline
    must be able to fetch it once and extract twice."""
    assert registry["hog_price_index"].call_key == registry["hog_weight"].call_key
    assert registry["hog_price_index"].extract.value == "成交均价"
    assert registry["hog_weight"].extract.value == "成交均重"


def test_identical_duplicate_rows_are_collapsed_not_fatal(registry):
    """行情宝 emits 2017-09-18 twice with identical values. Rejecting the batch
    over that would take an 11-year series offline for upstream noise."""
    spec, obs = normalise(registry, "hog_price_index")
    dupes = [o for o in obs if o.obs_date == dt.date(2017, 9, 18)]
    assert len(dupes) == 2, "fixture must retain the duplicated pair"

    kept = validate(obs, unit=spec.unit, lo=spec.lo, hi=spec.hi)
    assert len(kept) == len(obs) - 1
    assert sum(1 for o in kept if o.obs_date == dt.date(2017, 9, 18)) == 1


def test_conflicting_duplicate_still_aborts(registry):
    """The dangerous case: same date, different value. That means the period
    parser or upstream shape changed, and picking one silently is not an option."""
    spec, obs = normalise(registry, "hog_price_index")
    tampered = list(obs)
    i = next(i for i, o in enumerate(obs) if o.obs_date == dt.date(2017, 9, 18))
    from dataclasses import replace

    tampered[i] = replace(obs[i], value=obs[i].value + 1.0)
    with pytest.raises(ValidationError, match="conflicting"):
        validate(tampered, unit=spec.unit, lo=spec.lo, hi=spec.hi)


def test_zero_weight_is_missing_data_not_a_reading(registry):
    """成交均重 used 0 for "not measured" before Oct 2015. A 0 kg carcass is
    not an observation, and letting it through would drag every average down."""
    spec, obs = normalise(registry, "hog_weight")
    assert spec.zero_is_null
    assert any(o.value is None for o in obs), "fixture must include a zero row"
    assert all(o.value is None or o.value > 0 for o in obs)


def test_wrong_column_name_fails_loudly_naming_what_it_saw(registry):
    """A silent zero-row collection is the failure mode this project cannot
    afford; the error has to say which columns were actually present."""
    spec = registry["sow_inventory"]
    broken = {"columns": ["dt", "px"], "records": [{"dt": "2026-01", "px": 1}]}
    with pytest.raises(KeyError) as exc:
        AkshareAdapter().normalise(
            spec, broken, snapshot_id="x", fetched_at=NOW
        )
    assert "周期" in str(exc.value) and "dt" in str(exc.value)
