"""`hogcycle status`: is every series alive, and is anyone still collecting?

Two different failures, two different clocks. A series is stale when its
publisher has not moved on within the series' own cadence (staleness.py). A
collector is silent when nothing of a source group has been fetched within
hours (heartbeat.py). Either fails `--fail-on-stale`, because either one,
left alone, is the eleven-month freeze this project was built after.
"""

from __future__ import annotations

import json

from ..registry.heartbeat import check_groups
from ..registry.spec import Registry
from ..registry.staleness import check_all
from ..storage.bronze import BronzeStore
from ..storage.silver import SilverStore


def run_status(
    registry: Registry,
    silver: SilverStore,
    bronze: BronzeStore,
    *,
    as_json: bool,
    fail_on_stale: bool,
) -> int:
    rows = {r["indicator"]: r for r in silver.coverage()}
    latest = {k: v["latest"] for k, v in rows.items() if v["latest"]}
    ages = {s.indicator: s for s in check_all(registry, latest)}
    failing = [s for s in ages.values() if s.failing]
    beats = check_groups(registry, bronze)
    silent = [b for b in beats if b.failing]
    failed = bool(failing or silent)

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
                "retired": st.retired,
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
            }))
        return 1 if fail_on_stale and failed else 0

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

    print(f"\n{'source group':<20} {'last fetched (UTC)':<20} {'age':<20} via")
    for b in beats:
        when = "—" if b.latest is None else f"{b.latest:%Y-%m-%d %H:%M}"
        print(f"{b.group:<20} {when:<20} {b.note:<20} {b.indicator or ''}")

    acked = [s for s in ages.values() if s.acknowledged]
    if acked:
        # Printed every run on purpose. Acknowledged is not resolved: the
        # number on the site is still old, and someone owes a fix.
        print(f"\n{len(acked)} series are dark upstream and acknowledged:")
        for s in acked:
            print(f"  {s.indicator:<20} latest {s.latest}  review by {s.review_by}")
    resumed = [s for s in ages.values() if s.resumed]
    if resumed:
        print("\nAdvancing again but still marked upstream_dark — remove the mark:")
        for s in resumed:
            print(f"  {s.indicator:<20} latest {s.latest}")

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
