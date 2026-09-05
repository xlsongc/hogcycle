"""Batch validation — the tripwires between an adapter and silver.

Range bounds live in config/sources.yaml, not here, and are deliberately wide.
Their job is to catch a unit change or an upstream parser break — 元/公斤
silently becoming 元/500克 — not to second-guess the market.

Everything here rejects the *whole batch*. A partial load is worse than no
load: it leaves silver in a state nobody chose, and the next run's
change-detection compares against it.
"""

from __future__ import annotations

import datetime as dt

from .schema import Observation


class ValidationError(Exception):
    """Raised to abort a whole batch. Never partially load."""


def validate(
    obs: list[Observation],
    *,
    unit: str,
    lo: float,
    hi: float,
    accept: tuple[str, ...] | None = None,
) -> list[Observation]:
    """Reject a batch outright rather than let bad rows into silver.

    `accept` optionally restricts which granularities may enter. A series
    that mixes annual and monthly rows can declare which ones it wants;
    anything else is dropped *before* the duplicate check, because dropping
    is a deliberate editorial choice while a duplicate is a shape change.
    """
    if not obs:
        raise ValidationError("empty batch — upstream returned nothing")

    if accept is not None:
        obs = [o for o in obs if o.granularity in accept]
        if not obs:
            raise ValidationError(
                f"no rows left after granularity filter {accept} — upstream "
                "shape probably changed"
            )

    bad_unit = {o.unit for o in obs} - {unit}
    if bad_unit:
        raise ValidationError(f"unit drift: expected {unit!r}, saw {bad_unit}")

    outliers = [o for o in obs if o.value is not None and not lo <= o.value <= hi]
    if outliers:
        sample = [(o.obs_date, o.value) for o in outliers[:3]]
        raise ValidationError(
            f"{len(outliers)} value(s) outside [{lo}, {hi}] — likely a unit or "
            f"parser change upstream. e.g. {sample}"
        )

    return _dedupe(obs)


def _dedupe(obs: list[Observation]) -> list[Observation]:
    """Collapse byte-identical repeats; fail on contradictory ones.

    These are two different events wearing the same shape. 行情宝 emits a
    handful of exactly duplicated rows (2017-09-18 appears twice with
    identical index, price and weight) — harmless upstream noise, and
    rejecting the batch over it would take an 11-year series offline.

    A duplicate obs_date carrying a *different* value is the dangerous case:
    it means either the period parser now maps two labels onto one date (a
    quarter-end and a month-end both landing on 09-30, say) or upstream
    changed shape. Silently keeping whichever row came last would let an
    arbitrary choice into the store, so that one aborts the batch.
    """
    seen: dict[dt.date, Observation] = {}
    out: list[Observation] = []
    for o in obs:
        prior = seen.get(o.obs_date)
        if prior is None:
            seen[o.obs_date] = o
            out.append(o)
            continue
        if prior.value == o.value and prior.granularity == o.granularity:
            continue  # exact repeat — upstream noise
        raise ValidationError(
            f"conflicting rows for obs_date {o.obs_date}: "
            f"{prior.value!r} ({prior.granularity}) vs {o.value!r} "
            f"({o.granularity}) — period parsing or upstream shape changed"
        )
    return out
