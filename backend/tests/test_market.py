"""The futures market's record (gold/market.py, docs/adr/0036): what each
contract priced months ahead, against where it finished. Arithmetic on
settles, so every number here can be worked out by hand."""

from __future__ import annotations

import datetime as dt
from pathlib import Path

from hogcycle.contracts.schema import Observation
from hogcycle.export.contracts_csv import contract_code, write_contracts_csv
from hogcycle.gold.market import (
    build_market,
    delivered,
    months_before,
    paths,
    record,
    settle_on,
    weekly,
)
from hogcycle.registry.loader import load_registry
from hogcycle.storage.silver import SilverStore

CONFIG = Path(__file__).resolve().parents[2] / "config" / "sources.yaml"
D = dt.date
UTC = dt.UTC
NOW = dt.datetime(2026, 10, 21, 12, tzinfo=UTC)
SEP = D(2026, 9, 30)  # LH2609
NOV = D(2026, 11, 30)  # LH2611


def prints(delivery, days, *, fetched=dt.datetime(2026, 10, 1, tzinfo=UTC)):
    return [
        {"obs_date": delivery, "value": v, "published_on": d, "fetched_at": fetched}
        for d, v in days
    ]


def test_months_before_is_the_first_of_the_month():
    assert months_before(SEP, 1) == D(2026, 8, 1)
    assert months_before(SEP, 9) == D(2025, 12, 1)
    assert months_before(D(2027, 1, 31), 3) == D(2026, 10, 1)


def test_a_settle_stands_through_a_quiet_stretch_but_not_before_listing():
    path = [(D(2026, 1, 5), 12000.0), (D(2026, 3, 2), 11500.0), (D(2026, 9, 20), 10300.0)]
    assert settle_on(path, D(2026, 1, 1)) is None, "not listed yet"
    assert settle_on(path, D(2026, 2, 27)) == (D(2026, 1, 5), 12000.0)
    assert settle_on(path, D(2026, 9, 20)) == (D(2026, 9, 20), 10300.0)
    assert settle_on(path, D(2026, 9, 21)) is None, "after its last day"


def test_a_day_read_twice_keeps_its_latest_reading_and_the_future_is_unknown():
    early, late = dt.datetime(2026, 10, 1, tzinfo=UTC), dt.datetime(2026, 10, 5, tzinfo=UTC)
    rows = prints(SEP, [(D(2026, 9, 1), 10000.0)], fetched=early)
    rows += prints(SEP, [(D(2026, 9, 1), 10050.0)], fetched=late)
    assert paths(rows, moment=NOW)[SEP] == [(D(2026, 9, 1), 10050.0)]
    assert paths(rows, moment=early)[SEP] == [(D(2026, 9, 1), 10000.0)]


def test_a_contract_has_finished_once_its_month_is_over_and_its_prints_reach_it():
    path = [(D(2025, 10, 1), 13000.0), (D(2026, 9, 24), 10300.0)]
    assert delivered(SEP, path, D(2026, 10, 21))
    assert not delivered(SEP, path, D(2026, 9, 25)), "its month is not over"
    assert not delivered(SEP, path[:1], D(2026, 10, 21)), "its prints stop a year short"
    assert not delivered(NOV, [(D(2026, 10, 20), 9750.0)], D(2026, 10, 21))


def test_each_horizon_is_the_settle_then_against_the_last_settle():
    contracts = {
        SEP: [
            (D(2026, 1, 5), 13000.0),  # listed after 2025-12-01, nine months out
            (D(2026, 2, 27), 12360.0),  # in force on 03-01, six months out
            (D(2026, 5, 29), 11330.0),  # in force on 06-01, three months out
            (D(2026, 7, 31), 10815.0),  # in force on 08-01, one month out
            (D(2026, 9, 24), 10300.0),  # the last settle
        ],
        NOV: [(D(2026, 10, 20), 9750.0)],  # still trading: no end point
    }
    got = record(contracts, D(2026, 10, 21))
    assert len(got["deliveries"]) == 1
    lh2609 = got["deliveries"][0]
    assert (lh2609["final"], lh2609["final_on"]) == (10300.0, "2026-09-24")
    assert [(a["months"], a["v"], a["err_pct"]) for a in lh2609["ahead"]] == [
        (1, 10815.0, 5.0),
        (3, 11330.0, 10.0),
        (6, 12360.0, 20.0),
    ]
    assert [h["months"] for h in got["horizons"]] == [1, 3, 6]


