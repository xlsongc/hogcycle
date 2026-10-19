"""The run log: one line per `collect` per reach, saying what each indicator
did and, when it failed, which kind of failure it was (docs/adr/0028).

Bronze proves a host was reached; it cannot say one was not, because a failed
fetch writes nothing. So when a source group goes quiet (ADR-0023), bronze
alone cannot tell "the collector ran and was refused" from "the collector
never ran". This can. It explains a silence and never stands in for one:
liveness is still read from bronze.

    data/runs/<reach>/<yyyy-mm>.jsonl     append-only, committed with the data

The GitHub run and the local collector write different reaches, so they
never touch the same file.
"""

from __future__ import annotations

import datetime as dt
import json
import os
from collections.abc import Iterable
from pathlib import Path
from typing import Any

# Long enough to name what failed, short enough that a month of runs stays a
# file someone can read.
_ERROR_CHARS = 240


def where() -> str:
    """Where this run happened: the kind of host, never its name."""
    return "github" if os.environ.get("GITHUB_ACTIONS") == "true" else "local"


class RunLog:
    def __init__(self, root: Path | str = "data/runs") -> None:
        self.root = Path(root)

    def append(
        self,
        reach: str,
        *,
        started: dt.datetime,
        finished: dt.datetime,
        results: Iterable[Any],
        host: str | None = None,
    ) -> Path:
        """One line for one reach's part of a run. `results` are pipeline
        Results; read by attribute so this module does not import the
        pipeline."""
        path = self.root / reach / f"{started:%Y-%m}.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        line = {
            "started": started.isoformat(),
            "finished": finished.isoformat(),
            "where": host or where(),
            "reach": reach,
            "results": [
                {
                    "indicator": r.indicator,
                    "ok": r.ok,
                    "rows": r.rows_written,
                    "kind": r.kind,
                    "error": None if r.error is None else r.error[:_ERROR_CHARS],
                    # Only when the payload changed shape (ADR-0032).
                    **(
                        {"drift": r.drift[:_ERROR_CHARS]}
                        if getattr(r, "drift", None)
                        else {}
                    ),
                }
                for r in results
            ],
        }
        with path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(line, ensure_ascii=False) + "\n")
        return path

    def latest(self, reach: str) -> dict[str, Any] | None:
        """The newest run recorded for a reach, or None if it has none."""
        files = sorted((self.root / reach).glob("*.jsonl"))
        for path in reversed(files):
            lines = [x for x in path.read_text("utf-8").splitlines() if x.strip()]
            if lines:
                return max((json.loads(x) for x in lines), key=lambda r: r["started"])
        return None


def summary(run: dict[str, Any] | None, indicators: set[str] | None = None) -> str:
    """One phrase for a run, or its part touching `indicators`: when, where,
    and the failures by class. What a person needs beside a silent group."""
    if run is None:
        return "no run on record"
    results = [
        r for r in run["results"] if indicators is None or r["indicator"] in indicators
    ]
    failed = [r for r in results if not r["ok"]]
    when = f"{run['started'][:16].replace('T', ' ')} {run['where']}"
    if not results:
        return f"{when}: not in this run"
    if not failed:
        return f"{when}: {len(results)}/{len(results)} ok"
    kinds: dict[str, int] = {}
    for r in failed:
        kinds[r["kind"] or "unknown"] = kinds.get(r["kind"] or "unknown", 0) + 1
    detail = ", ".join(f"{k} ×{n}" for k, n in sorted(kinds.items()))
    return f"{when}: {len(results) - len(failed)}/{len(results)} ok, {detail}"
