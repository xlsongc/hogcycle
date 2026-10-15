"""One CSV per series, for readers who want the numbers rather than a chart.

Written next to the static site at export time, so each series page can link
a file a spreadsheet opens directly. The rows are the ones the wall draws —
same caliber bounds, same derived series, same mirror copies left out
(gold/series.py) — but at full resolution and full depth: the wall thins
daily equities to weekly and starts in 2015, a download should do neither.

The files are derived, like gold, so they are rebuilt on every export and
never committed.
"""

from __future__ import annotations

import csv
import datetime as dt
from pathlib import Path

from ..gold.series import all_specs, rows_of
from ..gold.vintage import learned_on
from ..registry.spec import Registry
from ..storage.silver import SilverStore

DEFAULT_DIR = "frontend/public/data/series"

# `learned` is the day this warehouse first held the value: for a source that
# does not date its releases, the only honest bound on when it was knowable
# (docs/adr/0025).
HEADER = ("obs_date", "value", "unit", "granularity", "published_on", "learned")


def write_series_csv(
    registry: Registry,
    silver: SilverStore,
    out_dir: Path | str = DEFAULT_DIR,
    *,
    moment: dt.datetime,
) -> int:
    """Write every series with data; returns how many files were written.
    Files for series that no longer exist are removed, so a renamed id does
    not leave a stale download behind."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.csv"):
        old.unlink()

    written = 0
    for spec in all_specs(registry):
        rows = rows_of(spec, silver, moment=moment)
        if not rows:
            continue
        with (out / f"{spec.id}.csv").open("w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(HEADER)
            for r in rows:
                released = r.get("published_on")
                w.writerow(
                    (
                        r["obs_date"].isoformat(),
                        "" if r["value"] is None else repr(r["value"]),
                        spec.unit,
                        r["granularity"],
                        "" if released is None else released.isoformat(),
                        learned_on(r),
                    )
                )
        written += 1
    return written