def test_the_summary_is_the_mean_miss_its_sign_and_the_worst():
    contracts = {
        SEP: [(D(2026, 7, 31), 11000.0), (D(2026, 9, 24), 10000.0)],  # +10%
        D(2026, 7, 31): [(D(2026, 5, 29), 9500.0), (D(2026, 7, 20), 10000.0)],  # -5%
    }
    one = record(contracts, D(2026, 10, 21))["horizons"][0]
    assert one == {
        "months": 1,
        "n": 2,
        "mean_abs_pct": 7.5,
        "mean_pct": 2.5,
        "worst_pct": 10.0,
        "worst_delivery": "2026-09-30",
    }


def test_a_week_is_drawn_by_its_last_settle():
    path = [(D(2026, 10, 12), 1.0), (D(2026, 10, 16), 2.0), (D(2026, 10, 19), 3.0)]
    assert weekly(path) == [{"d": "2026-10-16", "v": 2.0}, {"d": "2026-10-19", "v": 3.0}]


def test_the_market_block_is_built_from_what_silver_holds(tmp_path):
    registry = load_registry(CONFIG)
    silver = SilverStore(tmp_path)
    assert build_market(registry, silver, moment=NOW) is None, "nothing held yet"
    fetched = dt.datetime(2026, 10, 20, tzinfo=UTC)

    def settle(delivery, day, value):
        return Observation("lh_futures_curve", delivery, value, "CNY/tonne", "monthly",
                           "s", "t", fetched, day)

    silver.append_changes([
        settle(SEP, D(2026, 7, 31), 11000.0),
        settle(SEP, D(2026, 9, 24), 10000.0),
        settle(NOV, D(2026, 10, 20), 9750.0),
    ])
    market = build_market(registry, silver, moment=NOW)
    assert market["series"] == "lh_futures_curve"
    assert [(h["delivery"], h["delivered"]) for h in market["history"]] == [
        ("2026-09-30", True),
        ("2026-11-30", False),
    ]
    assert market["track_record"]["horizons"][0]["mean_pct"] == 10.0


def test_every_contract_day_is_one_row_named_as_the_exchange_names_it(tmp_path):
    registry = load_registry(CONFIG)
    silver = SilverStore(tmp_path / "silver")
    out = tmp_path / "futures" / "lh_contracts.csv"
    assert write_contracts_csv(registry, silver, out, moment=NOW) == 0
    assert not out.exists(), "no curve held, no file"
    fetched = dt.datetime(2026, 10, 20, tzinfo=UTC)

    def settle(delivery, day, value):
        return Observation("lh_futures_curve", delivery, value, "CNY/tonne", "monthly",
                           "s", "t", fetched, day)

    silver.append_changes([
        settle(SEP, D(2026, 9, 23), 10100.0),
        settle(SEP, D(2026, 9, 24), 10300.0),
        settle(D(2027, 1, 31), D(2026, 10, 20), 9850.0),
    ])
    assert write_contracts_csv(registry, silver, out, moment=NOW) == 3
    assert out.read_text("utf-8").splitlines() == [
        "contract,delivery_month,date,settle,unit",
        "LH2609,2026-09,2026-09-23,10100.0,CNY/tonne",
        "LH2609,2026-09,2026-09-24,10300.0,CNY/tonne",
        "LH2701,2027-01,2026-10-20,9850.0,CNY/tonne",
    ]
    assert contract_code(D(2030, 11, 30)) == "LH3011"
