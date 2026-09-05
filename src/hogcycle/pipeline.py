"""Wires the layers together. This is the only place that knows the order."""

from __future__ import annotations

import datetime as dt
import logging
from dataclasses import dataclass

from .bronze import BronzeStore
from .collectors.base import Adapter, with_retry
from .registry import IndicatorSpec, Registry
from .schema import ValidationError, validate
from .silver import SilverStore

log = logging.getLogger("hogcycle")


@dataclass(frozen=True, slots=True)
class Result:
    indicator: str
    ok: bool
    rows_written: int
    content_changed: bool
    error: str | None = None


def collect_one(
    spec: IndicatorSpec,
    adapter: Adapter,
    bronze: BronzeStore,
    silver: SilverStore,
    *,
    now: dt.datetime | None = None,
) -> Result:
    now = now or dt.datetime.now(dt.timezone.utc)
    try:
        payload = with_retry(lambda: adapter.fetch(spec))
        snap = bronze.write(spec.id, payload, fetched_at=now, source=spec.source)

        obs = adapter.normalise(
            spec, payload, snapshot_id=snap.snapshot_id, fetched_at=now
        )
        validate(obs, unit=spec.unit, lo=spec.lo, hi=spec.hi)
        written = silver.append_changes(obs)

        if written:
            log.info("%s: %d row(s) new or revised", spec.id, len(written))
        return Result(spec.id, True, len(written), snap.is_new)

    except (ValidationError, RuntimeError, KeyError, ValueError) as exc:
        # Bronze already holds the payload, so a parser failure is replayable.
        log.error("%s: %s", spec.id, exc)
        return Result(spec.id, False, 0, False, str(exc))


def collect_all(
    registry: Registry,
    adapter: Adapter,
    bronze: BronzeStore,
    silver: SilverStore,
    *,
    now: dt.datetime | None = None,
) -> list[Result]:
    """One bad source must not abort the run — collect everything, report at the end."""
    return [collect_one(s, adapter, bronze, silver, now=now) for s in registry]
