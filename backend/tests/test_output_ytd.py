"""统计局's year-to-date totals, and the quarters gold takes out of them
(docs/adr/0030).

`moa_hog_release_ytd.json` holds four real editions from bronze, one of each
shape the totals arrive in:

    202309  2023年前三季度生猪出栏   53723   (「前三季度」, spelled out)
    202312  2023年生猪出栏           72662   (the bare year: the whole of it)
    202403  2024年1季度生猪出栏      19455
    202406  2024年上半年生猪出栏     36395
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import pytest

from hogcycle.collectors.moa import MoaAdapter
from hogcycle.gold.series import all_specs, rows_of
from hogcycle.gold.wall import build_wall
from hogcycle.registry.loader import load_registry
from hogcycle.storage.silver import SilverStore

FIXTURES = Path(__file__).parent / "fixtures"
CONFIG = Path(__file__).resolve().parents[2] / "config" / "sources.yaml"
NOW = dt.datetime(2026, 10, 19, tzinfo=dt.UTC)
D = dt.date


@pytest.fixture(scope="module")
def registry():
    return load_registry(CONFIG)


@pytest.fixture(scope="module")
def payload():
    return json.loads((FIXTURES / "moa_hog_release_ytd.json").read_text("utf-8"))


def read(registry, payload, indicator):
    spec = registry[indicator]
    return MoaAdapter().normalise(spec, payload, snapshot_id="f", fetched_at=NOW)


def test_every_shape_of_total_resolves_to_the_end_of_its_stretch(registry, payload):
    obs = read(registry, payload, "hog_output_ytd")
    assert [(o.obs_date, o.value, o.published_on) for o in obs] == [
        (D(2023, 9, 30), 53723.0, D(2023, 10, 26)),
        (D(2023, 12, 31), 72662.0, D(2024, 1, 26)),
        (D(2024, 3, 31), 19455.0, D(2024, 4, 24)),
        (D(2024, 6, 30), 36395.0, D(2024, 7, 25)),
    ]
    assert {o.granularity for o in obs} == {"quarterly"}


def test_pork_output_reads_its_own_row_of_the_same_table(registry, payload):
    obs = read(registry, payload, "pork_output_ytd")
    assert [o.value for o in obs] == [4301.0, 5794.0, 1583.0, 2981.0]


def test_a_quarter_end_stock_is_not_read_as_a_total(registry, payload):
    """「2024年1季度末生猪存栏」 starts like a 1季度 total; the name after it is
    「末生猪存栏」, which is nobody's."""
    obs = read(registry, payload, "hog_inventory")
    assert all(o.value > 30000 for o in obs)


def test_a_running_total_is_never_read_without_the_flag(registry, payload):
    """Without `ytd` the parser takes only period tokens it knows, and a
    「1季度」 total would be a quarter's reading by accident. The registry is
    what keeps that from happening: 生猪出栏 is configured as ytd."""
    assert registry["hog_output_ytd"].ytd and registry["pork_output_ytd"].ytd


def test_ytd_is_refused_on_an_adapter_that_cannot_read_it(tmp_path):
    bad = tmp_path / "sources.yaml"
    bad.write_text(
        "indicators:\n"
        "  - {id: x, name_zh: x, name_en: x, tier: capacity, freq: quarterly,\n"
        "     unit: u, lo: 1, hi: 2, adapter: akshare, call: {fn: f}, ytd: true}\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="ytd is read only by the moa adapter"):
        load_registry(bad)


@pytest.fixture
def silver(registry, payload, tmp_path):
    store = SilverStore(tmp_path / "silver")
    for ind in ("hog_output_ytd", "pork_output_ytd"):
        store.append_changes(read(registry, payload, ind))
    return store


def quarters(registry, silver):
    spec = next(s for s in all_specs(registry) if s.id == "hog_output_quarter")
    return rows_of(spec, silver, moment=NOW)


def test_a_quarter_is_the_difference_of_two_printed_totals(registry, silver):
    rows = quarters(registry, silver)
    assert [(r["obs_date"], r["value"], r["published_on"]) for r in rows] == [
        # Q4 2023 = whole year less the first three quarters.
        (D(2023, 12, 31), 72662.0 - 53723.0, D(2024, 1, 26)),
        # Q1 is the print itself.
        (D(2024, 3, 31), 19455.0, D(2024, 4, 24)),
        # Q2 = half year less Q1, knowable when the later total was out.
        (D(2024, 6, 30), 36395.0 - 19455.0, D(2024, 7, 25)),
    ]


def test_a_quarter_missing_one_of_its_totals_is_left_out(registry, silver):
    """The fixture has no 2023 上半年 print, so 2023Q3 cannot be computed, and
    no other print is asked to stand in for it."""
    assert D(2023, 9, 30) not in {r["obs_date"] for r in quarters(registry, silver)}


def test_the_running_total_stays_off_the_wall_and_its_quarters_go_on(registry, silver):
    wall = build_wall(registry, silver, moment=NOW)
    on = {p["id"]: p["in_wall"] for p in wall["panels"]}
    assert on["hog_output_ytd"] is False and on["pork_output_ytd"] is False
    assert on["hog_output_quarter"] is True and on["pork_output_quarter"] is True
