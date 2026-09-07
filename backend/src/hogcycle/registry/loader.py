"""YAML -> typed Registry. All shape errors surface here, at load time.

A bad config should fail before a single HTTP request is made, not halfway
through a collection run.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from .spec import Extract, IndicatorSpec, Registry

DEFAULT_CONFIG = "config/sources.yaml"

_KNOWN_KEYS = {
    "id", "name_zh", "name_en", "tier", "freq", "unit", "lo", "hi", "adapter",
    "call", "extract", "accept", "revises", "zero_is_null", "max_age_days",
    "retired", "notes",
}


def _build(entry: dict[str, Any]) -> IndicatorSpec:
    unknown = set(entry) - _KNOWN_KEYS
    if unknown:
        raise ValueError(
            f"{entry.get('id', '<no id>')}: unknown key(s) {sorted(unknown)}. "
            "A typo here would otherwise be silently ignored."
        )
    data = dict(entry)
    data["extract"] = Extract(**(data.get("extract") or {}))
    if (accept := data.get("accept")) is not None:
        data["accept"] = tuple(accept)
    return IndicatorSpec(**data)


def load_registry(path: Path | str = DEFAULT_CONFIG) -> Registry:
    raw = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    if not raw or "indicators" not in raw:
        raise ValueError(f"{path}: no 'indicators' key")

    specs: dict[str, IndicatorSpec] = {}
    for entry in raw["indicators"]:
        spec = _build(entry)
        if spec.id in specs:
            raise ValueError(f"duplicate indicator id {spec.id!r} in {path}")
        specs[spec.id] = spec
    return Registry(specs)
