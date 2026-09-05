"""Adapter over akshare.

akshare already wraps every source this dashboard needs, and the upstream is
a JSON endpoint rather than scraped HTML — so writing our own scrapers would
be redundant work with a worse failure surface. What akshare does *not* give
you is retries, provenance, validation, or any memory that yesterday's number
was different. That gap is this project.

Treating it as one adapter behind a Protocol also keeps the blast radius
small: akshare renames columns between releases, and when it does, only this
file changes.
"""

from __future__ import annotations

import datetime as dt
from typing import Any

from ..registry import IndicatorSpec
from ..schema import Observation

# akshare's own column naming is inconsistent across endpoints; map, don't guess.
_DATE_COLS = ("date", "日期", "周期", "时间")
_VALUE_COLS = ("value", "价格", "数值", "均价")


def _pick(columns: list[str], candidates: tuple[str, ...], role: str, fn: str) -> str:
    for c in candidates:
        if c in columns:
            return c
    raise KeyError(
        f"{fn}: no {role} column among {columns}. akshare likely changed its "
        f"schema — update _DATE_COLS/_VALUE_COLS rather than patching callers."
    )


class AkshareAdapter:
    name = "akshare"

    def fetch(self, spec: IndicatorSpec) -> Any:
        import akshare as ak

        call = dict(spec.call)
        fn = getattr(ak, call.pop("fn"))
        df = fn(**call)
        # Serialise immediately: bronze stores JSON, not a pickled DataFrame,
        # so a snapshot stays readable when pandas moves on.
        return {
            "columns": list(df.columns),
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
        cols = payload["columns"]
        fn_name = spec.call["fn"]
        date_col = _pick(cols, _DATE_COLS, "date", fn_name)
        value_col = _pick(cols, _VALUE_COLS, "value", fn_name)

        out: list[Observation] = []
        for rec in payload["records"]:
            raw_date, raw_value = rec.get(date_col), rec.get(value_col)
            if raw_date is None:
                continue
            out.append(
                Observation(
                    indicator=spec.id,
                    obs_date=_to_date(raw_date),
                    value=None if raw_value is None else float(raw_value),
                    unit=spec.unit,
                    source=spec.source,
                    snapshot_id=snapshot_id,
                    fetched_at=fetched_at,
                )
            )
        return out


def _to_date(v: Any) -> dt.date:
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    s = str(v).strip()
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y%m%d", "%Y-%m", "%Y年%m月%d日"):
        try:
            return dt.datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"unparseable date {v!r}")
