"""The 大商所 live-hog futures curve: what the market prices each coming
delivery month at, as of the latest settle (docs/adr/0035).

Every other series here measures what happened. This one is a price people
pay to take a view on what will, which makes it the only forward-looking
number the site can show without making one up. It is the market's
expectation, never ours, and it is kept off the wall like the equities.

The exchange's own endpoint refuses this network, so the settles come from
Sina's copy, one request per contract. A contract is listed for about a
year before its delivery month, in odd months, so each run asks for the
odd months from this one onward. A month Sina has nothing for is not
listed yet. A run that finds no contract at all fails: an empty curve is
the silent failure this project exists to prevent.

Each contract becomes one observation: obs_date is the end of its delivery
month, the value its latest settle, and `published_on` the trading day of
that settle. Tomorrow's settle is a new print of the same period, so silver
keeps the curve as it stood on every day it was collected.
"""

from __future__ import annotations

import datetime as dt
import socket
from collections.abc import Callable
from typing import Any

from ..contracts.schema import Observation
from ..registry.spec import IndicatorSpec
from .akshare import _TIMEOUT_S, _throttle

# akshare's answer for a contract Sina does not list: an empty table, which
# it fails to label. Anything else is a real failure and propagates.
_NOT_LISTED = "Length mismatch"


def _month_end(year: int, month: int) -> dt.date:
    return dt.date(year + month // 12, month % 12 + 1, 1) - dt.timedelta(days=1)


def contracts_from(
    today: dt.date, product: str, months: list[int], ahead: int
) -> list[tuple[str, int, int]]:
    """The contract codes worth asking for: `months` of the year, from this
    month for `ahead` months. LH2701 is January 2027."""
    out = []
    for k in range(ahead + 1):
        total = today.year * 12 + today.month - 1 + k
        y, m = total // 12, total % 12 + 1
        if m in months:
            out.append((f"{product}{y % 100:02d}{m:02d}", y, m))
    return out


class FuturesCurveAdapter:
    name = "futures_curve"

    def __init__(self, today: Callable[[], dt.date] = dt.date.today, ahead: int = 14):
        self.today = today
        self.ahead = ahead

    def fetch(self, spec: IndicatorSpec) -> Any:
        import akshare as ak

        product = spec.call["product"]
        months = list(spec.call.get("months", [1, 3, 5, 7, 9, 11]))
        curve: dict[str, Any] = {}
        previous = socket.getdefaulttimeout()
        socket.setdefaulttimeout(_TIMEOUT_S)
        try:
            for code, _, _ in contracts_from(self.today(), product, months, self.ahead):
                _throttle()
                try:
                    df = ak.futures_zh_daily_sina(symbol=code)
                except ValueError as exc:
                    if _NOT_LISTED in str(exc):
                        continue
                    raise
                curve[code] = {
                    "columns": [str(c) for c in df.columns],
                    "records": df.astype(object).where(df.notna(), None).to_dict("records"),
                }
        finally:
            socket.setdefaulttimeout(previous)
        if not curve:
            raise ValueError(
                f"{spec.id}: no {product} contract listed in the {self.ahead} months "
                "from today; Sina answered nothing for every one"
            )
        return {"product": product, "contracts": curve}

    def shape(self, payload: Any) -> frozenset[str]:
        """The columns of the contracts' tables (ADR-0032). Not the contract
        codes: those roll every two months by design."""
        cols: set[str] = set()
        for table in payload["contracts"].values():
            cols |= set(table["columns"])
        return frozenset(cols)

    def normalise(
        self,
        spec: IndicatorSpec,
        payload: Any,
        *,
        snapshot_id: str,
        fetched_at: dt.datetime,
    ) -> list[Observation]:
        date_col, value_col = spec.extract.period, spec.extract.value
        product = payload["product"]
        out: list[Observation] = []
        for code, table in sorted(payload["contracts"].items()):
            for col in (date_col, value_col):
                if col not in table["columns"]:
                    raise KeyError(
                        f"{spec.id}: {code} has no column {col!r} in {table['columns']}"
                    )
            rows = [r for r in table["records"] if r.get(value_col) is not None]
            if not rows:
                continue
            last = max(rows, key=lambda r: str(r[date_col]))
            yymm = code.removeprefix(product)
            year, month = 2000 + int(yymm[:2]), int(yymm[2:])
            out.append(
                Observation(
                    indicator=spec.id,
                    obs_date=_month_end(year, month),
                    value=float(last[value_col]),
                    unit=spec.unit,
                    granularity="monthly",
                    source=spec.source,
                    snapshot_id=snapshot_id,
                    fetched_at=fetched_at,
                    published_on=dt.date.fromisoformat(str(last[date_col])[:10]),
                )
            )
        return out
