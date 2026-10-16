"""Cadence breaks and caliber lineage (docs/adr/0026)."""

from __future__ import annotations

import datetime as dt
from pathlib import Path

import pytest

from hogcycle.gold.breaks import cadence_breaks, caliber_of
from hogcycle.registry.loader import load_registry

ROOT = Path(__file__).resolve().parents[2]
D = dt.date


def month_ends(start: D, n: int) -> list[D]:
    out, d = [], start
    for _ in range(n):
        out.append(d)
        nxt = D(d.year + (d.month == 12), d.month % 12 + 1, 28) + dt.timedelta(days=4)
        d = nxt - dt.timedelta(days=nxt.day)
    return out


def test_the_sow_series_changes_cadence_twice():
    """Annual to 2021, monthly to 2025-10, quarterly since: the real shape."""
    annual = [D(y, 12, 31) for y in range(2015, 2021)]
    monthly = month_ends(D(2021, 12, 31), 47)  # to 2025-10-31
    quarterly = [D(2025, 12, 31), D(2026, 3, 31), D(2026, 6, 30)]
    assert cadence_breaks(annual + monthly + quarterly) == [
        {"d": "2021-12-31", "from": "A", "to": "M", "settled": "2022-03-31"},
        {"d": "2025-10-31", "from": "M", "to": "Q", "settled": "2026-06-30"},
    ]


def test_a_few_missed_weeks_are_a_gap_not_a_new_cadence():
    weeks = [D(2026, 1, 5) + dt.timedelta(weeks=i) for i in range(20)]
    holed = weeks[:14] + weeks[16:]  # two weeks missing, then weekly again
    assert cadence_breaks(holed) == []


def test_an_irregular_stretch_settles_nothing():
    irregular = [D(2018, 11, 4), D(2018, 11, 7), D(2018, 12, 2), D(2018, 12, 9),
                 D(2019, 1, 20), D(2019, 1, 27)]
    assert cadence_breaks(irregular) == []


def test_lineage_points_both_ways_on_the_real_config():
    registry = load_registry(ROOT / "config" / "sources.yaml")
    assert caliber_of(registry["carcass_price"], registry) == {
        "from": "2024-01-01", "until": None,
        "earlier": "carcass_price_above_scale", "later": None,
    }
    assert caliber_of(registry["carcass_price_above_scale"], registry)["later"] == (
        "carcass_price"
    )
    assert caliber_of(registry["sow_inventory"], registry) is None


def test_a_lineage_to_nowhere_fails_at_load(tmp_path):
    src = (ROOT / "config" / "sources.yaml").read_text(encoding="utf-8")
    bad = src.replace(
        "continues: carcass_price_above_scale", "continues: carcass_price_old"
    )
    path = tmp_path / "sources.yaml"
    path.write_text(bad, encoding="utf-8")
    with pytest.raises(ValueError, match="continues 'carcass_price_old'"):
        load_registry(path)
