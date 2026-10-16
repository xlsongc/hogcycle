"""The run log: what each collect did, failures by class (docs/adr/0028)."""

from __future__ import annotations

import datetime as dt
import json

from hogcycle.pipeline import Result
from hogcycle.storage.runs import RunLog, summary

T = dt.datetime(2026, 10, 16, 7, 30, tzinfo=dt.UTC)


def results():
    return [
        Result("sow_inventory", True, 1, True),
        Result("piglet_price", False, 0, False, "HTTPError: 403 Forbidden", "blocked"),
        Result("carcass_price", False, 0, False, "HTTPError: 403 Forbidden", "blocked"),
        Result("corn_price", False, 0, False, "upstream failed after 3", "transient"),
    ]


def test_a_run_is_one_appended_line_per_reach(tmp_path):
    log = RunLog(tmp_path)
    end = T + dt.timedelta(minutes=4)
    path = log.append("cn", started=T, finished=end, results=results(), host="local")
    later = T + dt.timedelta(days=1)
    log.append("cn", started=later, finished=later, results=[], host="local")
    assert path == tmp_path / "cn" / "2026-10.jsonl"
    lines = [json.loads(x) for x in path.read_text("utf-8").splitlines()]
    assert len(lines) == 2
    assert lines[0]["where"] == "local" and lines[0]["reach"] == "cn"
    assert lines[0]["results"][1] == {
        "indicator": "piglet_price",
        "ok": False,
        "rows": 0,
        "kind": "blocked",
        "error": "HTTPError: 403 Forbidden",
    }
    assert log.latest("cn")["started"] == (T + dt.timedelta(days=1)).isoformat()
    assert log.latest("anywhere") is None


def test_the_summary_says_why_a_group_went_quiet(tmp_path):
    log = RunLog(tmp_path)
    log.append("cn", started=T, finished=T, results=results(), host="local")
    run = log.latest("cn")
    assert summary(run) == "2026-10-16 07:30 local: 1/4 ok, blocked ×2, transient ×1"
    assert summary(run, {"sow_inventory"}) == "2026-10-16 07:30 local: 1/1 ok"
    assert summary(run, {"hog_weight"}) == "2026-10-16 07:30 local: not in this run"
    assert summary(None) == "no run on record"


def test_the_host_is_named_by_kind_never_by_name(monkeypatch, tmp_path):
    monkeypatch.setenv("GITHUB_ACTIONS", "true")
    path = RunLog(tmp_path).append("anywhere", started=T, finished=T, results=[])
    assert json.loads(path.read_text("utf-8"))["where"] == "github"


def test_collect_leaves_its_line_failures_and_all(monkeypatch, tmp_path):
    """Through the CLI: one indicator collected from a real payload, one
    refused. Both are in the line the run leaves behind."""
    from pathlib import Path

    from hogcycle.cli.main import main
    from hogcycle.collectors.failures import CollectFailure
    from hogcycle.collectors.moa import MoaAdapter
    from hogcycle.collectors.moa_weekly import MoaWeeklyAdapter

    fixtures = Path(__file__).parent / "fixtures"
    config = Path(__file__).resolve().parents[2] / "config" / "sources.yaml"
    payload = json.loads((fixtures / "moa_hog_release.json").read_text("utf-8"))

    def refused(self, spec):
        raise CollectFailure("blocked", "HTTPError: 403 Forbidden")

    monkeypatch.setattr(MoaAdapter, "fetch", lambda self, spec: payload)
    monkeypatch.setattr(MoaWeeklyAdapter, "fetch", refused)
    monkeypatch.chdir(tmp_path)
    main(["collect", "--config", str(config), "--indicator", "sow_inventory,piglet_price"])

    (path,) = (tmp_path / "data" / "runs" / "cn").glob("*.jsonl")
    (line,) = [json.loads(x) for x in path.read_text("utf-8").splitlines()]
    by_id = {r["indicator"]: r for r in line["results"]}
    assert by_id["sow_inventory"]["ok"] and by_id["sow_inventory"]["kind"] is None
    assert by_id["piglet_price"]["kind"] == "blocked"
