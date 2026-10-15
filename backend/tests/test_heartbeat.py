"""The guard against a collector that stops, as opposed to a source that does.

The regression this pins: the local `reach: cn` collector was never
installed, and the first alarm would have been a 21-day staleness limit.
Liveness is judged from bronze manifests, so these tests write real manifest
lines through BronzeStore rather than faking the lookup.
"""

from __future__ import annotations

import datetime as dt

from hogcycle.registry.heartbeat import MAX_HOURS, check_groups
from hogcycle.registry.spec import Extract, IndicatorSpec, Registry
from hogcycle.storage.bronze import BronzeStore

NOW = dt.datetime(2026, 10, 15, 1, 0, tzinfo=dt.UTC)  # GitHub's cron, 09:00 Beijing


def spec(id: str, adapter: str, reach: str) -> IndicatorSpec:
    return IndicatorSpec(
        id=id,
        name_zh=id,
        name_en=id,
        tier="capacity",
        freq="monthly",
        unit="万头",
        lo=0.0,
        hi=1e9,
        adapter=adapter,
        reach=reach,
        call={"fn": "x"},
        extract=Extract(value="x"),
    )


def fetched(bronze: BronzeStore, indicator: str, hours_ago: float) -> None:
    at = NOW - dt.timedelta(hours=hours_ago)
    bronze.write(indicator, {"at": at.isoformat()}, fetched_at=at, source="test")


def registry() -> Registry:
    specs = [
        spec("sow_inventory", "moa", "cn"),
        spec("slaughter", "moa", "cn"),
        spec("corn_price", "akshare", "cn"),
        spec("hog_price_index", "akshare", "anywhere"),
    ]
    return Registry({s.id: s for s in specs})


def by_group(tmp_path, **ages: float):
    bronze = BronzeStore(tmp_path)
    for indicator, hours in ages.items():
        fetched(bronze, indicator, hours)
    return {b.group: b for b in check_groups(registry(), bronze, now=NOW)}


def test_the_gap_that_motivated_this_fails_on_the_third_day(tmp_path):
    """Last cn fetch 2026-10-12 07:30 UTC; GitHub checks 2026-10-15 01:00."""
    beats = by_group(tmp_path, sow_inventory=65.5 + 24, corn_price=65.5 + 24,
                     hog_price_index=1)
    assert beats["cn/moa"].failing
    assert beats["cn/akshare"].failing
    assert not beats["anywhere/akshare"].failing


def test_a_weekend_asleep_is_not_a_failure(tmp_path):
    """Friday 07:30 UTC to Monday 01:00 UTC is 65.5 hours."""
    beats = by_group(tmp_path, sow_inventory=65.5, corn_price=65.5, hog_price_index=1)
    assert not beats["cn/moa"].failing
    assert beats["cn/moa"].age_hours == 65


def test_one_dead_source_is_reported_while_the_collector_lives(tmp_path):
    """The local run's SOURCE OUTAGE exit code never reaches GitHub; this does."""
    beats = by_group(tmp_path, sow_inventory=18, corn_price=100, hog_price_index=1)
    assert not beats["cn/moa"].failing
    assert beats["cn/akshare"].failing
    assert beats["cn/akshare"].note == "SILENT 100h > 72h"


def test_the_newest_fetch_in_a_group_counts(tmp_path):
    beats = by_group(tmp_path, sow_inventory=200, slaughter=10, corn_price=1,
                     hog_price_index=1)
    assert not beats["cn/moa"].failing
    assert beats["cn/moa"].indicator == "slaughter"


def test_never_fetched_fails_rather_than_passing_quietly(tmp_path):
    beats = by_group(tmp_path, hog_price_index=1)
    assert beats["cn/moa"].latest is None
    assert beats["cn/moa"].failing
    assert beats["cn/moa"].note == "NEVER FETCHED"


def test_limits_differ_by_where_the_collector_runs():
    assert MAX_HOURS == {"anywhere": 36, "cn": 72}
