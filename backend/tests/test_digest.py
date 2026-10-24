"""The weekly digest (docs/adr/0039): the difference between two Sundays.

The promise worth testing is the bitemporal one: a week reads as it stood
at its end, so a value revised the week after does not rewrite it.
"""

from __future__ import annotations

import datetime as dt
from pathlib import Path

from hogcycle.contracts.schema import Observation
from hogcycle.gold.digest import build_weeks, curve, move, releases, week_id, week_starts
from hogcycle.registry.loader import load_registry
from hogcycle.registry.spec import Registry
from hogcycle.storage.silver import SilverStore

ROOT = Path(__file__).resolve().parents[2]
UTC = dt.UTC
D = dt.date


def at(day: dt.date) -> dt.datetime:
    return dt.datetime(day.year, day.month, day.day, 8, tzinfo=UTC)


LEARNED = D(2026, 9, 6)


def row(day, value, g="weekly", published=None, learned=LEARNED):
    return {
        "obs_date": day,
        "value": value,
        "granularity": g,
        "published_on": published,
        "fetched_at": at(learned),
        "basis": "learned" if published is None else "published",
    }


def test_weeks_start_the_monday_after_collection_began_and_run_to_today():
    starts = week_starts(D(2026, 9, 5), D(2026, 10, 24))
    assert starts[0] == D(2026, 9, 7)
    assert starts[-1] == D(2026, 10, 19)
    assert len(starts) == 7
    assert week_id(starts[-1]) == "2026-W43"


def test_a_week_with_no_new_reading_says_so_by_its_dates():
    m = move("x", [row(D(2026, 8, 19), 4.55)], [row(D(2026, 8, 19), 4.55)], D(2026, 10, 19))
    assert m is not None
    assert (m["d"], m["prev_d"], m["delta"]) == ("2026-08-19", "2026-08-19", 0.0)


def test_high_and_low_are_over_this_weeks_days_of_a_daily_series():
    days = [(16, 9.87), (19, 9.94), (20, 9.7), (23, 9.53)]
    now = [row(D(2026, 10, d), v, "daily") for d, v in days]
    m = move("x", now, now[:1], D(2026, 10, 19))
    assert m is not None
    assert (m["hi"], m["lo"], m["delta"], m["pct"]) == (9.94, 9.53, -0.34, -3.4)


def test_a_loss_gets_a_change_in_units_never_a_percentage():
    now, before = [row(D(2026, 10, 15), -382.0)], [row(D(2026, 10, 8), -352.0)]
    m = move("x", now, before, D(2026, 10, 19))
    assert m is not None
    assert (m["delta"], m["pct"]) == (-30.0, None)


def test_a_new_period_is_released_with_the_one_before_and_a_backfill_is_not():
    before = [row(D(2026, 7, 31), 10.77, "monthly")]
    now = [
        row(D(2026, 6, 30), 10.5, "monthly"),  # filled in behind the edge
        *before,
        row(D(2026, 8, 31), 11.01, "monthly", published=D(2026, 9, 29)),
    ]
    out = releases("x", now, before)
    assert [r["d"] for r in out] == ["2026-08-31"]
    assert (out[0]["on"], out[0]["basis"], out[0]["prior_v"], out[0]["pct"]) == (
        "2026-09-29", "published", 10.77, 2.2
    )
    assert out[0]["revised_from"] is None


def test_a_revision_is_released_with_the_value_it_replaced():
    out = releases("x", [row(D(2026, 8, 31), 3760.0, "monthly")],
                   [row(D(2026, 8, 31), 3754.5, "monthly")])
    assert [(r["v"], r["revised_from"]) for r in out] == [(3760.0, 3754.5)]


def test_a_series_first_knowable_this_week_releases_only_its_latest_period():
    now = [row(D(2026, m, 28), float(m), "monthly") for m in range(1, 9)]
    assert [r["d"] for r in releases("x", now, [])] == ["2026-08-28"]


def test_a_contract_whose_delivery_month_is_over_leaves_the_curve():
    now = [
        row(D(2026, 9, 30), 10300.0, "monthly", published=D(2026, 9, 15)),
        row(D(2026, 11, 30), 10590.0, "monthly", published=D(2026, 9, 30)),
    ]
    out = curve(now, [], D(2026, 10, 4))
    assert [(c["delivery"], c["prev_v"]) for c in out] == [("2026-11-30", None)]


def test_a_week_reads_as_it_stood_then_after_a_later_revision(tmp_path):
    spec = load_registry(ROOT / "config" / "sources.yaml")["piglet_price"]
    silver = SilverStore(tmp_path)

    def obs(day, value, published):
        return Observation(
            "piglet_price", day, value, spec.unit, "weekly", "s", "t",
            at(published), published,
        )

    silver.append_changes([obs(D(2026, 10, 7), 20.0, D(2026, 10, 9))])
    silver.append_changes([obs(D(2026, 10, 14), 19.0, D(2026, 10, 16))])
    silver.append_changes([obs(D(2026, 10, 14), 18.5, D(2026, 10, 23))])

    weeks = build_weeks(Registry({spec.id: spec}), silver, moment=at(D(2026, 10, 25)))
    assert [w["id"] for w in weeks] == ["2026-W42", "2026-W43"]
    w42, w43 = ({m["id"]: m for m in w["moves"]}["piglet_price"] for w in weeks)
    assert (w42["v"], w42["prev_v"], w42["delta"]) == (19.0, 20.0, -1.0)
    assert (w43["d"], w43["v"], w43["prev_v"]) == ("2026-10-14", 18.5, 19.0)
    assert weeks[0]["complete"] and not weeks[1]["complete"]


def test_the_feed_has_an_entry_per_finished_week_only():
    from hogcycle.export.week_feed import atom

    move = {"id": "hog_price_wai3", "d": "2026-10-16", "v": 9.87, "prev_d": "2026-10-09",
            "prev_v": 10.17, "delta": -0.3, "pct": -2.9, "hi": None, "lo": None}
    weeks = [
        {"id": "2026-W42", "start": "2026-10-12", "end": "2026-10-18", "complete": True,
         "moves": [move]},
        {"id": "2026-W43", "start": "2026-10-19", "end": "2026-10-25", "complete": False,
         "moves": []},
    ]
    payload = {
        "generated_at": "2026-10-24T08:00:00+00:00",
        "panels": [{"id": "hog_price_wai3", "name_zh": "外三元", "name_en": "Wai3",
                    "unit": "CNY/kg"}],
        "weeks": weeks,
    }
    feed = atom(payload, "zh")
    assert feed.count("<entry>") == 1
    assert "/zh/week/2026-w42/" in feed
    assert "外三元 9.87 元/公斤，较上周 −0.30（−2.9%）。" in feed
    assert "<updated>2026-10-19T00:00:00Z</updated>" in feed
