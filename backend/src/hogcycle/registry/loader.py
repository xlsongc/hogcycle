"""YAML -> typed Registry. All shape errors surface here, at load time.

A bad config should fail before a single HTTP request is made, not halfway
through a collection run.
"""

from __future__ import annotations

import datetime as dt
from pathlib import Path
from typing import Any

import yaml

from .spec import Extract, IndicatorSpec, Registry, UpstreamDark

DEFAULT_CONFIG = "config/sources.yaml"

_KNOWN_KEYS = {
    "id", "name_zh", "name_en", "tier", "freq", "unit", "lo", "hi", "adapter",
    "call", "extract", "accept", "revises", "zero_is_null", "max_age_days",
    "retired", "upstream_dark", "notes",
}

_DARK_KEYS = {"acknowledged", "review_by", "reason"}


def _date(owner: str, key: str, raw: Any) -> dt.date:
    # YAML turns an unquoted 2026-12-31 into a date and a quoted one into a
    # string. Both are fine; anything else is a typo that must not load.
    if isinstance(raw, dt.date):
        return raw
    try:
        return dt.date.fromisoformat(str(raw))
    except ValueError:
        raise ValueError(
            f"{owner}: upstream_dark.{key} {raw!r} is not a YYYY-MM-DD date"
        ) from None


def _dark(owner: str, raw: Any) -> UpstreamDark:
    if not isinstance(raw, dict) or set(raw) != _DARK_KEYS:
        raise ValueError(
            f"{owner}: upstream_dark needs exactly {sorted(_DARK_KEYS)}, got {raw!r}"
        )
    return UpstreamDark(
        acknowledged=_date(owner, "acknowledged", raw["acknowledged"]),
        review_by=_date(owner, "review_by", raw["review_by"]),
        reason=str(raw["reason"]),
    )


def _build(entry: dict[str, Any]) -> IndicatorSpec:
    owner = entry.get("id", "<no id>")
    unknown = set(entry) - _KNOWN_KEYS
    if unknown:
        raise ValueError(
            f"{owner}: unknown key(s) {sorted(unknown)}. "
            "A typo here would otherwise be silently ignored."
        )
    data = dict(entry)
    data["extract"] = Extract(**(data.get("extract") or {}))
    if (accept := data.get("accept")) is not None:
        data["accept"] = tuple(accept)
    if (dark := data.get("upstream_dark")) is not None:
        data["upstream_dark"] = _dark(owner, dark)
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
