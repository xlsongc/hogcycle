"""What could be known on a given day (docs/adr/0025).

The cases are the real ones: the 玄田 mirror's mistyped 2023-10-25 piglet
price beside the ministry's dated print, and the 2024-03-15 sow question the
README asks.
"""

from __future__ import annotations

import datetime as dt
from pathlib import Path

from hogcycle.contracts.schema import Observation
from hogcycle.gold.vintage import knowable_on, stamp_learned
from hogcycle.registry.loader import load_registry
from hogcycle.storage.silver import SilverStore

ROOT = Path(__file__).resolve().parents[2]
UTC = dt.UTC
D = dt.date
MIRROR = dt.datetime(2026, 9, 5, 22, 42, tzinfo=UTC)
PRIMARY = dt.datetime(2026, 10, 12, 9, 59, tzinfo=UTC)


def spec(id: str):
    return load_registry(ROOT / "config" / "sources.yaml")[id]


def obs(indicator, day, value, fetched, published=None, unit="CNY/kg", g="weekly"):
    return Observation(indicator, day, value, unit, g, "s", "t", fetched, published)


def piglet(tmp_path) -> SilverStore:
    silver = SilverStore(tmp_path)
    silver.append_changes([
        obs("piglet_price", D(2023, 10, 25), 25.36, MIRROR),
        obs("piglet_price", D(2023, 11, 1), 25.0, MIRROR),
    ])
    silver.append_changes(
        [obs("piglet_price", D(2023, 10, 25), 25.63, PRIMARY, D(2023, 10, 30))]
    )
    return silver


def on(silver, day):
    return {r["obs_date"]: (r["value"], r["basis"]) for r in knowable_on(
        spec("piglet_price"), silver, day)}


def test_a_dated_print_is_knowable_from_its_release_not_from_when_we_learned_it(tmp_path):
    silver = piglet(tmp_path)
    assert on(silver, D(2023, 10, 29)) == {}
    assert on(silver, D(2024, 1, 1)) == {D(2023, 10, 25): (25.63, "published")}


def test_the_publishers_record_outranks_a_mirrors_undated_copy(tmp_path):
    """Once the mirror's 25.36 has been learned too, the ministry's 25.63 is
    still the reading in force: release dates and learned dates are not
    compared with each other."""
    assert on(piglet(tmp_path), D(2026, 9, 10))[D(2023, 10, 25)] == (25.63, "published")


def test_an_undated_value_is_knowable_only_from_when_it_was_learned(tmp_path):
    silver = piglet(tmp_path)
    assert D(2023, 11, 1) not in on(silver, D(2026, 9, 4))
    assert on(silver, D(2026, 9, 6))[D(2023, 11, 1)] == (25.0, "learned")


def test_the_question_the_readme_asks(tmp_path):
    """On 2024-03-15, the latest knowable 能繁母猪存栏 was January's, released
    2024-02-26; February's was period-complete but not yet out."""
    silver = SilverStore(tmp_path)
    prints = [
        (D(2023, 12, 31), 4142.0, D(2024, 1, 26), "quarterly"),
        (D(2024, 1, 31), 4067.0, D(2024, 2, 26), "monthly"),
        (D(2024, 2, 29), 4042.0, D(2024, 3, 27), "monthly"),
    ]
    silver.append_changes([
        obs("sow_inventory", d, v, PRIMARY, p, unit="万头", g=g) for d, v, p, g in prints
    ])
    known = knowable_on(spec("sow_inventory"), silver, D(2024, 3, 15))
    latest = known[-1]
    assert (latest["obs_date"], latest["value"], latest["published_on"]) == (
        D(2024, 1, 31), 4067.0, D(2024, 2, 26))


def test_one_learned_day_per_panel_and_only_the_exceptions_on_points():
    points = [
        {"d": "2026-09-01", "_l": "2026-09-06"},
        {"d": "2026-09-02", "_l": "2026-09-06"},
        {"d": "2026-10-13", "_l": "2026-10-14"},
        {"d": "2026-10-14", "p": "2026-10-15"},
    ]
    assert stamp_learned(points) == "2026-09-06"
    assert points == [
        {"d": "2026-09-01"},
        {"d": "2026-09-02"},
        {"d": "2026-10-13", "l": "2026-10-14"},
        {"d": "2026-10-14", "p": "2026-10-15"},
    ]


def test_a_fully_dated_series_has_no_learned_default():
    assert stamp_learned([{"d": "2026-09-30", "p": "2026-10-08"}]) is None


def test_a_tie_goes_to_the_earlier_day_so_order_does_not_matter():
    a = [{"_l": "2026-10-02"}, {"_l": "2026-10-01"}]
    b = [{"_l": "2026-10-01"}, {"_l": "2026-10-02"}]
    assert stamp_learned(a) == stamp_learned(b) == "2026-10-01"
