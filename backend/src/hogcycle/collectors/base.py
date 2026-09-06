"""Collector = fetch (impure, network) + normalise (pure, testable).

The split matters more than it looks. Because normalise() never touches the
network, every parser bug is reproducible from a bronze blob and fixable
without a single HTTP request — which is also why bronze is immutable.
"""

from __future__ import annotations

import datetime as dt
import time
from collections.abc import Callable
from typing import Any, Protocol

from ..contracts.schema import Observation
from ..registry.spec import IndicatorSpec


class Adapter(Protocol):
    def fetch(self, spec: IndicatorSpec) -> Any:
        """Return the raw upstream payload, unmodified."""

    def normalise(
        self,
        spec: IndicatorSpec,
        payload: Any,
        *,
        snapshot_id: str,
        fetched_at: dt.datetime,
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
        except Exception as exc:
            last = exc
            if i < attempts - 1:
                time.sleep(base_delay * (2**i))
    # Carry the reason forward. `__cause__` is set for a traceback, but the
    # CLI and the workflow log only ever print str(exc) — and "upstream failed
    # after 3 attempts" cannot distinguish a flaky endpoint from a host that
    # blocks datacenter IPs outright.
    raise RuntimeError(
        f"upstream failed after {attempts} attempts: {type(last).__name__}: {last}"
    ) from last
