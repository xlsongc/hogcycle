"""农业农村部畜牧兽医局 weekly reports, parsed from captured articles.

The fixture holds twelve real articles from bronze, chosen because each one
broke a first draft of the parser or would have broken a careless one:

    market report
        2026-10-08  today's wording
        2025-03-18  a <div> per paragraph: the body ended at the first one
        2026-05-09  published 16 days after its collection day (May Day)
        2026-03-02  2月第3周, collected 02-24, and
        2026-03-03  2月第4周, collected 02-26: two weeks two days apart
        2023-01-04  12月份第5周, published in January
    slaughter report
        2026-10-10  every designated plant, 「9月28日—10月4日」
        2023-11-28  全国规模以上 plants, 「11月20—26日」: the other caliber
        2025-11-21  「价格为为17.46」, the publisher's typo
        2025-08-26  one of three weeks published together, 23 days late
        2026-01-12  「2025年12月29日—2026年1月4日」
        2025-01-10  「2024年12月30—2025年1月5日」

This is the source that replaced a mirror which had copied it, mistyped one
week (25.63 as 25.36) and welded the slaughter report's two calibers into
one table. The tests care most about those two ways of being wrong.
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import pytest

from hogcycle.collectors.moa_weekly import MoaWeeklyAdapter, period_end, released
from hogcycle.registry.loader import load_registry

FIXTURE = Path(__file__).parent / "fixtures" / "moa_weekly.json"
CONFIG = Path(__file__).resolve().parents[2] / "config" / "sources.yaml"
NOW = dt.datetime(2026, 10, 12, tzinfo=dt.UTC)
D = dt.date


@pytest.fixture(scope="module")
def registry():
    return load_registry(CONFIG)


@pytest.fixture(scope="module")
def reports():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def read(registry, reports, indicator):
    spec = registry[indicator]
    payload = reports[spec.call["report"]]
    return MoaWeeklyAdapter().normalise(spec, payload, snapshot_id="f", fetched_at=NOW)


def test_market_report_reads_each_week_at_its_collection_day(registry, reports):
    obs = read(registry, reports, "piglet_price")
    assert [(o.obs_date, o.value, o.published_on) for o in obs] == [
        (D(2022, 12, 28), 37.94, D(2023, 1, 4)),  # 12月份第5周, out in January
        (D(2025, 3, 13), 36.90, D(2025, 3, 18)),  # body in nested divs
        (D(2026, 2, 24), 27.64, D(2026, 3, 2)),
        (D(2026, 2, 26), 27.67, D(2026, 3, 3)),  # holiday weeks, two days apart
        (D(2026, 4, 23), 22.94, D(2026, 5, 9)),  # 16 days late
        (D(2026, 9, 30), 19.77, D(2026, 10, 8)),
    ]
    assert {o.granularity for o in obs} == {"weekly"}


def test_soymeal_comes_from_the_same_report_and_collection_day(registry, reports):
    """Added by replaying the market report already in bronze (ADR-0027): its
    weeks are the corn and feed prices' weeks, read from the same articles."""
    soy = read(registry, reports, "soymeal_price_county")
    corn = read(registry, reports, "corn_price_county")
    assert [o.obs_date for o in soy] == [o.obs_date for o in corn]
    assert [(o.obs_date, o.value) for o in soy] == [
        (D(2022, 12, 28), 5.07),
        (D(2025, 3, 13), 3.74),
        (D(2026, 2, 24), 3.32),
        (D(2026, 2, 26), 3.32),
        (D(2026, 4, 23), 3.34),
        (D(2026, 9, 30), 3.42),
    ]


def test_names_one_character_apart_are_different_markets(registry, reports):
    """全国生猪平均价格 and 全国仔猪平均价格: the exact name decides."""
    hogs = {o.obs_date: o.value for o in read(registry, reports, "hog_price_county")}
    piglets = {o.obs_date: o.value for o in read(registry, reports, "piglet_price")}
    assert hogs[D(2026, 9, 30)] == 11.13
    assert piglets[D(2026, 9, 30)] == 19.77


def test_slaughter_report_keeps_one_caliber(registry, reports):
    """The 规模以上 week is the retired caliber's, not a gap in this one."""
    obs = read(registry, reports, "carcass_price")
    assert [(o.obs_date, o.value) for o in obs] == [
        (D(2025, 1, 5), 22.74),    # 2024年12月30—2025年1月5日
        (D(2025, 8, 3), 19.55),    # published with two later weeks
        (D(2025, 11, 16), 17.46),  # 「为为」
        (D(2026, 1, 4), 17.62),    # 2025年12月29日—2026年1月4日
        (D(2026, 10, 4), 15.55),
    ]
    assert all(o.obs_date >= registry["carcass_price"].caliber_from for o in obs)


def test_a_week_written_without_its_first_day_suffix_still_parses():
    text = "据农业农村部监测，2023年11月20—26日，"
    assert period_end(text, D(2023, 11, 28), where="x") == D(2023, 11, 26)


def test_publication_date_must_agree_with_the_list(reports):
    art = dict(reports["market"]["articles"][0])
    assert released(art) == D.fromisoformat(art["pubdate"])
    art["listed"] = "2020-01-01"
    with pytest.raises(ValueError, match="listed as 2020-01-01"):
        released(art)


def test_a_renamed_series_fails_loudly(registry, reports):
    spec = registry["piglet_price"]
    art = dict(reports["market"]["articles"][0])
    art["text"] = art["text"].replace("全国仔猪平均价格", "全国仔猪均价")
    payload = {"report": "market", "articles": [art], "skipped": []}
    with pytest.raises(KeyError, match="全国仔猪平均价格"):
        MoaWeeklyAdapter().normalise(spec, payload, snapshot_id="f", fetched_at=NOW)
