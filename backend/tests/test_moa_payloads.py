"""The 农业农村部 joint release, parsed from a real captured payload.

The fixture holds four editions chosen because between them they contain
every shape the parser has to survive:

    202502  a monthly 能繁母猪存栏 print, and the 规模以上 slaughter caliber
    202512  a quarter-end print, worded 「相当于正常保有量的X%」
    202606  a quarter-end print, worded 「相当于调控目标的X%」, new caliber
    202607  an ordinary month, carrying no 存栏 row at all

This is the adapter that replaced a third-party mirror which went stale for
eleven months without failing once, so the tests below care less about happy
paths than about the two ways this source can lie: a cumulative row read as a
period value, and two calibers welded into one line.
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import pytest

from hogcycle.collectors.moa import MoaAdapter, months_ending
from hogcycle.contracts.validation import validate
from hogcycle.registry.loader import load_registry

FIXTURES = Path(__file__).parent / "fixtures"
CONFIG = Path(__file__).resolve().parents[2] / "config" / "sources.yaml"
NOW = dt.datetime(2026, 9, 6, tzinfo=dt.UTC)


@pytest.fixture(scope="module")
def registry():
    return load_registry(CONFIG)


@pytest.fixture(scope="module")
def payload():
    return json.loads(
        (FIXTURES / "moa_hog_release.json").read_text(encoding="utf-8")
    )


def normalise(registry, payload, indicator: str):
    spec = registry[indicator]
    return spec, MoaAdapter().normalise(
        spec, payload, snapshot_id="fixture", fetched_at=NOW
    )


# --------------------------------------------------------------------------
# 能繁母猪存栏 — the series the whole project exists for
# --------------------------------------------------------------------------

def test_sow_inventory_reads_both_period_wordings(registry, payload):
    """月末 and 季度末 labels, and the 正常保有量 / 调控目标 rewording between
    2025 and 2026, all resolve to the same three numbers."""
    spec, obs = normalise(registry, payload, "sow_inventory")
    known = {o.obs_date: o.value for o in obs}

    assert known[dt.date(2025, 2, 28)] == 4066.0  # 2025年2月末
    assert known[dt.date(2025, 12, 31)] == 3961.0  # 2025年4季度末
    assert known[dt.date(2026, 6, 30)] == 3780.0  # 2026年2季度末
    assert {o.unit for o in obs} == {"万头"}
    assert validate(obs, unit=spec.unit, lo=spec.lo, hi=spec.hi, accept=spec.accept)


def test_sow_inventory_granularity_encodes_caliber(registry, payload):
    """Quarter-end rows are 国家统计局 survey data; other months were
    农业农村部 extrapolations from a monthly 环比. Same column, different
    provenance — so granularity has to survive the parse."""
    _, obs = normalise(registry, payload, "sow_inventory")
    by_date = {o.obs_date: o.granularity for o in obs}

    assert by_date[dt.date(2025, 2, 28)] == "monthly"
    assert by_date[dt.date(2025, 12, 31)] == "quarterly"
    assert by_date[dt.date(2026, 6, 30)] == "quarterly"


def test_the_policy_parenthetical_is_not_part_of_the_measurement(registry, payload):
    """The cell reads 「3780（相当于调控目标的100.8%）」. The reading is 3780;
    the rest is 产能调控 commentary and belongs to policy, not to the number."""
    _, obs = normalise(registry, payload, "sow_inventory")
    value = next(o.value for o in obs if o.obs_date == dt.date(2026, 6, 30))
    assert value == 3780.0


def test_an_edition_without_the_row_contributes_nothing(registry, payload):
    """202607 carries no 存栏 row — the cadence went quarterly. A month that
    simply does not print the series must not become a null or a repeat."""
    _, obs = normalise(registry, payload, "sow_inventory")
    assert dt.date(2026, 7, 31) not in {o.obs_date for o in obs}
    assert all(o.value is not None for o in obs)


# --------------------------------------------------------------------------
# The two ways this source can lie
# --------------------------------------------------------------------------

def test_cumulative_rows_are_not_mistaken_for_period_values(registry, payload):
    """Every edition carries both 「2026年6月份…屠宰量」 and 「2026年1-6月…
    屠宰量」. The second is a year-to-date total; reading it as June would
    inflate the month roughly sixfold."""
    _, obs = normalise(registry, payload, "slaughter")
    june = next(o.value for o in obs if o.obs_date == dt.date(2026, 6, 30))
    assert june == 3819.66  # not 22724.92, the 1-6月 cumulative
    # 上半年 rows carry no period token at all and must be absent entirely.
    assert all(o.obs_date.day >= 28 for o in obs)


def test_the_two_slaughter_calibers_stay_apart(registry, payload):
    """2025年7月 widened the survey from 规模以上 to all 定点屠宰企业, and the
    level stepped up with it. `生猪定点屠宰企业屠宰量` is a substring of
    `规模以上生猪定点屠宰企业屠宰量`, so a substring match would silently weld
    the two into one series — the exact shape of error this project treats as
    unforgivable."""
    _, new_caliber = normalise(registry, payload, "slaughter")
    _, old_caliber = normalise(registry, payload, "slaughter_above_scale")

    assert dt.date(2025, 2, 28) not in {o.obs_date for o in new_caliber}
    assert {o.obs_date for o in old_caliber} == {dt.date(2025, 2, 28)}
    # The workbook carries 2177.12; the HTML table rounds it to 2177. Another
    # reason the .xlsx is the parse target and the page is not.
    assert next(iter(old_caliber)).value == 2177.12


def test_a_retired_caliber_is_absent_not_broken(registry, payload):
    """The old caliber stopped being published. Absence is expected, so it
    must not raise — a series that fails every single day teaches the reader
    to ignore failures, which is how the last silent freeze survived."""
    spec = registry["slaughter_above_scale"]
    assert spec.retired
    recent_only = {"editions": [payload["editions"][-1]], "skipped": []}
    assert MoaAdapter().normalise(
        spec, recent_only, snapshot_id="fixture", fetched_at=NOW
    ) == []


def test_a_live_series_that_vanishes_still_fails_loudly(registry, payload):
    """The other side of the same coin: for a series still being published,
    a missing 指标 means upstream renamed something and must abort."""
    spec = registry["sow_inventory"]
    assert not spec.retired
    empty = {"editions": [{"ym": "202607", "rows": [["x", "y"]]}], "skipped": []}
    with pytest.raises(KeyError, match="能繁母猪存栏"):
        MoaAdapter().normalise(spec, empty, snapshot_id="x", fetched_at=NOW)


def test_footnotes_naming_indicators_are_not_read_as_data(registry, payload):
    """Each edition ends with 指标说明 prose that names 「能繁母猪存栏」、
    「生猪存栏」… in one cell. Those rows carry no period token, which is what
    keeps them out."""
    _, obs = normalise(registry, payload, "hog_inventory")
    assert {o.obs_date for o in obs} == {dt.date(2025, 12, 31), dt.date(2026, 6, 30)}
    assert next(o.value for o in obs if o.obs_date == dt.date(2026, 6, 30)) == 42491.0


# --------------------------------------------------------------------------
# The fetch window
# --------------------------------------------------------------------------

def test_months_ending_walks_back_across_a_year_boundary():
    assert months_ending(dt.date(2026, 2, 15), 4) == [
        "202511",
        "202512",
        "202601",
        "202602",
    ]


def test_window_must_be_positive():
    with pytest.raises(ValueError, match="months_back"):
        MoaAdapter(months_back=0)
