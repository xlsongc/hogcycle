"""The Atom feeds and the series index written beside the CSVs."""

from __future__ import annotations

import json
import xml.etree.ElementTree as ET

from hogcycle.export.feeds import atom, write_feeds, write_index

NS = {"a": "http://www.w3.org/2005/Atom"}


def reading(
    id: str, obs: str, value: float | None, published: str | None, first_seen: str
) -> dict:
    return {
        "id": id, "name_zh": f"{id}中", "name_en": f"{id} en", "unit": "万头",
        "obs_date": obs, "value": value, "published_on": published,
        "first_seen": first_seen,
    }


PAYLOAD = {
    "contract_version": "1.6.0",
    "generated_at": "2026-10-20T08:00:00+00:00",
    "panels": [
        {"id": "sow_inventory", "name_zh": "能繁母猪存栏", "name_en": "Sows",
         "tier": "capacity", "unit": "万头", "freq": "monthly", "in_wall": True},
    ],
    "readings": [
        reading("sow_inventory", "2026-06-30", 3780.0, "2026-07-23", "2026-09-05"),
        reading("hog_price_index", "2026-10-19", 10.03, None, "2026-10-20"),
        reading("empty", "2026-10-19", None, None, "2026-10-20"),
    ],
}


def test_the_feed_is_atom_newest_first_dated_by_when_each_became_public():
    root = ET.fromstring(atom(PAYLOAD, "en"))
    entries = root.findall("a:entry", NS)
    assert [e.findtext("a:updated", namespaces=NS) for e in entries] == [
        "2026-10-20T00:00:00Z",  # undated: the day this warehouse learned it
        "2026-07-23T00:00:00Z",  # dated: its release, not the day we fetched it
    ]
    first = entries[1]
    title = first.findtext("a:title", namespaces=NS)
    assert title == "sow_inventory en: 3,780 万头 (2026-06-30)"
    assert first.find("a:link", NS).get("href").endswith("/series/sow_inventory/")
    # A new period is a new entry: the id carries the period.
    entry_id = first.findtext("a:id", namespaces=NS)
    assert entry_id.endswith("/series/sow_inventory/#2026-06-30")


def test_the_chinese_feed_is_its_own_document(tmp_path):
    en, zh = write_feeds(PAYLOAD, tmp_path)
    assert en == tmp_path / "feed.xml" and zh == tmp_path / "zh" / "feed.xml"
    root = ET.fromstring(zh.read_text("utf-8"))
    assert "猪周期" in root.findtext("a:title", namespaces=NS)
    assert "发布" in root.find("a:entry", NS).findtext("a:summary", namespaces=NS)


def test_the_index_points_at_each_series_files(tmp_path):
    doc = json.loads(write_index(PAYLOAD, tmp_path).read_text("utf-8"))
    (s,) = doc["series"]
    assert s["csv"] == "data/series/sow_inventory.csv"
    assert s["json"] == "data/series/sow_inventory.json"
    assert s["latest"] == {
        "obs_date": "2026-06-30", "value": 3780.0, "published_on": "2026-07-23"
    }
    assert doc["contract_version"] == "1.6.0"
