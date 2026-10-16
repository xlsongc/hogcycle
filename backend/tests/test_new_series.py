"""A new series over a release already collected (docs/adr/0027).

Two things make that possible without fetching again: replay reads the
snapshots of every indicator on the same upstream call, and a publisher's
other spelling of a name is listed in config rather than matched by a
pattern. The articles in `moa_weekly_spellings.json` are real, from bronze:

    2023-05-30  「全国豆粕价格4.50元/公斤」, without 平均
    2023-02-21  「全国猪肉平均26.70元/公斤」, without 价格
"""

from __future__ import annotations

import dataclasses
import datetime as dt
import json
from pathlib import Path

import pytest

from hogcycle.collectors.moa_weekly import MoaWeeklyAdapter
from hogcycle.pipeline import replay_one
from hogcycle.registry.loader import load_registry
from hogcycle.registry.spec import Extract
from hogcycle.storage.bronze import BronzeStore
from hogcycle.storage.silver import SilverStore

FIXTURES = Path(__file__).parent / "fixtures"
CONFIG = Path(__file__).resolve().parents[2] / "config" / "sources.yaml"
NOW = dt.datetime(2026, 10, 16, tzinfo=dt.UTC)
D = dt.date


@pytest.fixture(scope="module")
def registry():
    return load_registry(CONFIG)


@pytest.fixture(scope="module")
def spellings():
    return json.loads((FIXTURES / "moa_weekly_spellings.json").read_text("utf-8"))["market"]


@pytest.fixture(scope="module")
def market():
    return json.loads((FIXTURES / "moa_weekly.json").read_text("utf-8"))["market"]


def like(registry, base: str, new_id: str, value: str, also: tuple[str, ...] = ()):
    """A spec on `base`'s upstream call reading another name from it."""
    return dataclasses.replace(
        registry[base], id=new_id, extract=Extract(value=value, also=also)
    )


def read(spec, payload):
    return MoaWeeklyAdapter().normalise(spec, payload, snapshot_id="f", fetched_at=NOW)


def test_a_listed_spelling_is_read_as_the_same_figure(registry, spellings):
    base = "corn_price_county"
    soy = like(registry, base, "soy", "全国豆粕平均价格", ("全国豆粕价格",))
    pork = like(registry, base, "pork", "全国猪肉平均价格", ("全国猪肉平均",))
    assert [(o.obs_date, o.value) for o in read(soy, spellings)] == [
        (D(2023, 2, 15), 4.92),
        (D(2023, 5, 24), 4.50),  # 「全国豆粕价格」
    ]
    assert [(o.obs_date, o.value) for o in read(pork, spellings)] == [
        (D(2023, 2, 15), 26.70),  # 「全国猪肉平均」
        (D(2023, 5, 24), 24.05),
    ]


def test_without_the_listing_the_variant_still_fails_loudly(registry, spellings):
    soy = like(registry, "corn_price_county", "soy", "全国豆粕平均价格")
    with pytest.raises(KeyError, match="全国豆粕平均价格"):
        read(soy, spellings)


def test_two_spellings_that_disagree_fail(registry, spellings):
    art = dict(spellings["articles"][0])
    art["text"] += " 全国豆粕平均价格4.60元/公斤。"
    soy = like(registry, "corn_price_county", "soy", "全国豆粕平均价格", ("全国豆粕价格",))
    with pytest.raises(ValueError, match=r"\[4\.5, 4\.6\]"):
        read(soy, {**spellings, "articles": [art]})


def test_also_is_refused_where_no_parser_reads_it(tmp_path):
    src = CONFIG.read_text("utf-8").replace(
        "extract: {period: 日期, value: 成交均重}",
        "extract: {period: 日期, value: 成交均重, also: [均重]}",
        1,
    )
    path = tmp_path / "sources.yaml"
    path.write_text(src, "utf-8")
    with pytest.raises(ValueError, match=r"extract\.also is read only by"):
        load_registry(path)


def test_a_new_series_replays_from_its_siblings_bronze(registry, market, tmp_path):
    bronze, silver = BronzeStore(tmp_path / "b"), SilverStore(tmp_path / "s")
    corn = registry["corn_price_county"]
    bronze.write(corn.id, market, fetched_at=NOW - dt.timedelta(days=3), source=corn.source)
    soy = like(registry, "corn_price_county", "soy", "全国豆粕平均价格")

    alone = replay_one(soy, MoaWeeklyAdapter(), bronze, silver, now=NOW)
    assert not alone.ok and "no bronze snapshot" in (alone.error or "")

    result = replay_one(soy, MoaWeeklyAdapter(), bronze, silver, now=NOW, siblings=[corn])
    assert result.ok and result.rows_written == len(market["articles"])
    rows = silver.series("soy")
    # Learned at the replay, which is when this warehouse learned them.
    assert {r["fetched_at"].date() for r in rows} == {NOW.date()}
    assert (tmp_path / "b" / "soy").exists() is False  # bronze untouched


def test_a_siblings_older_source_is_not_read(registry, market, tmp_path):
    bronze, silver = BronzeStore(tmp_path / "b"), SilverStore(tmp_path / "s")
    corn = registry["corn_price_county"]
    bronze.write(corn.id, market, fetched_at=NOW, source="akshare:spot_corn:value")
    soy = like(registry, "corn_price_county", "soy", "全国豆粕平均价格")
    result = replay_one(soy, MoaWeeklyAdapter(), bronze, silver, now=NOW, siblings=[corn])
    assert not result.ok


def test_a_sibling_must_share_the_call(registry, market, tmp_path):
    bronze, silver = BronzeStore(tmp_path / "b"), SilverStore(tmp_path / "s")
    soy = like(registry, "corn_price_county", "soy", "全国豆粕平均价格")
    with pytest.raises(ValueError, match="does not share its upstream call"):
        replay_one(
            soy, MoaWeeklyAdapter(), bronze, silver, now=NOW,
            siblings=[registry["carcass_price"]],
        )
