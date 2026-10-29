"""Every 大商所 live-hog contract's settles in one file, a row per contract
and trading day (docs/adr/0041).

The curve's own CSV holds one number per delivery month, its latest or last
settle, which is what the page draws. Following one contract from listing
to delivery, or checking the market's record (docs/adr/0036) by hand, needs
the whole path; silver keeps every day.

silver writes a settle only when it moves, so a day whose settle equals the
day before has no row: the row before it still stands.
"""

from __future__ import annotations

import csv
import datetime as dt
from pathlib import Path

from ..gold.market import ADAPTER, paths
from ..registry.spec import Registry
from ..storage.silver import SilverStore

DEFAULT_PATH = "frontend/public/data/futures/lh_contracts.csv"

HEADER = ("contract", "delivery_month", "date", "settle", "unit")


def contract_code(delivery: dt.date) -> str:
    """大商所's own name for the contract: LH and the delivery month as YYMM."""
    return f"LH{delivery.year % 100:02d}{delivery.month:02d}"


def write_contracts_csv(
    registry: Registry,
    silver: SilverStore,
    out_path: Path | str = DEFAULT_PATH,
    *,
    moment: dt.datetime,
) -> int:
    """Write the file; returns the rows written. No curve configured or held
    writes nothing and removes a file left from an earlier export."""
    out = Path(out_path)
    spec = next((s for s in registry if s.adapter == ADAPTER), None)
    contracts = paths(silver.prints(spec.id), moment=moment) if spec else {}
    if not contracts:
        out.unlink(missing_ok=True)
        return 0

    out.parent.mkdir(parents=True, exist_ok=True)
    n = 0
    with out.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(HEADER)
        for delivery, path in contracts.items():
            for day, settle in path:
                w.writerow(
                    (contract_code(delivery), delivery.isoformat()[:7], day.isoformat(),
                     repr(settle), spec.unit)
                )
                n += 1
    return n
