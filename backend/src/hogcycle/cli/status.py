"""`hogcycle status`: is every series alive, and is anyone still collecting?

Two different failures, two different clocks. A series is stale when its
publisher has not moved on within the series' own cadence (staleness.py). A
collector is silent when nothing of a source group has been fetched within
hours (heartbeat.py). Either fails `--fail-on-stale`, because either one,
left alone, is the eleven-month freeze this project was built after.
"""

from __future__ import annotations

import datetime as dt
import json
from typing import Any

from ..gold.calendar import next_release
from ..gold.series import rows_of
from ..quality import ERROR, WARN, run_checks
from ..registry.heartbeat import check_groups
from ..registry.spec import Registry
from ..registry.staleness import check_all
from ..storage.bronze import BronzeStore
from ..storage.runs import RunLog, summary
from ..storage.silver import SilverStore


def run_status(
    registry: Registry,
    silver: SilverStore,
    bronze: BronzeStore,
    *,
    as_json: bool,
    fail_on_stale: bool,
    runs: RunLog | None = None,
) -> int:
    runs = runs or RunLog()
    known = registry.indicators
    rows = {
        r["indicator"]: r
        for r in silver.coverage(lambda i, d: i not in known or known[i].covers(d))
    }
    latest = {k: v["latest"] for k, v in rows.items() if v["latest"]}
    ages = {s.indicator: s for s in check_all(registry, latest)}
    failing = [s for s in ages.values() if s.failing]
    beats = check_groups(registry, bronze)
    silent = [b for b in beats if b.failing]
    # A duplicate key fails like a stale series; a disagreement only warns
    # (docs/adr/0029).
    checks = run_checks(registry, silver)
    broken = [c for c in checks if c.level == ERROR]
    failed = bool(failing or silent or broken)
    # When each live series' next value is due (docs/adr/0031). Overdue warns
    # and never fails: a release later than any on record is worth a look,
    # and is not yet a series that stopped.
    now = dt.datetime.now(dt.UTC)
    due: dict[str, dict[str, Any] | None] = {
        spec.id: None
        if spec.retired or spec.forecast
        else next_release(rows_of(spec, silver, moment=now), today=now.date())
        for spec in registry
    }
    overdue = [i for i, n in due.items() if n and n["overdue"]]

    def last_run(group: str) -> str:
        """What the newest run of this group's reach did with its indicators:
        the reason beside a silence, when there is one (ADR-0028)."""
        reach, adapter = group.split("/", 1)
        ids = {s.id for s in registry if s.reach == reach and s.adapter == adapter}
        return summary(runs.latest(reach), ids)

    if as_json:
        for spec in registry:
            st = ages[spec.id]
            print(json.dumps({
                "kind": "series",
                "indicator": spec.id,
                "latest": None if st.latest is None else st.latest.isoformat(),
                "age_days": st.age_days,
                "limit": st.limit,
                "stale": st.stale,
                "failing": st.failing,
                "acknowledged": st.acknowledged,
                "review_by": None if st.review_by is None else st.review_by.isoformat(),
                "lapses_in_days": st.lapses_in,
                "retired": st.retired,
                "next_release": due[spec.id],
            }))
        for b in beats:
            print(json.dumps({
                "kind": "heartbeat",
                "indicator": b.group,
                "latest": None if b.latest is None else b.latest.isoformat(),
                "via": b.indicator,
                "age_hours": b.age_hours,
                "limit_hours": b.limit_hours,
                "failing": b.failing,
                "last_run": last_run(b.group),
            }))
        for c in checks:
            print(json.dumps(c.as_json(), ensure_ascii=False))
        return 1 if fail_on_stale and failed else 0

    print(
        f"{'indicator':<20} {'tier':<9} {'n':>6}  {'first':<12} "
        f"{'latest':<12} {'age':<16} next release (usually / at the latest)"
    )
    for spec in registry:
        r = rows.get(spec.id)
        note = ages[spec.id].note
        if r:
            print(
                f"{spec.id:<20} {spec.tier:<9} {r['n']:>6}  "
                f"{r['first']!s:<12} {r['latest']!s:<12} {note:<16} {_due(due[spec.id])}"
            )
        else:
            print(f"{spec.id:<20} {spec.tier:<9} {'—':>6}  (no data)")

    print(f"\n{'source group':<20} {'last fetched (UTC)':<20} {'age':<20} last run")
    for b in beats:
        when = "—" if b.latest is None else f"{b.latest:%Y-%m-%d %H:%M}"
        print(f"{b.group:<20} {when:<20} {b.note:<20} {last_run(b.group)}")

    print(f"\n{'quality check':<36} {'level':<6} detail")
    for c in checks:
        print(f"{c.name:<36} {c.level:<6} {c.detail}")
    for c in checks:
        if c.level == WARN:
            print(f"  WARN {c.name}: two sources that measure one thing have parted.")
    if broken:
        print("  ERROR: the store holds a duplicate key; as-of views built on it are "
              "ambiguous until it is found (docs/adr/0029).")

    acked = [s for s in ages.values() if s.acknowledged]
    if acked:
        # Printed every run on purpose. Acknowledged is not resolved: the
        # number on the site is still old, and someone owes a fix.
        print(f"\n{len(acked)} series are dark upstream and acknowledged:")
        for s in acked:
            soon = f"  LAPSES IN {s.lapses_in} DAYS" if s.lapsing else ""
            print(f"  {s.indicator:<20} latest {s.latest}  review by {s.review_by}{soon}")
        if any(s.lapsing for s in acked):
            # The run turns red by itself on the day after review_by. Decide
            # before then: the fix is built (remove the mark), the caliber is
            # gone (retire it), or renew with a reason.
            print("  An acknowledgement that lapses fails the run again (docs/adr/0015).")
    resumed = [s for s in ages.values() if s.resumed]
    if resumed:
        print("\nAdvancing again but still marked upstream_dark — remove the mark:")
        for s in resumed:
            print(f"  {s.indicator:<20} latest {s.latest}")

    if overdue:
        print(
            f"\n{len(overdue)} release(s) later than any on record for the series "
            "(a warning; the series is not stale yet):"
        )
        for i in overdue:
            n = due[i] or {}
            print(f"  {i:<20} period to {n.get('period')}, longest wait ends {n.get('by')}")

    if failing:
        # Loud, and worth the paragraph: this is the exact failure that hid an
        # eleven-month freeze in the leading indicator.
        print(
            f"\n{len(failing)} series have stopped advancing — an upstream that "
            "keeps serving its last payload looks identical to a quiet day:"
        )
        for s in failing:
            print(f"  {s.indicator:<20} latest {s.latest}  ({s.note})")
    if silent:
        print(
            f"\n{len(silent)} source group(s) have not been fetched within their "
            "limit — the collector that reaches them has stopped, or cannot reach "
            "them from where it runs (docs/adr/0023):"
        )
        for b in silent:
            print(f"  {b.group:<20} {b.note}")
    return 1 if fail_on_stale and failed else 0


def _due(n: dict[str, Any] | None) -> str:
    if n is None:
        return ""
    if n["overdue"]:
        return f"OVERDUE since {n['by']}"
    return f"{n['usual'][5:]} / {n['by'][5:]}"
