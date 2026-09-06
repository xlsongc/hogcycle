"""Wires the layers together. This is the only place that knows the order."""

from __future__ import annotations

import datetime as dt
import logging
from dataclasses import dataclass
from typing import Any

from .collectors.base import Adapter, with_retry
from .contracts.validation import ValidationError, validate
from .registry.periods import PeriodParseError
from .registry.spec import IndicatorSpec, Registry
from .storage.bronze import BronzeStore
from .storage.silver import SilverStore

log = logging.getLogger("hogcycle")

# Everything a bad payload can throw on its way through normalise/validate.
# Anything outside this set is a bug in our code, and should crash loudly
# rather than be filed as "indicator failed".
COLLECT_ERRORS = (
    ValidationError,
    PeriodParseError,
    RuntimeError,
    KeyError,
    ValueError,
    TypeError,
)


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
    payload: Any | None = None,
) -> Result:
    """Collect one indicator. `payload` lets the caller supply an already
    fetched response so several indicators can share one upstream call."""
    now = now or dt.datetime.now(dt.UTC)
    try:
        if payload is None:
            payload = with_retry(lambda: adapter.fetch(spec))
        snap = bronze.write(spec.id, payload, fetched_at=now, source=spec.source)

        obs = adapter.normalise(
            spec, payload, snapshot_id=snap.snapshot_id, fetched_at=now
        )
        obs = validate(obs, unit=spec.unit, lo=spec.lo, hi=spec.hi, accept=spec.accept)
        written = silver.append_changes(obs)

        if written:
            log.info("%s: %d row(s) new or revised", spec.id, len(written))
        return Result(spec.id, True, len(written), snap.is_new)

    except COLLECT_ERRORS as exc:
        # Bronze already holds the payload (it is written before normalise
        # runs), so a parser failure is replayable offline — no re-fetch, and
        # nothing is lost while the parser is being fixed.
        log.error("%s: %s", spec.id, _message(exc))
        return Result(spec.id, False, 0, False, _message(exc))


def collect_all(
    registry: Registry,
    adapters: dict[str, Adapter],
    bronze: BronzeStore,
    silver: SilverStore,
    *,
    now: dt.datetime | None = None,
) -> list[Result]:
    """One bad source must not abort the run — collect everything, report at
    the end. Indicators sharing an upstream call fetch it once.

    `adapters` is keyed by `spec.adapter`. Sources do not share a failure
    mode: 玄田 going stale must not stop 农业农村部 from collecting, which is
    the whole reason the leading indicator moved off a single mirror.
    """
    now = now or dt.datetime.now(dt.UTC)
    cache: dict[str, Any] = {}
    results: list[Result] = []

    for spec in registry:
        adapter = adapters.get(spec.adapter)
        if adapter is None:
            msg = f"no adapter named {spec.adapter!r}; known: {sorted(adapters)}"
            log.error("%s: %s", spec.id, msg)
            results.append(Result(spec.id, False, 0, False, msg))
            continue

        payload = cache.get(spec.call_key)
        if payload is None:
            try:
                payload = with_retry(lambda a=adapter, s=spec: a.fetch(s))
                cache[spec.call_key] = payload
            except RuntimeError as exc:
                log.error("%s: %s", spec.id, exc)
                results.append(Result(spec.id, False, 0, False, str(exc)))
                continue
        results.append(
            collect_one(spec, adapter, bronze, silver, now=now, payload=payload)
        )
    return results


def _message(exc: Exception) -> str:
    # str(KeyError("x")) is "'x'" — the quotes leak into logs and CLI output.
    return exc.args[0] if isinstance(exc, KeyError) and exc.args else str(exc)
