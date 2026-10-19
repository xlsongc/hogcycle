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
from .failures import TRANSIENT, CollectFailure, classify


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


def request_key(adapter: Adapter, spec: IndicatorSpec) -> str:
    """Which upstream request a fetch makes, so the pipeline asks it once per
    run. Usually the spec's `call`; an adapter whose `call` also carries what
    to read out of one shared response says so with its own `request_key`.
    """
    own = getattr(adapter, "request_key", None)
    return own(spec) if own is not None else spec.call_key


def with_retry(
    fn: Callable[[], Any], *, attempts: int = 3, base_delay: float = 2.0
) -> Any:
    """Upstream is a free endpoint behind a CDN; it flakes. Retry what can
    pass, then give up loudly — a failed collection is fine, a silently empty
    one is not.

    Only a transient failure is retried (docs/adr/0028). A host that refuses
    this network will refuse it again in four seconds, and asking is rude; a
    payload we do not understand will not change either.
    """
    last: Exception | None = None
    for i in range(attempts):
        try:
            return fn()
        except Exception as exc:
            kind = classify(exc)
            if kind != TRANSIENT:
                raise CollectFailure(kind, f"{type(exc).__name__}: {exc}") from exc
            last = exc
            if i < attempts - 1:
                time.sleep(base_delay * (2**i))
    # Carry the reason forward. `__cause__` is set for a traceback, but the
    # CLI and the workflow log only ever print str(exc).
    raise CollectFailure(
        TRANSIENT,
        f"upstream failed after {attempts} attempts: {type(last).__name__}: {last}",
    ) from last
