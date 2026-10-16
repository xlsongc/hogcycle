"""Quality checks: what fails, what warns (docs/adr/0029)."""

from __future__ import annotations

import datetime as dt

from hogcycle.contracts.schema import Observation
from hogcycle.quality import (
    ERROR,
    OK,
    WARN,
    piglet_months,
    ratio_weeks,
    sow_year_ends,
    unique_keys,
)
from hogcycle.storage.silver import SilverStore

D = dt.date


def test_a_duplicate_bitemporal_key_is_an_error(tmp_path):
    silver = SilverStore(tmp_path)
    at = dt.datetime(2026, 10, 16, 7, 30, tzinfo=dt.UTC)

    def one(value: float) -> list[Observation]:
        d = D(2026, 6, 30)
        return [Observation("sow", d, value, "万头", "quarterly", "t", "s", at)]

    silver.append_changes(one(3780.0))
    assert unique_keys(silver).level == OK
    # Two writes stamped with the same instant: the store can no longer say
    # which one it knew at that moment.
    silver.append_changes(one(3790.0))
    check = unique_keys(silver)
    assert check.level == ERROR and "sow 2026-06-30" in check.detail


def test_piglet_months_warn_only_on_the_latest_month():
    weekly = {D(2026, 7, 7): 22.0, D(2026, 7, 21): 23.0, D(2026, 8, 4): 21.9}
    assert piglet_months(weekly, {D(2026, 7, 31): 22.5, D(2026, 8, 31): 21.9}).level == OK
    drifted = piglet_months(weekly, {D(2026, 7, 31): 22.5, D(2026, 8, 31): 21.0})
    assert drifted.level == WARN and "latest 2026-08 +4.29%" in drifted.detail


def test_ratio_weeks_pair_each_county_week_with_the_ndrc_week_before_it():
    ndrc = {D(2026, 8, 13): 4.43, D(2026, 8, 20): 4.55}
    county = {D(2026, 8, 19): 4.20, D(2026, 8, 26): 4.29}
    assert ratio_weeks(ndrc, county).level == OK  # gaps 0.23 and 0.26
    assert ratio_weeks(ndrc, {D(2026, 8, 26): 3.70}).level == WARN  # 0.85
    assert ratio_weeks({}, county).detail == "no week in both"


def test_sow_year_ends_compare_in_one_unit_from_2023():
    nbs = {D(2022, 12, 31): 4390.0, D(2023, 12, 31): 4142.0, D(2024, 12, 31): 4078.0}
    usda = {D(2022, 12, 31): 43000.0, D(2023, 12, 31): 41420.0, D(2024, 12, 31): 40780.0}
    assert sow_year_ends(nbs, usda).level == OK  # 2022's 2% gap predates the check
    usda[D(2024, 12, 31)] = 41000.0
    assert sow_year_ends(nbs, usda).level == WARN
