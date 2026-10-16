"""Gold: derived series for the chart wall.

This layer computes. It does **not** judge. There is no rule here that emits
"we are in the deleveraging phase" — with roughly three cycles of usable
history, any such rule would be fitted to its own sample and would look
authoritative while being noise. Phase-calling stays with the reader, and the
layer's job is to put every series on one time axis with the derived context
a reader needs: units reconciled, history deep enough to see the cycle, and
each point's granularity preserved.

Ordering follows the causal chain the project's tier system encodes —
capacity leads price by 10-12 months; margin decides whether a capacity move
persists — so reading the wall top to bottom reads cause before effect.
"""

from __future__ import annotations

import datetime as dt
from typing import Any

from ..registry.spec import IndicatorSpec, Registry
from ..registry.staleness import check
from ..storage.silver import SilverStore
from .breaks import cadence_breaks, caliber_of
from .facts import change, extreme, first_seen_date, streak, threshold_run
from .series import all_specs, first_seen_of, is_derived, rows_of
from .vintage import learned_on, stamp_learned

# The causal wall shows the physical cycle. A share price is a claim on that
# cycle rather than a link in it, so equities stay out of the wall by default
# and live in the overlay, where the question they answer — does the market
# lead or lag 能繁母猪 — is one an overlay can actually put to the reader.
WALL_TIERS = frozenset({"capacity", "margin", "price", "noise"})

# Reference lines that mean something in the domain, not chart decoration.
THRESHOLDS: dict[str, dict[str, Any]] = {
    "hog_corn_ratio": {
        "value": 5.0,
        "label_zh": "5:1 盈亏线",
        "label_en": "5:1 breakeven",
    },
}

_G = {"daily": "D", "weekly": "W", "monthly": "M", "quarterly": "Q", "annual": "A"}


# Above this, a daily series is thinned to one point per ISO week. Two
# reasons, and both are real: over a 11.7-year window daily stock noise says
# nothing about where the cycle sits, and six daily equity series would add
# ~500 KB to a contract that a static page loads in full. silver keeps every
# day — thinning is a presentation choice, so it belongs here and nowhere
# upstream of here.
DOWNSAMPLE_ABOVE = 1000


