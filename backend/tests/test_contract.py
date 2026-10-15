"""The export is checked against the schema itself, and says which shape it is.

The earlier hand-written check covered required keys and point order, so
each failure below would have reached the page (docs/adr/0024).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from hogcycle.export.contract import ContractError, contract_version, write_contract

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = ROOT / "contracts" / "wall.schema.json"


def payload(**panel_overrides) -> dict:
    panel = {
        "id": "sow_inventory",
        "name_zh": "能繁母猪存栏",
        "name_en": "Breeding sow inventory",
        "tier": "capacity",
        "unit": "万头",
        "about": None,
        "revisions": [],
        "points": [{"d": "2026-03-31", "v": 3904.0, "g": "Q"}],
        **panel_overrides,
    }
    return {
        "generated_at": "2026-10-15T00:00:00+00:00",
        "window": {"start": "2015-01-01", "end": "2026-10-15"},
        "panels": [panel],
        "readings": [],
    }


def write(tmp_path, data) -> dict:
    out = write_contract(data, tmp_path / "wall.json", schema_path=SCHEMA)
    return json.loads(out.read_text(encoding="utf-8"))


def test_the_version_is_declared_once_in_the_schema_and_is_semver():
    version = contract_version(json.loads(SCHEMA.read_text(encoding="utf-8")))
    assert re.fullmatch(r"\d+\.\d+\.\d+", version)


def test_the_export_is_stamped_with_the_schema_version(tmp_path):
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    assert write(tmp_path, payload())["contract_version"] == contract_version(schema)


def test_a_misspelled_tier_fails_and_names_where(tmp_path):
    with pytest.raises(ContractError, match=r"panels/0/tier: 'capactiy' is not one of"):
        write(tmp_path, payload(tier="capactiy"))


def test_a_value_exported_as_text_fails(tmp_path):
    bad = [{"d": "2026-03-31", "v": "3904", "g": "Q"}]
    with pytest.raises(ContractError, match=r"panels/0/points/0/v"):
        write(tmp_path, payload(points=bad))


def test_a_field_the_schema_does_not_know_fails(tmp_path):
    with pytest.raises(ContractError, match="Additional properties"):
        write(tmp_path, payload(caliber="统计局"))


def test_order_and_emptiness_are_still_checked_by_hand(tmp_path):
    with pytest.raises(ContractError, match="no points"):
        write(tmp_path, payload(points=[]))
    backwards = [
        {"d": "2026-06-30", "v": 3780.0, "g": "Q"},
        {"d": "2026-03-31", "v": 3904.0, "g": "Q"},
    ]
    with pytest.raises(ContractError, match="not ordered"):
        write(tmp_path, payload(points=backwards))
