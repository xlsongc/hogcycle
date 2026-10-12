"""What a per-series page is built from: the description, the revision trail
and the downloadable file, each of which has to agree with the chart."""

from __future__ import annotations

import csv
import datetime as dt
from pathlib import Path

import pytest

from hogcycle.contracts.schema import Observation
from hogcycle.export.series_csv import HEADER, write_series_csv
from hogcycle.gold.about import load_about
from hogcycle.gold.series import all_specs
from hogcycle.gold.wall import build_wall
from hogcycle.registry.loader import load_registry
from hogcycle.registry.spec import Registry
from hogcycle.storage.silver import SilverStore

ROOT = Path(__file__).resolve().parents[2]
UTC = dt.UTC
D = dt.date


def test_every_series_has_a_description_in_both_languages():
    """The real config: a series with no description would ship a page that
    says nothing about its own number."""
    registry = load_registry(ROOT / "config" / "sources.yaml")
    ids = [s.id for s in all_specs(registry)]
    about = load_about(ROOT / "config" / "about.yaml", ids=ids)
    assert set(about) == set(ids)
    assert all(a["about_zh"] and a["about_en"] for a in about.values())


def test_a_missing_description_fails_and_names_the_series(tmp_path):
    path = tmp_path / "about.yaml"
    path.write_text("series:\n  a:\n    publisher: {zh: x, en: x}\n    url: null\n"
                    "    about: {zh: x, en: x}\n", encoding="utf-8")
    with pytest.raises(ValueError, match=r"no entry for \['b'\]"):
        load_about(path, ids=["a", "b"])


def _registry():
    full = load_registry(ROOT / "config" / "sources.yaml")
    return Registry({"piglet_price": full["piglet_price"]})


def _obs(day, value, fetched, published=None):
    return Observation("piglet_price", day, value, "CNY/kg", "weekly", "s", "t",
                       fetched, published)


def test_the_trail_and_the_file_show_the_same_series(tmp_path):
    silver = SilverStore(tmp_path / "silver")
    mirror = dt.datetime(2026, 9, 5, tzinfo=UTC)
    primary = dt.datetime(2026, 10, 12, tzinfo=UTC)
    silver.append_changes([_obs(D(2023, 10, 25), 25.36, mirror),
                           _obs(D(2023, 11, 1), 25.0, mirror)])
    silver.append_changes([_obs(D(2023, 10, 25), 25.63, primary, D(2023, 10, 30))])

    moment = dt.datetime(2026, 10, 13, tzinfo=UTC)
    (panel,) = build_wall(_registry(), silver, moment=moment)["panels"]
    assert panel["revisions"] == [
        {
            "d": "2023-10-25",
            "prints": [
                {"v": 25.36, "p": None, "learned": "2026-09-05"},
                {"v": 25.63, "p": "2023-10-30", "learned": "2026-10-12"},
            ],
        }
    ]

    assert write_series_csv(_registry(), silver, tmp_path / "csv", moment=moment) == 1
    rows = list(csv.reader((tmp_path / "csv" / "piglet_price.csv").open(encoding="utf-8")))
    assert tuple(rows[0]) == HEADER
    assert rows[1:] == [
        ["2023-10-25", "25.63", "CNY/kg", "weekly", "2023-10-30"],
        ["2023-11-01", "25.0", "CNY/kg", "weekly", ""],
    ]
