"""Adapter over akshare. The only module that knows akshare exists.

akshare already wraps every source this dashboard needs, and upstream is a
JSON endpoint rather than scraped HTML — so writing our own scrapers would be
redundant work with a worse failure surface. What akshare does *not* give you
is retries, provenance, validation, or any memory that yesterday's number was
different. That gap is this project.

Keeping it behind the Adapter protocol also keeps the blast radius small:
akshare renames columns between releases, and when it does, only this file
changes.

Note what this adapter deliberately does *not* do: it never guesses which
column is which. Column names come from `spec.extract`, and a mismatch raises
a KeyError naming every column it actually saw. The previous version guessed
from a global candidate list, which is precisely why 能繁母猪存栏 — the one
series the whole project exists for — silently failed to collect.
"""

from __future__ import annotations

import datetime as dt
import time
from typing import Any

from ..contracts.schema import Observation
from ..registry.periods import parse_period
from ..registry.spec import IndicatorSpec

# 东方财富 (the stock endpoint) drops connections after a few rapid requests;
# 玄田 tolerates a burst but there is no reason to lean on that. One shared
# floor between upstream calls keeps a 16-indicator run under half a minute
# and keeps us a polite client of a free service.
_MIN_INTERVAL_S = 1.5
_last_call = 0.0


def _throttle() -> None:
    global _last_call
    wait = _MIN_INTERVAL_S - (time.monotonic() - _last_call)
    if wait > 0:
        time.sleep(wait)
    _last_call = time.monotonic()


def _column(payload: dict[str, Any], name: str, role: str, spec: IndicatorSpec) -> str:
    cols = payload["columns"]
    if name in cols:
        return name
    raise KeyError(
        f"{spec.id}: no {role} column {name!r} in {cols}. akshare may have "
        f"changed its schema — update `extract.{role}` in config/sources.yaml."
    )


class AkshareAdapter:
    name = "akshare"

    def fetch(self, spec: IndicatorSpec) -> Any:
        import akshare as ak

        call = {k: str(v) if isinstance(v, int) else v for k, v in spec.call.items()}
        fn = getattr(ak, call.pop("fn"))
        _throttle()
        df = fn(**call)
        # Serialise immediately: bronze stores JSON, not a pickled DataFrame,
        # so a snapshot stays readable when pandas moves on.
        return {
            "columns": [str(c) for c in df.columns],
            "records": df.astype(object).where(df.notna(), None).to_dict("records"),
        }

    def normalise(
        self,
        spec: IndicatorSpec,
        payload: Any,
        *,
        snapshot_id: str,
        fetched_at: dt.datetime,
    ) -> list[Observation]:
        period_col = _column(payload, spec.extract.period, "period", spec)
        value_col = _column(payload, spec.extract.value, "value", spec)

        out: list[Observation] = []
        for rec in payload["records"]:
            raw_period, raw_value = rec.get(period_col), rec.get(value_col)
            if raw_period is None:
                continue
            period = parse_period(raw_period, default=spec.freq)
            value = None if raw_value is None else _to_float(raw_value, spec)
            # Some 玄田 columns encode "not measured this period" as 0 rather
            # than null — a 0 kg carcass weight is missing data, not a reading.
            # The config declares which columns do this; we never guess.
            if spec.zero_is_null and value == 0:
                value = None
            out.append(
                Observation(
                    indicator=spec.id,
                    obs_date=period.date,
                    value=value,
                    unit=spec.unit,
                    granularity=period.granularity,
                    source=spec.source,
                    snapshot_id=snapshot_id,
                    fetched_at=fetched_at,
                )
            )
        return out


def _to_float(v: Any, spec: IndicatorSpec) -> float:
    try:
        return float(v)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{spec.id}: non-numeric value {v!r}") from exc
