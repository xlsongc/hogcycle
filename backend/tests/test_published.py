"""Release dates: when a number became public, as opposed to when we read it.

A 农业农村部 monthly print appears three to nine weeks after its period
ends. A backtest that treats obs_date as the day a value was known therefore
looks ahead by that much, which for a leading indicator is a meaningful slice
of the lead itself. These tests pin down that the release date is read from
the real payload, survives into silver without rewriting a single old file,
and is what `published()` answers with.
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
import pytest

from hogcycle.collectors.moa import BASE, MAX_RELEASE_LAG_DAYS, MoaAdapter, released
from hogcycle.contracts.schema import Observation
from hogcycle.contracts.validation import ValidationError, validate
from hogcycle.registry.loader import load_registry
from hogcycle.storage.silver import SilverStore

FIXTURES = Path(__file__).parent / "fixtures"
CONFIG = Path(__file__).resolve().parents[2] / "config" / "sources.yaml"
UTC = dt.UTC
D = dt.date


@pytest.fixture(scope="module")
def spec():
    return load_registry(CONFIG)["sow_inventory"]


@pytest.fixture(scope="module")
def payload():
    return json.loads((FIXTURES / "moa_hog_release.json").read_text(encoding="utf-8"))


def edition(ym: str, stamp: str, label: str, value: str) -> dict:
    return {
        "ym": ym,
        "xlsx": f"{BASE}/{ym[:4]}/{ym}/P0{stamp}512345678901.xlsx",
        "rows": [["生产", "1", label, value, "-0.01", "-0.02"]],
    }


def normalise(spec, editions, fetched_at=dt.datetime(2026, 9, 6, tzinfo=UTC)):
    return MoaAdapter().normalise(
        spec, {"editions": editions, "skipped": []}, snapshot_id="t", fetched_at=fetched_at
    )


# --------------------------------------------------------------------------
# Reading the release date
# --------------------------------------------------------------------------

def test_each_print_carries_its_editions_release_day(spec, payload):
    """From the captured payload. 202607's workbook is P020260827…, and the
    2026年7月 release is known to have appeared on 2026-08-27."""
    released_on = {e["ym"]: released(e) for e in payload["editions"]}
    assert released_on == {
        "202502": D(2025, 3, 28),
        "202512": D(2026, 1, 28),
        "202606": D(2026, 7, 23),
        "202607": D(2026, 8, 27),
    }
    obs = MoaAdapter().normalise(
        spec, payload, snapshot_id="f", fetched_at=dt.datetime(2026, 9, 6, tzinfo=UTC)
    )
    by_date = {o.obs_date: o.published_on for o in obs}
    assert by_date[D(2025, 2, 28)] == D(2025, 3, 28)  # 2025年2月末, 28 days
    assert by_date[D(2025, 12, 31)] == D(2026, 1, 28)
    assert by_date[D(2026, 6, 30)] == D(2026, 7, 23)


def test_an_edition_without_the_stamp_fails_and_names_the_file(spec):
    bad = edition("202607", "20260827", "2026年7月末能繁母猪存栏（万头）", "3800")
    bad["xlsx"] = f"{BASE}/2026/202607/hog-release.xlsx"
    with pytest.raises(ValueError, match=r"hog-release\.xlsx"):
        normalise(spec, [bad])


def test_a_release_implausibly_late_for_its_period_fails(spec):
    """A 2026 stamp on a 2025年3月 print means the stamp or the period was
    misread; either would put the value in the wrong place in a backtest."""
    late = edition("202603", "20260320", "2025年3月末能繁母猪存栏（万头）", "4000")
    with pytest.raises(ValueError, match=str(MAX_RELEASE_LAG_DAYS)):
        normalise(spec, [late])


def test_a_value_cannot_be_published_before_its_period_ends():
    early = Observation("x", D(2026, 3, 31), 1.0, "u", "monthly", "s", "t",
                        dt.datetime(2026, 4, 2, tzinfo=UTC), published_on=D(2026, 3, 30))
    with pytest.raises(ValidationError, match="before the period"):
        validate([early], unit="u", lo=0, hi=10)
    # ...unless the indicator is a forecast, which is published before by definition.
    assert validate([early], unit="u", lo=0, hi=10, forecast=True) == [early]


# --------------------------------------------------------------------------
# Restatements and reprints
# --------------------------------------------------------------------------

def test_a_restatement_is_a_second_row_and_the_first_print_survives(spec):
    label = "2026年3月末能繁母猪存栏（万头）"
    obs = normalise(spec, [
        # Deliberately out of order: releases are read by date, not list order.
        edition("202605", "20260522", label, "3904"),
        edition("202603", "20260424", label, "3920"),
    ])
    assert [(o.published_on, o.value) for o in obs] == [
        (D(2026, 4, 24), 3920.0),
        (D(2026, 5, 22), 3904.0),
    ]
    assert validate(obs, unit=spec.unit, lo=spec.lo, hi=spec.hi) == obs


def test_a_reprint_of_the_same_value_keeps_the_earliest_release(spec):
    label = "2026年3月末能繁母猪存栏（万头）"
    obs = normalise(spec, [
        edition("202603", "20260424", label, "3920"),
        edition("202604", "20260522", label, "3920"),
    ])
    assert [(o.published_on, o.value) for o in obs] == [(D(2026, 4, 24), 3920.0)]


def test_one_release_printing_two_values_for_a_period_is_still_a_conflict():
    at = dt.datetime(2026, 9, 6, tzinfo=UTC)
    a = Observation("x", D(2026, 3, 31), 1.0, "u", "monthly", "s", "t", at, D(2026, 4, 24))
    b = Observation("x", D(2026, 3, 31), 2.0, "u", "monthly", "s", "t", at, D(2026, 4, 24))
    with pytest.raises(ValidationError, match="released 2026-04-24"):
        validate([a, b], unit="u", lo=0, hi=10)


# --------------------------------------------------------------------------
# Silver: appending dates without rewriting history
# --------------------------------------------------------------------------

MARCH = D(2026, 3, 31)


def row(value, *, fetched, published=None, obs_date=MARCH):
    return Observation("sow_inventory", obs_date, value, "万头", "monthly", "s", "t",
                       fetched, published)


def test_learning_a_release_date_is_written_once(tmp_path):
    silver = SilverStore(tmp_path)
    # Fetch times stay in the past: series() defaults to "as of now".
    jun, jul, aug = (dt.datetime(2026, m, 6, tzinfo=UTC) for m in (6, 7, 8))

    def put(fetched, published=None):
        new = row(3920.0, fetched=fetched, published=published)
        return len(silver.append_changes([new]))

    assert put(jun) == 1
    assert put(jul, D(2026, 4, 24)) == 1, "same value, newly dated: new knowledge"
    assert put(aug, D(2026, 4, 24)) == 0, "the same edition read again"
    assert put(aug, D(2026, 5, 22)) == 0, "a later reprint; the first release made it known"
    assert put(aug, D(2026, 4, 20)) == 1, "an earlier release moves when it became public"

    # As we knew it in June, the date was unknown; it is not back-filled.
    assert silver.series("sow_inventory", moment=jun)[0]["published_on"] is None
    assert silver.series("sow_inventory")[0]["published_on"] == D(2026, 4, 20)
    assert silver.revisions("sow_inventory") == [], "a date is not a restatement"


def test_published_answers_with_what_was_public_on_the_day(tmp_path):
    """Loaded long after the fact, yet each day sees only the releases out by then."""
    silver = SilverStore(tmp_path)
    backfill = dt.datetime(2026, 9, 6, tzinfo=UTC)
    silver.append_changes([
        row(3920.0, fetched=backfill, published=D(2026, 4, 24)),
        row(3904.0, fetched=backfill, published=D(2026, 5, 22)),
        row(3880.0, fetched=backfill, published=D(2026, 5, 22), obs_date=D(2026, 4, 30)),
    ])

    def known(by):
        return {r["obs_date"]: r["value"] for r in silver.published("sow_inventory", by=by)}

    assert known(D(2026, 4, 23)) == {}
    assert known(D(2026, 4, 24)) == {D(2026, 3, 31): 3920.0}
    assert known(D(2026, 6, 1)) == {D(2026, 3, 31): 3904.0, D(2026, 4, 30): 3880.0}
    # Transaction time still applies on top: before the backfill we held nothing.
    assert silver.published("sow_inventory", by=D(2026, 6, 1),
                            moment=dt.datetime(2026, 9, 1, tzinfo=UTC)) == []
    # Two releases learned in one fetch: the later one is today's value.
    assert silver.as_of(backfill, indicator="sow_inventory")[D(2026, 3, 31)] == 3904.0
    assert [v for *_, v in silver.revisions("sow_inventory")] == [3920.0, 3904.0]


def test_files_written_before_the_column_existed_still_read(tmp_path):
    """Parquet files are never rewritten, so an old file lacks published_on
    for good. It reads as NULL, both alone and next to newer files."""
    current = pq.read_schema(_write_one(tmp_path / "probe"))
    old_schema = pa.schema([f for f in current if f.name != "published_on"])
    part = tmp_path / "silver" / "indicator=sow_inventory" / "fetched_date=2026-09-06"
    part.mkdir(parents=True)
    old = row(3920.0, fetched=dt.datetime(2026, 9, 6, tzinfo=UTC)).as_row()
    del old["published_on"]
    table = pa.Table.from_pylist([old], schema=old_schema)
    pq.write_table(table, part / "part-000.parquet")

    silver = SilverStore(tmp_path / "silver")
    assert silver.series("sow_inventory")[0]["published_on"] is None
    assert silver.published("sow_inventory", by=D(2027, 1, 1)) == []

    at = dt.datetime(2026, 10, 1, tzinfo=UTC)
    dated = row(3920.0, fetched=at, published=D(2026, 4, 24))
    silver.append_changes([dated])
    assert silver.series("sow_inventory")[0]["published_on"] == D(2026, 4, 24)


def _write_one(root: Path) -> Path:
    at = dt.datetime(2026, 9, 6, tzinfo=UTC)
    SilverStore(root).append_changes([row(1.0, fetched=at)])
    return next(root.rglob("*.parquet"))


# --------------------------------------------------------------------------
# Gold: what the page is told
# --------------------------------------------------------------------------

def test_the_wall_says_when_each_value_became_public(tmp_path):
    from hogcycle.gold.wall import _point, release_lag

    dated = {"obs_date": D(2026, 6, 30), "value": 3780.0, "granularity": "quarterly",
             "published_on": D(2026, 7, 23)}
    undated = {"obs_date": D(2026, 6, 30), "value": 3780.0, "granularity": "quarterly",
               "published_on": None,
               "fetched_at": dt.datetime(2026, 9, 5, 22, 41, tzinfo=dt.UTC)}
    assert _point(dated)["p"] == "2026-07-23"
    assert "p" not in _point(undated), "unknown is absent, never assumed to equal d"
    # What it carries instead is when the warehouse learned it (ADR-0025).
    assert _point(undated)["_l"] == "2026-09-05"

    rows = [
        {"obs_date": D(2026, 1, 31), "published_on": D(2026, 3, 20)},  # 48 days
        {"obs_date": D(2026, 2, 28), "published_on": D(2026, 3, 20)},  # 20
        {"obs_date": D(2026, 3, 31), "published_on": D(2026, 4, 24)},  # 24
        {"obs_date": D(2026, 4, 30), "published_on": None},
    ]
    assert release_lag(rows) == {"median_days": 24, "max_days": 48, "n": 3}
    assert release_lag([undated]) is None


def test_a_mirror_copy_filed_under_another_day_is_not_drawn_twice():
    from hogcycle.gold.series import drop_misdated_copies

    def r(day, v, published=None, g="weekly"):
        return {"obs_date": day, "value": v, "granularity": g, "published_on": published}

    rows = [
        r(D(2026, 2, 12), 27.56, D(2026, 2, 26)),
        r(D(2026, 2, 19), 27.64),                    # mirror's date for 2月第3周
        r(D(2026, 2, 24), 27.64, D(2026, 3, 2)),     # the ministry's collection day
        r(D(2025, 6, 30), 4043.0, g="quarterly"),    # a real fill: no dated twin
    ]
    kept = [x["obs_date"] for x in drop_misdated_copies(rows)]
    assert kept == [D(2026, 2, 12), D(2026, 2, 24), D(2025, 6, 30)]
