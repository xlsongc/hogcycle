from __future__ import annotations

import argparse
import datetime as dt
import logging
import sys

from .bronze import BronzeStore
from .collectors.akshare_adapter import AkshareAdapter
from .pipeline import collect_all
from .registry import load_registry
from .silver import SilverStore


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="hogcycle")
    p.add_argument("command", choices=["collect", "status", "revisions"])
    p.add_argument("--config", default="config/sources.yaml")
    p.add_argument("--indicator", help="restrict to one indicator id")
    args = p.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(levelname)-7s %(message)s")
    registry = load_registry(args.config)
    bronze, silver = BronzeStore(), SilverStore()

    if args.command == "collect":
        results = collect_all(registry, AkshareAdapter(), bronze, silver)
        failed = [r for r in results if not r.ok]
        for r in results:
            mark = "ok " if r.ok else "FAIL"
            print(f"{mark} {r.indicator:<20} {r.rows_written:>4} row(s)  {r.error or ''}")
        # Partial success is still success; the point is to know which part.
        return 1 if len(failed) == len(results) else 0

    if args.command == "status":
        now = dt.datetime.now(dt.timezone.utc)
        for spec in registry:
            known = silver.as_of(now, indicator=spec.id)
            latest = max(known) if known else None
            print(f"{spec.id:<20} {spec.tier:<9} n={len(known):<6} latest={latest}")
        return 0

    if args.command == "revisions":
        target = args.indicator or "sow_inventory"
        for obs_date, fetched_at, value in silver.revisions(target):
            print(f"{obs_date}  learned {fetched_at:%Y-%m-%d}  {value}")
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
