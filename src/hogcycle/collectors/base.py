"""Collector = fetch (impure, network) + normalise (pure, testable).

The split matters more than it looks. Because normalise() never touches the
network, every parser bug is reproducible from a bronze blob and fixable
without a single HTTP request — which is also why bronze is immutable.
"""

from __future__ import annotations

import datetime as dt
import time
from typing import Any, Callable, Protocol

from ..registry import IndicatorSpec
from ..schema import Observation


class Adapter(Protocol):
    def fetch(self, spec: IndicatorSpec) -> Any:
        """Return the raw upstream payload, unmodified."""

    def normalise(
        self, spec: IndicatorSpec, payload: Any, *, snapshot_id: str, fetched_at: dt.datetime
    ) -> list[Observation]:
        """Pure: payload -> observations. No IO, no clock, no globals."""


def with_retry(
    fn: Callable[[], Any], *, attempts: int = 3, base_delay: float = 2.0
) -> Any:
    """Upstream is a free endpoint behind a CDN; it flakes. Retry, then give up
    loudly — a failed collection is fine, a silently empty one is not."""
    last: Exception | None = None
    for i in range(attempts):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 - deliberately broad at the edge
            last = exc
            if i < attempts - 1:
                time.sleep(base_delay * (2**i))
    raise RuntimeError(f"upstream failed after {attempts} attempts") from last
