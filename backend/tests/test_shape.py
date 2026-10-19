"""A payload that changed shape says how, before it is parsed
(docs/adr/0032)."""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

from hogcycle.collectors.akshare import AkshareAdapter
from hogcycle.collectors.moa import MoaAdapter
from hogcycle.collectors.moa_weekly import MoaWeeklyAdapter
from hogcycle.pipeline import collect_one
from hogcycle.registry.spec import Extract, IndicatorSpec
from hogcycle.storage.bronze import BronzeStore
from hogcycle.storage.runs import RunLog
from hogcycle.storage.silver import SilverStore

FIXTURES = Path(__file__).parent / "fixtures"
UTC = dt.UTC

SPEC = IndicatorSpec(
    id="hog_price_index",
    name_zh="生猪成交均价",
    name_en="Average hog transaction price",
    tier="price",
    freq="weekly",
    unit="CNY/kg",
    lo=3.0,
    hi=60.0,
    adapter="akshare",
    call={"fn": "index_hog_spot_price"},
    extract=Extract(period="日期", value="成交均价"),
)


class Serves(AkshareAdapter):
    def __init__(self, columns, records):
        self.payload = {"columns": columns, "records": records}

    def fetch(self, spec):
        return self.payload


def collect(tmp_path, adapter, day):
    bronze, silver = BronzeStore(tmp_path / "b"), SilverStore(tmp_path / "s")
    at = dt.datetime(2026, 10, day, tzinfo=UTC)
    return collect_one(SPEC, adapter, bronze, silver, now=at)


def test_a_renamed_column_fails_as_drift_naming_both_names(tmp_path):
    before = Serves(["日期", "成交均价"], [{"日期": "2026-10-12", "成交均价": 11.2}])
    assert collect(tmp_path, before, 12).ok
    after = Serves(["日期", "均价"], [{"日期": "2026-10-19", "均价": 11.0}])
    result = collect(tmp_path, after, 19)
    assert not result.ok and result.kind == "structure"
    assert "成交均价" in (result.error or "")
    assert result.drift == (
        "payload shape changed since the snapshot of 2026-10-12: "
        "gone [成交均价]; new [均价]"
    )
    assert result.drift in (result.error or "")


def test_a_new_column_beside_the_old_ones_warns_and_collects(tmp_path):
    before = Serves(["日期", "成交均价"], [{"日期": "2026-10-12", "成交均价": 11.2}])
    collect(tmp_path, before, 12)
    row = {"日期": "2026-10-19", "成交均价": 11.0, "指数": 1.0}
    after = Serves(["日期", "成交均价", "指数"], [row])
    result = collect(tmp_path, after, 19)
    assert result.ok and result.rows_written == 1
    assert result.drift is not None and result.drift.endswith("new [指数]")

    path = RunLog(tmp_path / "runs").append(
        "anywhere", started=dt.datetime(2026, 10, 19, tzinfo=UTC),
        finished=dt.datetime(2026, 10, 19, tzinfo=UTC), results=[result],
    )
    (line,) = path.read_text("utf-8").splitlines()
    assert json.loads(line)["results"][0]["drift"] == result.drift


def test_the_same_shape_says_nothing(tmp_path):
    for day, value in ((12, 11.2), (19, 11.0)):
        row = {"日期": f"2026-10-{day}", "成交均价": value}
        adapter = Serves(["日期", "成交均价"], [row])
        result = collect(tmp_path, adapter, day)
    assert result.ok and result.drift is None


def test_the_ministry_payloads_name_what_they_print():
    release = json.loads((FIXTURES / "moa_hog_release.json").read_text("utf-8"))
    names = MoaAdapter().shape(release)
    assert {"能繁母猪存栏", "生猪定点屠宰企业屠宰量", "进口猪肉"} <= names
    # Year-to-date rows carry no period token, so they are no name here.
    assert not any("累计" in n for n in names)

    weekly = json.loads((FIXTURES / "moa_weekly.json").read_text("utf-8"))["market"]
    figures = MoaWeeklyAdapter().shape(weekly)
    assert {"全国仔猪平均价格", "全国生猪平均价格", "全国玉米平均价格"} <= figures
    # A week-on-week change is printed in 元/公斤 too; it is not a figure.
    assert not any(n.startswith(("比", "较")) for n in figures)
