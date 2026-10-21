"""What the bitemporal store promises, checked over random histories.

The example tests pin cases someone thought of. These generate collection
histories nobody wrote down: revisions, re-releases, undated values that
later gain a date, several runs on one day. They check the three promises a
backtest stands on (ADR-0001, 0017):

  1. What was known at a moment never changes when later rows arrive.
  2. What was published by a day, as known at a moment, never changes either.
  3. Reading the same payload again writes nothing.
  4. The latest release read is the value, whatever order the releases were
     learned in, and each day's view is the latest release out by then.

A generated payload is shaped like a real one: per period, either one value
with no release date, or one or more releases on distinct days.
"""

from __future__ import annotations

import datetime as dt
import tempfile
from itertools import accumulate

from hypothesis import given, settings
from hypothesis import strategies as st

from hogcycle.contracts.schema import Observation
from hogcycle.storage.silver import SilverStore

PERIODS = [dt.date(2026, m, 28) for m in range(1, 7)]
VALUES = st.sampled_from([3990.0, 4035.0, 4067.0])  # few, so repeats happen
START = dt.datetime(2026, 7, 1, 6, tzinfo=dt.UTC)

Row = tuple[dt.date, dt.date | None, float]


@st.composite
def payload(draw: st.DrawFn) -> list[Row]:
    rows: list[Row] = []
    periods = st.lists(st.sampled_from(PERIODS), min_size=1, max_size=4, unique=True)
    for period in draw(periods):
        if draw(st.booleans()):
            rows.append((period, None, draw(VALUES)))
            continue
        lags = draw(st.lists(st.integers(0, 60), min_size=1, max_size=2, unique=True))
        rows += [(period, period + dt.timedelta(days=lag), draw(VALUES)) for lag in lags]
    return rows


# Gaps of hours, so some runs share a day and land in one partition.
HISTORY = st.lists(st.tuples(payload(), st.integers(1, 30)), min_size=2, max_size=4)


def observations(rows: list[Row], at: dt.datetime) -> list[Observation]:
    return [
        Observation(
            indicator="sow",
            obs_date=period,
            value=value,
            unit="万头",
            granularity="monthly",
            source="test",
            snapshot_id="s",
            fetched_at=at,
            published_on=released,
        )
        for period, released, value in rows
    ]


def times(history: list[tuple[list[Row], int]]) -> list[dt.datetime]:
    return [START + dt.timedelta(hours=h) for h in accumulate(gap for _, gap in history)]


def view(store: SilverStore, moment: dt.datetime, by: dt.date) -> tuple:
    return (
        store.as_of(moment, indicator="sow"),
        store.series("sow", moment=moment),
        store.published("sow", by=by, moment=moment),
    )


@settings(max_examples=40, deadline=None)
@given(history=HISTORY, cut=st.integers(1, 3), by=st.sampled_from(PERIODS))
def test_what_was_known_then_does_not_change_later(history, cut, by):
    cut = min(cut, len(history) - 1)
    at = times(history)
    with tempfile.TemporaryDirectory() as root:
        store = SilverStore(root)
        for (rows, _), t in zip(history[:cut], at[:cut], strict=True):
            store.append_changes(observations(rows, t))
        moment = at[cut - 1]
        before = view(store, moment, by + dt.timedelta(days=30))
        for (rows, _), t in zip(history[cut:], at[cut:], strict=True):
            store.append_changes(observations(rows, t))
        assert view(store, moment, by + dt.timedelta(days=30)) == before


@settings(max_examples=40, deadline=None)
@given(history=HISTORY)
def test_reading_the_same_payload_again_writes_nothing(history):
    at = times(history)
    with tempfile.TemporaryDirectory() as root:
        store = SilverStore(root)
        for (rows, _), t in zip(history, at, strict=True):
            store.append_changes(observations(rows, t))
        again = at[-1] + dt.timedelta(hours=1)
        assert store.append_changes(observations(history[-1][0], again)) == []


DAYS = 20
FIRST_RELEASE = dt.date(2026, 7, 1)


@st.composite
def world(draw: st.DrawFn) -> dict[tuple[dt.date, dt.date], float]:
    """Every release there is: (period, release day) -> value."""
    out: dict[tuple[dt.date, dt.date], float] = {}
    periods = st.lists(st.sampled_from(PERIODS), min_size=1, max_size=3, unique=True)
    for period in draw(periods):
        days = draw(st.lists(st.integers(0, DAYS), min_size=1, max_size=5, unique=True))
        for k in days:
            out[(period, FIRST_RELEASE + dt.timedelta(days=k))] = draw(VALUES)
    return out


# A payload holds the releases of a window of days ending on the day it was
# read: a source serves its history up to now, and a backfill reaches
# further back than a daily read. Read days only move forward.
WINDOWS = st.lists(
    st.tuples(st.integers(0, DAYS), st.integers(0, DAYS)), min_size=1, max_size=4
)


@settings(max_examples=80, deadline=None)
@given(releases=world(), windows=WINDOWS)
def test_the_latest_release_read_is_the_value_in_any_order(releases, windows):
    ends = list(accumulate((b for _, b in windows), max))
    reads = [(min(a, end), end) for (a, _), end in zip(windows, ends, strict=True)]
    seen: set[tuple[dt.date, dt.date]] = set()
    with tempfile.TemporaryDirectory() as root:
        store = SilverStore(root)
        at = START
        for a, b in reads:
            lo, hi = (FIRST_RELEASE + dt.timedelta(days=k) for k in (a, b))
            batch = sorted(k for k in releases if lo <= k[1] <= hi)
            seen |= set(batch)
            at += dt.timedelta(hours=1)
            rows = [(p, d, releases[(p, d)]) for p, d in batch]
            store.append_changes(observations(rows, at))

        latest = {p: releases[(p, d)] for p, d in sorted(seen)}
        assert {r["obs_date"]: r["value"] for r in store.series("sow", moment=at)} == latest
        for by in sorted({d for _, d in seen}):
            out_by = {p: releases[(p, d)] for p, d in sorted(seen) if d <= by}
            got = store.published("sow", by=by, moment=at)
            assert {r["obs_date"]: r["value"] for r in got} == out_by
