from __future__ import annotations

import argparse
import datetime as dt
import logging
import sys
from pathlib import Path

from ..collectors.akshare import AkshareAdapter
from ..collectors.moa import MoaAdapter
from ..export.contract import DEFAULT_OUT, SCHEMA_PATH, write_contract
from ..gold.wall import build_wall
from ..pipeline import collect_all
from ..registry.loader import DEFAULT_CONFIG, load_registry
from ..registry.spec import Registry
from ..registry.staleness import check_all
from ..storage.bronze import BronzeStore
from ..storage.silver import SilverStore

WALL_START = dt.date(2015, 1, 1)  # the deepest window every panel can fill


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="hogcycle")
    p.add_argument("command", choices=["collect", "status", "revisions", "export"])
    p.add_argument("--config", default=DEFAULT_CONFIG)
    p.add_argument(
        "--indicator",
        help="collect: restrict the run to one indicator id; revisions: which "
        "series to show (default sow_inventory)",
    )
    p.add_argument("--out", default=DEFAULT_OUT, help="export: contract path")
    p.add_argument("--schema", default=SCHEMA_PATH)
    p.add_argument(
        "--as-of",
        help="export: rebuild the wall as it stood on this date (YYYY-MM-DD)",
    )
    p.add_argument(
        "--months-back",
        type=int,
        default=6,
        help="collect: how many 农业农村部 monthly editions to re-read "
        "(default 6; raise it to backfill, e.g. 60 reaches 2021-12)",
    )
    p.add_argument(
        "--fail-on-stale",
        action="store_true",
        help="status: exit non-zero if any series has stopped advancing",
    )
    return p


def _source_outages(registry: Registry, results: list) -> dict[str, list[str]]:
    """Adapters for which *every* indicator failed, mapped to those ids.

    Grouping by adapter rather than counting failures overall is what makes
    the distinction useful: 6 of 20 failing is unremarkable noise unless those
    6 are all of one source, in which case it is that source going dark.
    """
    by_adapter: dict[str, list] = {}
    for r in results:
        try:
            adapter = registry[r.indicator].adapter
        except KeyError:  # pragma: no cover - registry is the source of results
            continue
        by_adapter.setdefault(adapter, []).append(r)
    return {
        adapter: [r.indicator for r in rs]
        for adapter, rs in by_adapter.items()
        if rs and all(not r.ok for r in rs)
    }


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)-7s %(message)s")

    registry = load_registry(args.config)
    bronze, silver = BronzeStore(), SilverStore()

    if args.command == "collect":
        adapters = {
            "akshare": AkshareAdapter(),
            "moa": MoaAdapter(months_back=args.months_back),
        }
        if args.indicator:
            # `registry[...]` raises naming every known id, which is what you
            # want when backfilling one series and mistyping it.
            registry = Registry({args.indicator: registry[args.indicator]})
        results = collect_all(registry, adapters, bronze, silver)
        for r in results:
            mark = "ok  " if r.ok else "FAIL"
            print(f"{mark} {r.indicator:<20} {r.rows_written:>5} row(s)  {r.error or ''}")
        failed = [r for r in results if not r.ok]
        print(f"\n{len(results) - len(failed)}/{len(results)} ok")

        # Partial success is still success — one flaky endpoint must not cost
        # a day of everything else. But a *whole source* failing is a
        # different event, and treating it as partial success is how a green
        # run hides a dead upstream. That is the mistake this project already
        # made once; it is not going to make it silently twice.
        outages = _source_outages(registry, results)
        if outages:
            for adapter, ids in sorted(outages.items()):
                print(
                    f"\nSOURCE OUTAGE: every indicator on adapter {adapter!r} "
                    f"failed ({', '.join(ids)}). This is not a flaky series — "
                    "the source itself is unreachable from here."
                )
            return 1
        return 0

    if args.command == "status":
        rows = {r["indicator"]: r for r in silver.coverage()}
        latest = {k: v["latest"] for k, v in rows.items() if v["latest"]}
        ages = {s.indicator: s for s in check_all(registry, latest)}
        print(
            f"{'indicator':<20} {'tier':<9} {'n':>6}  {'first':<12} "
            f"{'latest':<12} {'age':<16}"
        )
        for spec in registry:
            r = rows.get(spec.id)
            note = ages[spec.id].note
            if r:
                print(
                    f"{spec.id:<20} {spec.tier:<9} {r['n']:>6}  "
                    f"{r['first']!s:<12} {r['latest']!s:<12} {note:<16}"
                )
            else:
                print(f"{spec.id:<20} {spec.tier:<9} {'—':>6}  (no data)")

        stale = [s for s in ages.values() if s.stale]
        if stale:
            # Loud, and worth the paragraph: this is the exact failure that
            # hid an eleven-month freeze in the leading indicator.
            print(
                f"\n{len(stale)} series have stopped advancing — an upstream "
                "that keeps serving its last payload looks identical to a "
                "quiet day:"
            )
            for s in stale:
                print(f"  {s.indicator:<20} latest {s.latest}  ({s.note})")
            return 1 if args.fail_on_stale else 0
        return 0

    if args.command == "revisions":
        target = args.indicator or "sow_inventory"
        trail = silver.revisions(target)
        if not trail:
            print(
                f"{target}: no revisions recorded yet.\n"
                "A revision only becomes visible once the same obs_date comes "
                "back with a different value on a later run — so this table "
                "fills up going forward, never retroactively."
            )
            return 0
        for obs_date, fetched_at, value in trail:
            print(f"{obs_date}  learned {fetched_at:%Y-%m-%d}  {value}")
        return 0

    if args.command == "export":
        moment = None
        if args.as_of:
            moment = dt.datetime.fromisoformat(args.as_of).replace(tzinfo=dt.UTC)
        payload = build_wall(registry, silver, start=WALL_START, moment=moment)
        if not payload["panels"]:
            print("no data in silver — run `hogcycle collect` first", file=sys.stderr)
            return 1
        path = write_contract(payload, args.out, schema_path=args.schema)
        pts = sum(len(p["points"]) for p in payload["panels"])
        print(
            f"wrote {path} — {len(payload['panels'])} panel(s), {pts} points, "
            f"{Path(path).stat().st_size / 1024:.1f} KB"
        )
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
