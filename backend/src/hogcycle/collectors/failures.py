"""What kind of failure this is, which decides whether to try again.

    transient   the network or the host hiccuped: a timeout, a reset, a 5xx,
                a 429. Retried with backoff.
    blocked     the host refuses this network: 401, 403, 407, 412, 451. Never
                retried; the refusal is a fact about where we ask from
                (ADR-0022), and asking again changes nothing but our manners.
    structure   an answer arrived and is not what we understand: a page gone
                (404, 410), a shape or a name that changed, a value out of
                range. Never retried; it needs a person.

docs/adr/0028.
"""

from __future__ import annotations

from collections.abc import Iterable

TRANSIENT = "transient"
BLOCKED = "blocked"
STRUCTURE = "structure"

BLOCKED_STATUS = frozenset({401, 403, 407, 412, 451})
TRANSIENT_STATUS = frozenset({408, 425, 429, 500, 502, 503, 504})

ADVICE = {
    BLOCKED: "this host refuses this network; see `reach` in config/sources.yaml",
    TRANSIENT: "the host or the network failed; retried with backoff",
    STRUCTURE: "the answer is not what the parser understands; needs a person",
}


class CollectFailure(RuntimeError):
    """A failure that already knows its class."""

    def __init__(self, kind: str, message: str) -> None:
        super().__init__(message)
        self.kind = kind


def of_status(code: int) -> str:
    if code in BLOCKED_STATUS:
        return BLOCKED
    if code in TRANSIENT_STATUS or code >= 500:
        return TRANSIENT
    return STRUCTURE


def classify(exc: BaseException) -> str:
    """The class of an exception, looking through the chain it was raised
    from: with_retry wraps the cause, and the cause is what happened."""
    import requests

    seen: set[int] = set()
    cur: BaseException | None = exc
    while cur is not None and id(cur) not in seen:
        seen.add(id(cur))
        if isinstance(cur, CollectFailure):
            return cur.kind
        if isinstance(cur, requests.HTTPError) and cur.response is not None:
            return of_status(cur.response.status_code)
        if isinstance(
            cur,
            (
                requests.ConnectionError,
                requests.Timeout,
                TimeoutError,  # socket.timeout too
                ConnectionError,
            ),
        ):
            return TRANSIENT
        cur = cur.__cause__ or cur.__context__
    return STRUCTURE


def worst(kinds: Iterable[str]) -> str:
    """The class of a fetch that gathered several pages and got none. One
    refusal means the host refuses us; failing that, one timeout means it is
    worth trying again; otherwise the pages are not where we think."""
    seen = set(kinds)
    if BLOCKED in seen:
        return BLOCKED
    if TRANSIENT in seen:
        return TRANSIENT
    return STRUCTURE
