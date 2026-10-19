"""What a payload looks like, and what changed since the last one.

A renamed column, a 指标 that vanished from the workbook or a figure the
weekly report stopped printing used to surface as a parse error: loud, which
is right, but saying only that a name was missing. The question a person
asks next is "since when, and what is there instead?", and bronze already
holds the answer in the snapshot before. So each adapter says what names its
payload carries (`shape`), the pipeline compares them with the previous
snapshot before parsing, and the drift travels with the run: a warning when
the parse still succeeds, part of the error when it does not
(docs/adr/0032).

Names are compared, never values or row counts: a value moves every day,
and a window of editions gains and loses rows as it slides.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from typing import Any

from ..storage.bronze import BronzeStore

# A drift description names at most this many of each side; a payload that
# changed wholesale says so without printing all of it.
_SHOWN = 8


@dataclass(frozen=True, slots=True)
class Drift:
    since: str
    appeared: tuple[str, ...]
    vanished: tuple[str, ...]

    def describe(self) -> str:
        parts = []
        if self.vanished:
            parts.append(f"gone {_names(self.vanished)}")
        if self.appeared:
            parts.append(f"new {_names(self.appeared)}")
        changed = "; ".join(parts)
        return f"payload shape changed since the snapshot of {self.since}: {changed}"


def _names(names: tuple[str, ...]) -> str:
    shown = ", ".join(names[:_SHOWN])
    more = f" and {len(names) - _SHOWN} more" if len(names) > _SHOWN else ""
    return f"[{shown}{more}]"


def drift_since_last(
    adapter: Any,
    bronze: BronzeStore,
    indicator: str,
    source: str,
    snapshot_id: str,
    payload: Any,
) -> Drift | None:
    """The names this payload gained and lost against the newest earlier
    snapshot of the same source. None when the adapter declares no shape,
    there is no earlier snapshot, or nothing changed."""
    shape = getattr(adapter, "shape", None)
    if shape is None:
        return None
    previous = next(
        (
            e
            for e in reversed(bronze.history(indicator))
            if e["snapshot_id"] != snapshot_id and e["source"] == source
        ),
        None,
    )
    if previous is None:
        return None
    before = shape(bronze.read(indicator, previous["snapshot_id"]))
    now = shape(payload)
    if before == now:
        return None
    since = dt.datetime.fromisoformat(previous["fetched_at"]).date().isoformat()
    return Drift(since, tuple(sorted(now - before)), tuple(sorted(before - now)))
