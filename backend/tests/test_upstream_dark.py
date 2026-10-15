"""A known outage, acknowledged with a deadline.

The staleness guard did its job in 2026-09: three 玄田 weekly tables froze in
mid-August and the collect run went red on the first day it could. Then it
stayed red for 26 days, because a red run you already understand is easy to
stop reading, and a red run nobody reads would also hide the next freeze.

`upstream_dark` is the answer, and these tests hold it to three promises: the
page still sees the series as stale, the run stops failing only until
`review_by`, and the alarm comes back on its own after that date.
"""

from __future__ import annotations

import datetime as dt
import json

import pytest

from hogcycle.registry.loader import load_registry
from hogcycle.registry.spec import MAX_ACK_DAYS, Extract, IndicatorSpec, UpstreamDark
from hogcycle.registry.staleness import check

ACK = dt.date(2026, 10, 11)
REVIEW = dt.date(2026, 12, 31)
FROZE = dt.date(2026, 8, 20)  # 玄田's last 仔猪价格 row


def dark(**kw) -> UpstreamDark:
    return UpstreamDark(
        **{"acknowledged": ACK, "review_by": REVIEW, "reason": "玄田周度表停更", **kw}
    )


def spec(**kw) -> IndicatorSpec:
    base = dict(
        id="piglet_price",
        name_zh="仔猪价格",
        name_en="Piglet price",
        tier="capacity",
        freq="weekly",
        unit="CNY/kg",
        lo=5.0,
        hi=200.0,
        adapter="akshare",
        call={"fn": "futures_hog_cost", "symbol": "仔猪价格"},
        extract=Extract(),
    )
    return IndicatorSpec(**{**base, **kw})


# --------------------------------------------------------------------------
# The guard
# --------------------------------------------------------------------------

def test_acknowledged_is_still_stale_but_no_longer_fails_the_run():
    s = check(spec(upstream_dark=dark()), FROZE, today=ACK)
    assert s.stale, "the fact does not change because someone has seen it"
    assert s.acknowledged
    assert not s.failing
    assert "ack until 2026-12-31" in s.note


def test_the_review_date_itself_is_still_covered():
    assert not check(spec(upstream_dark=dark()), FROZE, today=REVIEW).failing


def test_the_alarm_comes_back_by_itself_the_day_after_review_by():
    """Nobody has to remember. That is the whole difference from `retired`."""
    s = check(spec(upstream_dark=dark()), FROZE, today=REVIEW + dt.timedelta(days=1))
    assert s.failing
    assert s.lapsed
    assert "ack lapsed 2026-12-31" in s.note


def test_without_an_acknowledgement_the_same_freeze_fails():
    assert check(spec(), FROZE, today=ACK).failing


def test_a_series_that_resumes_is_flagged_so_the_mark_gets_removed():
    """A leftover mark would quietly cover the *next* freeze until it lapsed."""
    s = check(spec(upstream_dark=dark()), dt.date(2026, 10, 8), today=ACK)
    assert not s.stale and not s.failing
    assert s.resumed
    assert "still marked dark" in s.note


# --------------------------------------------------------------------------
# What the config may say
# --------------------------------------------------------------------------

def test_an_acknowledgement_cannot_outlive_its_limit():
    with pytest.raises(ValueError, match=f"limit is {MAX_ACK_DAYS}"):
        dark(review_by=ACK + dt.timedelta(days=MAX_ACK_DAYS + 1))
    dark(review_by=ACK + dt.timedelta(days=MAX_ACK_DAYS))  # the limit itself is fine


def test_review_by_must_come_after_the_acknowledgement():
    with pytest.raises(ValueError, match="must be after"):
        dark(review_by=ACK)


def test_an_acknowledgement_must_say_why():
    with pytest.raises(ValueError, match="reason is required"):
        dark(reason="  ")


def test_retired_and_dark_cannot_both_be_true():
    """Retired means the caliber closed; dark means it is alive elsewhere."""
    with pytest.raises(ValueError, match="contradict"):
        spec(retired=True, upstream_dark=dark())