def _downsample(points: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if len(points) <= DOWNSAMPLE_ABOVE:
        return points
    by_week: dict[tuple[int, int], dict[str, Any]] = {}
    for p in points:
        y, w, _ = dt.date.fromisoformat(p["d"]).isocalendar()
        by_week[(y, w)] = p  # last observation of the week wins
    return [by_week[k] for k in sorted(by_week)]


# A percentile is a claim about a distribution, and a short series has not got
# one. 屠宰量 starts in 2025-07 with 13 monthly points, all inside a single
# year: "历史第 42 分位" over that would read as cycle context while actually
# describing last winter. Two years is the shortest span that can contain a
# full seasonal turn, so below it the tile shows the level and says nothing
# about position.
MIN_HISTORY_FOR_PERCENTILE = 24


# How far an observation may sit from the one-year mark and still count as
# "the same period last year". A quarterly series lands within a few days of
# 365; a monthly one within ~15. Beyond 45 the comparison is between different
# seasons, and for a series with this much seasonality that is not a year-on-
# year change, it is a different question.
YOY_TOLERANCE_DAYS = 45


def year_on_year(
    rows: list[dict[str, Any]], latest: dict[str, Any]
) -> float | None:
    """Percent change against the reading closest to one year earlier.

    Computed here rather than in the frontend because it is a derivation over
    the series, and the contract is the boundary: the page renders numbers, it
    does not work them out. Returns None rather than guessing when no
    observation sits near the anniversary — a series that only starts this
    year has no year-on-year, and saying so is the honest answer.
    """
    if latest["value"] in (None, 0):
        return None
    target = latest["obs_date"] - dt.timedelta(days=365)
    prior = [r for r in rows if r["value"] and r["obs_date"] < latest["obs_date"]]
    if not prior:
        return None
    best = min(prior, key=lambda r: abs((r["obs_date"] - target).days))
    if abs((best["obs_date"] - target).days) > YOY_TOLERANCE_DAYS:
        return None
    return round((latest["value"] / best["value"] - 1) * 100, 1)


def percentile(values: list[float], target: float) -> int | None:
    """Where `target` sits in the series' own history, 0-100, or None when the
    series is too short for that to mean anything."""
    xs = sorted(v for v in values if v is not None)
    if len(xs) < MIN_HISTORY_FOR_PERCENTILE:
        return None
    below = sum(1 for v in xs if v < target)
    # Callers here always pass a value drawn from `xs`, which caps `below` at
    # n-1. The clamp is for anyone who does not: a percentile of 104 is not a
    # rounding artefact to explain away, it is a number that cannot exist.
    return min(100, round(100 * below / (len(xs) - 1)))


def history_years(rows: list[dict[str, Any]], latest: dict[str, Any]) -> float | None:
    """How deep the history a percentile is taken over goes, in years: the
    first observation with a value to the latest."""
    first = next((r["obs_date"] for r in rows if r["value"] is not None), None)
    if first is None:
        return None
    return round((latest["obs_date"] - first).days / 365.25, 1)


def _iso(d: dt.date | None) -> str | None:
    return None if d is None else d.isoformat()


def _point(r: dict[str, Any]) -> dict[str, Any]:
    point = {
        "d": r["obs_date"].isoformat(),
        "v": r["value"],
        "g": _G.get(r["granularity"], "?"),
    }
    # Only where the source dates its releases. An absent `p` means unknown,
    # and the page must say so rather than assume a value was public on the
    # day it describes.
    if r.get("published_on") is not None:
        point["p"] = r["published_on"].isoformat()
    else:
        # When this warehouse learned it, which is all an undated source lets
        # anyone say about when it was knowable. Folded into the panel's
        # default by stamp_learned (docs/adr/0025).
        point["_l"] = learned_on(r)
    return point


def release_lag(rows: list[dict[str, Any]]) -> dict[str, int] | None:
    """How long after its period ends a value typically becomes public.

    The median is what a reader should subtract from a lead read off the
    chart: 能繁母猪 leads price by 10-12 months of *biology*, but the number
    reaches anyone a month after that clock has started. The max is there
    because the long gaps, months published together after a holiday, are
    exactly when a reader would be acting on the oldest number.
    """
    lags = sorted(
        (r["published_on"] - r["obs_date"]).days
        for r in rows
        if r.get("published_on") is not None
    )
    if not lags:
        return None
    mid = len(lags) // 2
    median = lags[mid] if len(lags) % 2 else (lags[mid - 1] + lags[mid]) // 2
    return {"median_days": median, "max_days": lags[-1], "n": len(lags)}


def revision_trail(
    spec: IndicatorSpec, silver: SilverStore, start: dt.date | None
) -> list[dict[str, Any]]:
    """Every period whose value changed, with each value in the order it was
    learned: what it was, when it was released if known, and when this
    warehouse learned it. Inside the caliber and the window only."""
    out: dict[str, dict[str, Any]] = {}
    for obs_date, fetched_at, published_on, value in silver.revisions(spec.id):
        if not spec.covers(obs_date) or (start is not None and obs_date < start):
            continue
        d = obs_date.isoformat()
        entry = out.setdefault(d, {"d": d, "prints": []})
        entry["prints"].append(
            {
                "v": value,
                "p": _iso(published_on),
                "learned": fetched_at.astimezone(dt.UTC).date().isoformat(),
            }
        )
    return [out[k] for k in sorted(out)]


def build_wall(
    registry: Registry,
    silver: SilverStore,
    *,
    start: dt.date | None = None,
    moment: dt.datetime | None = None,
    about: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Assemble the full contract payload the frontend consumes.

    `moment` reconstructs the wall as it would have looked on a past date —
    the bitemporal store's whole reason for existing, reachable from the
    dashboard rather than only from a notebook.
    """
    moment = moment or dt.datetime.now(dt.UTC)
    specs = all_specs(registry)

    panels: list[dict[str, Any]] = []
    readings: list[dict[str, Any]] = []

    for spec in specs:
        rows = rows_of(spec, silver, moment=moment, start=start)
        if not rows:
            continue

        points = _downsample([_point(r) for r in rows])
        learned = stamp_learned(points)
        # A retired caliber is history, not a current reading. It stays
        # available in the overlay — comparing 规模以上 against 全口径 屠宰量
        # is a legitimate thing to want — but it is kept off the wall, whose
        # tiles are read as "where we are now".
        in_wall = spec.tier in WALL_TIERS and not spec.retired and not spec.forecast
        panels.append(
            {
                "id": spec.id,
                "name_zh": spec.name_zh,
                "name_en": spec.name_en,
                "tier": spec.tier,
                "unit": spec.unit,
                "freq": spec.freq,
                "revises": spec.revises,
                "forecast": spec.forecast,
                "in_wall": in_wall,
                "threshold": THRESHOLDS.get(spec.id),
                # A forecast is released before its period, so a "lag" would
                # be negative and mean nothing a backtest can use.
                "release_lag": None if spec.forecast else release_lag(rows),
                "about": (about or {}).get(spec.id),
                "learned": learned,
                "caliber": None if is_derived(spec) else caliber_of(spec, registry),
                "breaks": cadence_breaks(
                    [r["obs_date"] for r in rows if r["value"] is not None]
                ),
                "revisions": (
                    [] if is_derived(spec) else revision_trail(spec, silver, start)
                ),
                "points": points,
            }
        )

        values = [r["value"] for r in rows if r["value"] is not None]
        if values:
            latest = rows[-1]
            # Judged at `moment`, not today, so a wall rebuilt as of a past date
            # shows what was stale then. A stale reading still gets its tile:
            # hiding it would be the silent kind of failure. Saying how old it
            # is lets the reader discount it, which is their call to make.
            age = check(spec, latest["obs_date"], today=moment.date())
            readings.append(
                {
                    "id": spec.id,
                    "name_zh": spec.name_zh,
                    "name_en": spec.name_en,
                    "tier": spec.tier,
                    "in_wall": in_wall,
                    "unit": spec.unit,
                    "value": latest["value"],
                    "obs_date": latest["obs_date"].isoformat(),
                    "published_on": _iso(latest["published_on"]),
                    "granularity": latest["granularity"],
                    "percentile": (
                        pct := percentile(values, latest["value"])
                        if latest["value"] is not None
                        else None
                    ),
                    "history_years": None if pct is None else history_years(rows, latest),
                    "yoy": year_on_year(rows, latest),
                    "n": len(rows),
                    "stale": age.stale,
                    "age_days": age.age_days,
                    "first_seen": first_seen_date(
                        first_seen_of(spec, silver, latest["obs_date"], moment=moment)
                    ),
                    "extreme": extreme(
                        rows, latest, min_history=MIN_HISTORY_FOR_PERCENTILE
                    ),
                    "change": change(rows),
                    "streak": streak(rows),
                    "threshold_run": threshold_run(rows, threshold["value"])
                    if (threshold := THRESHOLDS.get(spec.id))
                    else None,
                }
            )

    return {
        "generated_at": moment.isoformat(),
        "window": {
            "start": (start.isoformat() if start else None),
            # Forecasts reach into next year; letting them set the end would
            # run every panel's axis past today.
            "end": max(
                (p["points"][-1]["d"] for p in panels if not p["forecast"]), default=None
            ),
        },
        "panels": panels,
        "readings": readings,
    }
