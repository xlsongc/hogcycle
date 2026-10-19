from __future__ import annotations

import argparse
import datetime as dt
import logging
import sys
from pathlib import Path

from ..collectors.akshare import AkshareAdapter
from ..collectors.failures import ADVICE, BLOCKED
from ..collectors.moa import MoaAdapter
from ..collectors.moa_weekly import MoaWeeklyAdapter
from ..collectors.usda_psd import UsdaPsdAdapter
from ..export.contract import DEFAULT_OUT, SCHEMA_PATH, write_contract
from ..export.series_csv import DEFAULT_DIR as CSV_DIR
from ..export.series_csv import write_series_csv
from ..gold.about import DEFAULT_ABOUT, load_about
from ..gold.series import all_specs
from ..gold.wall import build_wall
from ..pipeline import collect_all, replay_one
from ..registry.heartbeat import health
from ..registry.loader import DEFAULT_CONFIG, load_registry
from ..registry.spec import Registry
from ..storage.bronze import BronzeStore
from ..storage.runs import RunLog
from ..storage.silver import SilverStore
from .published import run_published
from .status import run_status

WALL_START = dt.date(2015, 1, 1)  # the deepest window every panel can fill


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="hogcycle")
    p.add_argument(
        "command",
        choices=["collect", "replay", "status", "revisions", "export", "published"],
    )
    p.add_argument("--config", default=DEFAULT_CONFIG)
    p.add_argument(
        "--indicator",
        help="collect/replay: restrict the run to these indicator ids "
        "(comma-separated); revisions: which series to show (default sow_inventory)",
    )
    p.add_argument("--out", default=DEFAULT_OUT, help="export: contract path")
    p.add_argument("--schema", default=SCHEMA_PATH)
    p.add_argument(
        "--as-of",
        help="export: rebuild the wall as this warehouse knew it on this date "
        "(YYYY-MM-DD); the audit view, cut on when rows were learned",
    )
    p.add_argument(
        "--by",
        help="published: the day to ask about (YYYY-MM-DD); what anyone could "
        "have known then, cut on release dates (docs/adr/0025)",
    )
    p.add_argument(
        "--months-back",
        type=int,
        default=6,
        help="collect: how many 农业农村部 monthly editions to re-read "
        "(default 6; raise it to backfill, e.g. 60 reaches 2021-12)",
    )
    p.add_argument(
        "--reach",
        choices=["all", "anywhere", "cn"],
        default="all",
        help="collect: only indicators whose source answers from this kind of "
        "network (config `reach`); the GitHub run takes 'anywhere', a machine "
        "on an ordinary connection takes 'cn'",
    )
    p.add_argument(
        "--weekly-pages",
        type=int,
        default=2,
        help="collect: how many 畜牧兽医局 监测预警 list pages to read "
        "(default 2, about eight weeks; 25 is the whole list, back to 2021-12)",
    )
    p.add_argument(
        "--fail-on-stale",
        action="store_true",
        help="status: exit non-zero if any series has stopped advancing "
        "without an unexpired upstream_dark acknowledgement",
    )
    p.add_argument(
        "--json",
        action="store_true",
        help="status: print one JSON object per series instead of the table, "
        "for the workflow that files the stale-series issue",
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
            "moa_weekly": MoaWeeklyAdapter(pages=args.weekly_pages),
            "usda_psd": UsdaPsdAdapter(),
        }
        if args.indicator:
            # `registry[...]` raises naming every known id, which is what you
            # want when backfilling one series and mistyping it. Several ids
            # in one run share a fetch when they read the same report.
            ids = args.indicator.split(",")
            registry = Registry({i: registry[i] for i in ids})
        if args.reach != "all":
            registry = Registry({s.id: s for s in registry if s.reach == args.reach})
        started = dt.datetime.now(dt.UTC)
        results = collect_all(registry, adapters, bronze, silver)
        # The record of what this run did, failures and all, committed with
        # the data so a silent source group has a reason beside it (ADR-0028).
        by_reach: dict[str, list] = {}
        for r in results:
            by_reach.setdefault(registry[r.indicator].reach, []).append(r)
        finished = dt.datetime.now(dt.UTC)
        for reach, part in sorted(by_reach.items()):
            RunLog().append(reach, started=started, finished=finished, results=part)
        for r in results:
            mark = "ok  " if r.ok else "FAIL"
            why = f"[{r.kind}] {r.error}" if r.kind else (r.error or "")
            print(f"{mark} {r.indicator:<20} {r.rows_written:>5} row(s)  {why}")
            if r.ok and r.drift:
                print(f"     {'':<20}       {r.drift}")
        failed = [r for r in results if not r.ok]
        print(f"\n{len(results) - len(failed)}/{len(results)} ok")
        # One line per class that occurred, saying what it calls for
        # (docs/adr/0028): retry, a different network, or a person.
        for kind in sorted({r.kind for r in failed if r.kind}):
            ids = ", ".join(r.indicator for r in failed if r.kind == kind)
            print(f"  {kind}: {ADVICE[kind]} ({ids})")

        # Partial success is still success — one flaky endpoint must not cost
        # a day of everything else. But a *whole source* failing is a
        # different event, and treating it as partial success is how a green
        # run hides a dead upstream. That is the mistake this project already
        # made once; it is not going to make it silently twice.
        outages = _source_outages(registry, results)
        if outages:
            kinds = {r.indicator: r.kind for r in results}
            for adapter, ids in sorted(outages.items()):
                if all(kinds.get(i) == BLOCKED for i in ids):
                    print(
                        f"\nSOURCE BLOCKED: every indicator on adapter {adapter!r} "
                        f"was refused ({', '.join(ids)}). This network cannot "
                        "collect it; it is collected from where it answers "
                        "(`reach`, docs/adr/0022)."
                    )
                    continue
                print(
                    f"\nSOURCE OUTAGE: every indicator on adapter {adapter!r} "
                    f"failed ({', '.join(ids)}). This is not a flaky series — "
                    "the source itself is unreachable from here."
                )
            return 1
        return 0

    if args.command == "replay":
        # No network: the adapters are only asked to parse.
        adapters = {
            "akshare": AkshareAdapter(),
            "moa": MoaAdapter(),
            "moa_weekly": MoaWeeklyAdapter(),
            "usda_psd": UsdaPsdAdapter(),
        }
        ids = args.indicator.split(",") if args.indicator else None
        specs = [registry[i] for i in ids] if ids else list(registry)
        # Indicators on one upstream call read each other's snapshots too: it
        # is one response, so a series added later has its history (ADR-0027).
        results = [
            replay_one(
                s,
                adapters[s.adapter],
                bronze,
                silver,
                siblings=[x for x in registry if x.call_key == s.call_key],
            )
            for s in specs
        ]
        for r in results:
            mark = "ok  " if r.ok else "FAIL"
            print(f"{mark} {r.indicator:<22} {r.rows_written:>5} row(s)  {r.error or ''}")
        return 0 if all(r.ok for r in results) else 1

    if args.command == "status":
        return run_status(
            registry, silver, bronze, as_json=args.json, fail_on_stale=args.fail_on_stale
        )

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
        for obs_date, fetched_at, published_on, value in trail:
            released = "release date unknown" if published_on is None else (
                f"released {published_on}"
            )
            print(f"{obs_date}  {released:<22} learned {fetched_at:%Y-%m-%d}  {value}")
        return 0

    if args.command == "published":
        if not (args.indicator and args.by):
            print("published needs --indicator <id> --by <YYYY-MM-DD>", file=sys.stderr)
            return 2
        return run_published(
            registry[args.indicator], silver, dt.date.fromisoformat(args.by)
        )

    if args.command == "export":
        moment = None
        if args.as_of:
            moment = dt.datetime.fromisoformat(args.as_of).replace(tzinfo=dt.UTC)
        about = load_about(DEFAULT_ABOUT, ids=[s.id for s in all_specs(registry)])
        payload = build_wall(
            registry, silver, start=WALL_START, moment=moment, about=about
        )
        # Today's export says when each source was last reached; an as-of
        # export answers a different day's question, so it carries none.
        payload["health"] = None if moment is not None else health(registry, bronze)
        if not payload["panels"]:
            if moment is not None:
                # The audit view: nothing had been *learned* by then. Usually
                # the question meant was the backtest's, which reaches back
                # before collection began.
                print(
                    f"this warehouse had learned nothing by {args.as_of}: --as-of "
                    "cuts on when rows were fetched. For what was public then, "
                    "ask `hogcycle published --indicator <id> --by <date>`.",
                    file=sys.stderr,
                )
            else:
                print("no data in silver — run `hogcycle collect` first", file=sys.stderr)
            return 1
        path = write_contract(payload, args.out, schema_path=args.schema)
        csvs = write_series_csv(
            registry, silver, CSV_DIR, moment=moment or dt.datetime.now(dt.UTC)
        )
        pts = sum(len(p["points"]) for p in payload["panels"])
        print(
            f"wrote {path} — {len(payload['panels'])} panel(s), {pts} points, "
            f"{Path(path).stat().st_size / 1024:.1f} KB; {csvs} series CSV(s) in {CSV_DIR}"
        )
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
