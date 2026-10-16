"""Failures say which kind they are, and only a transient one is retried
(docs/adr/0028)."""

from __future__ import annotations

from pathlib import Path

import pytest
import requests

from hogcycle.collectors import moa, moa_weekly
from hogcycle.collectors.base import with_retry
from hogcycle.collectors.failures import (
    BLOCKED,
    STRUCTURE,
    TRANSIENT,
    CollectFailure,
    classify,
    worst,
)
from hogcycle.registry.loader import load_registry

CONFIG = Path(__file__).resolve().parents[2] / "config" / "sources.yaml"


def response(code: int) -> requests.Response:
    r = requests.Response()
    r.status_code = code
    r.url = "https://example.invalid/"
    r._content = b""
    return r


def http_error(code: int) -> requests.HTTPError:
    return requests.HTTPError(f"HTTP {code}", response=response(code))


@pytest.mark.parametrize(
    ("exc", "kind"),
    [
        (http_error(403), BLOCKED),
        (http_error(412), BLOCKED),  # 海关's challenge
        (http_error(451), BLOCKED),
        (http_error(429), TRANSIENT),
        (http_error(503), TRANSIENT),
        (http_error(404), STRUCTURE),
        (requests.ConnectionError("reset"), TRANSIENT),
        (requests.Timeout("slow"), TRANSIENT),
        (TimeoutError("timed out"), TRANSIENT),  # socket.timeout
        (KeyError("no value column"), STRUCTURE),
        (ValueError("out of range"), STRUCTURE),
    ],
)
def test_each_failure_has_a_class(exc, kind):
    assert classify(exc) == kind


def test_the_class_is_read_through_the_chain():
    try:
        try:
            raise http_error(403)
        except requests.HTTPError as inner:
            raise RuntimeError("upstream failed") from inner
    except RuntimeError as outer:
        assert classify(outer) == BLOCKED


def test_a_refusal_is_asked_once_and_a_hiccup_three_times():
    calls = {"blocked": 0, "transient": 0}

    def refused():
        calls["blocked"] += 1
        raise http_error(403)

    def flaky():
        calls["transient"] += 1
        raise requests.ConnectionError("reset")

    with pytest.raises(CollectFailure) as blocked:
        with_retry(refused, base_delay=0)
    with pytest.raises(CollectFailure) as transient:
        with_retry(flaky, base_delay=0)
    assert calls == {"blocked": 1, "transient": 3}
    assert blocked.value.kind == BLOCKED and transient.value.kind == TRANSIENT


def test_worst_prefers_a_refusal_then_a_hiccup():
    assert worst([STRUCTURE, BLOCKED, TRANSIENT]) == BLOCKED
    assert worst([STRUCTURE, TRANSIENT]) == TRANSIENT
    assert worst([STRUCTURE]) == STRUCTURE
    assert worst([]) == STRUCTURE


class Session:
    """Answers every request with one status, counting the asks."""

    def __init__(self, code: int) -> None:
        self.code = code
        self.calls = 0
        self.headers: dict[str, str] = {}

    def get(self, url: str, timeout: int) -> requests.Response:
        self.calls += 1
        return response(self.code)


@pytest.fixture
def quick(monkeypatch):
    monkeypatch.setattr(moa, "_MIN_INTERVAL_S", 0)
    monkeypatch.setattr(moa_weekly, "_MIN_INTERVAL_S", 0)


def test_a_window_of_refused_editions_is_blocked_not_structure(monkeypatch, quick):
    session = Session(403)
    monkeypatch.setattr(requests, "Session", lambda: session)
    spec = load_registry(CONFIG)["sow_inventory"]
    with pytest.raises(moa.MoaFetchError) as err:
        moa.MoaAdapter(months_back=3).fetch(spec)
    assert err.value.kind == BLOCKED
    assert session.calls == 3  # one per month, none repeated


def test_the_weekly_list_page_is_not_asked_again_after_a_refusal(monkeypatch, quick):
    session = Session(403)
    with pytest.raises(requests.HTTPError):
        moa_weekly._get(session, moa_weekly.BASE)
    assert session.calls == 1