def _write(tmp_path, block: str):
    entry = """
indicators:
  - id: piglet_price
    name_zh: 仔猪价格
    name_en: Piglet price
    tier: capacity
    freq: weekly
    unit: CNY/kg
    lo: 5.0
    hi: 200.0
    adapter: akshare
    call: {fn: futures_hog_cost, symbol: 仔猪价格}
""" + block
    path = tmp_path / "sources.yaml"
    path.write_text(entry, encoding="utf-8")
    return path


def test_the_loader_reads_quoted_and_unquoted_dates(tmp_path):
    path = _write(tmp_path, """    upstream_dark:
      acknowledged: 2026-10-11
      review_by: "2026-12-31"
      reason: 玄田周度表停更
""")
    got = load_registry(path)["piglet_price"].upstream_dark
    assert got == UpstreamDark(ACK, REVIEW, "玄田周度表停更")


def test_a_misspelt_field_fails_at_load_time(tmp_path):
    """`review` instead of `review_by` must not load as an open-ended mark."""
    path = _write(tmp_path, """    upstream_dark:
      acknowledged: 2026-10-11
      review: 2026-12-31
      reason: x
""")
    with pytest.raises(ValueError, match="needs exactly"):
        load_registry(path)


# --------------------------------------------------------------------------
# The page and the CLI
# --------------------------------------------------------------------------

def _silver_with(root, latest: dt.date):
    from hogcycle.contracts.schema import Observation
    from hogcycle.storage.silver import SilverStore

    silver = SilverStore(root)
    silver.append_changes([
        Observation(
            indicator="piglet_price",
            obs_date=latest,
            value=21.75,
            unit="CNY/kg",
            granularity="weekly",
            source="test",
            snapshot_id="test",
            fetched_at=dt.datetime(2026, 8, 21, tzinfo=dt.UTC),
        )
    ])
    return silver


def test_the_wall_shows_an_acknowledged_series_as_stale(tmp_path):
    """Config quiets the collector's alarm, never the page."""
    from hogcycle.gold.wall import build_wall
    from hogcycle.registry.spec import Registry

    reg = Registry({"piglet_price": spec(upstream_dark=dark())})
    silver = _silver_with(tmp_path / "silver", FROZE)
    moment = dt.datetime(2026, 10, 11, tzinfo=dt.UTC)
    (reading,) = build_wall(reg, silver, moment=moment)["readings"]
    assert reading["stale"] is True
    assert reading["age_days"] == 52


def test_a_wall_rebuilt_as_of_a_past_date_judges_staleness_then(tmp_path):
    """On 2026-09-01 the same reading was 12 days old and perfectly live."""
    from hogcycle.gold.wall import build_wall
    from hogcycle.registry.spec import Registry

    reg = Registry({"piglet_price": spec()})
    silver = _silver_with(tmp_path / "silver", FROZE)
    moment = dt.datetime(2026, 9, 1, tzinfo=dt.UTC)
    (reading,) = build_wall(reg, silver, moment=moment)["readings"]
    assert reading["stale"] is False
    assert reading["age_days"] == 12


def test_status_json_tells_the_workflow_which_series_fail(tmp_path, monkeypatch, capsys):
    """The workflow files its issue from this output, so its shape is a
    contract too: one object per series, `failing` deciding the issue. Source
    groups follow as `kind: heartbeat` lines (ADR-0023)."""
    from hogcycle.cli import main as cli

    # The CLI reads data/silver relative to where it runs, as in the workflow.
    _silver_with(tmp_path / "data" / "silver", FROZE)
    config = _write(tmp_path, "")
    monkeypatch.chdir(tmp_path)

    code = cli.main(["status", "--json", "--fail-on-stale", "--config", str(config)])
    lines = [json.loads(line) for line in capsys.readouterr().out.splitlines()]
    (row,) = [r for r in lines if r["kind"] == "series"]
    assert row["indicator"] == "piglet_price"
    assert row["stale"] is True and row["failing"] is True
    assert row["acknowledged"] is False and row["review_by"] is None
    assert code == 1
