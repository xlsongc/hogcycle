"""Export the gold payload as the frontend contract.

This is the only doorway between Python and TypeScript. The frontend never
reads parquet, never opens DuckDB, never hears of akshare — it consumes one
JSON document whose shape is pinned by `contracts/wall.schema.json`, and the
same schema generates its TypeScript types.

Phase 1 writes that document to a file the frontend imports at build time.
When an HTTP API arrives it serves this identical shape at the same path, so
nothing on the frontend changes.

Every export is validated against the schema itself (docs/adr/0024). An
earlier hand-written check covered required keys only, so a misspelled tier
or a value exported as a string would have reached the page.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft7Validator

DEFAULT_OUT = "frontend/src/data/wall.json"
SCHEMA_PATH = "contracts/wall.schema.json"


class ContractError(Exception):
    """The payload does not match the published contract."""


def contract_version(schema: dict[str, Any]) -> str:
    """The version is declared once, as a const in the schema, and stamped
    from there; the type generator reads the same const."""
    return schema["properties"]["contract_version"]["const"]


def validate_contract(payload: dict[str, Any], schema: dict[str, Any]) -> None:
    errors = sorted(
        Draft7Validator(schema).iter_errors(payload),
        key=lambda e: [str(x) for x in e.absolute_path],
    )
    if errors:
        shown = "; ".join(
            f"{'/'.join(map(str, e.absolute_path)) or '<root>'}: {e.message}"
            for e in errors[:5]
        )
        more = f" (and {len(errors) - 5} more)" if len(errors) > 5 else ""
        raise ContractError(f"{len(errors)} schema violation(s): {shown}{more}")

    # What JSON Schema cannot say: a panel with nothing to draw, and order.
    for panel in payload["panels"]:
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
    payload = {"contract_version": contract_version(schema), **payload}
    validate_contract(payload, schema)

    path = Path(out)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    return path
