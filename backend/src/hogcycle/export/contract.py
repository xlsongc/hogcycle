"""Export the gold payload as the frontend contract.

This is the only doorway between Python and TypeScript. The frontend never
reads parquet, never opens DuckDB, never hears of akshare — it consumes one
JSON document whose shape is pinned by `contracts/wall.schema.json`, and the
same schema generates its TypeScript types.

Phase 1 writes that document to a file the frontend imports at build time.
When an HTTP API arrives it serves this identical shape at the same path, so
nothing on the frontend changes.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DEFAULT_OUT = "frontend/src/data/wall.json"
SCHEMA_PATH = "contracts/wall.schema.json"


class ContractError(Exception):
    """The payload does not match the published contract."""


def _check(payload: dict[str, Any], schema: dict[str, Any]) -> None:
    """Structural check against the published schema.

    Deliberately dependency-free: this validates the handful of invariants
    the frontend actually relies on, rather than pulling in a full JSON Schema
    engine for a document we generate ourselves.
    """
    for key in schema.get("required", []):
        if key not in payload:
            raise ContractError(f"missing required key {key!r}")

    panel_required = (
        schema["properties"]["panels"]["items"].get("required", [])
    )
    for panel in payload["panels"]:
        missing = [k for k in panel_required if k not in panel]
        if missing:
            raise ContractError(f"panel {panel.get('id')!r} missing {missing}")
        if not panel["points"]:
            raise ContractError(f"panel {panel['id']!r} has no points")
        dates = [p["d"] for p in panel["points"]]
        if dates != sorted(dates):
            raise ContractError(f"panel {panel['id']!r} points are not ordered by date")


def write_contract(
    payload: dict[str, Any],
    out: Path | str = DEFAULT_OUT,
    *,
    schema_path: Path | str = SCHEMA_PATH,
) -> Path:
    schema = json.loads(Path(schema_path).read_text(encoding="utf-8"))
    _check(payload, schema)

    path = Path(out)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    return path
