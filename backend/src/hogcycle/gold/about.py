"""What each series is, for a reader, from config/about.yaml.

Descriptions travel in the contract in both languages for the same reason
names do (ADR-0014): the caliber lives in them, and a frontend copy would be
free to drift from what the backend collects. Every series on the wall needs
one, so a missing entry fails the export instead of shipping a page that
says nothing about its own number.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

DEFAULT_ABOUT = "config/about.yaml"

_LANGS = ("zh", "en")


def load_about(
    path: Path | str = DEFAULT_ABOUT, *, ids: list[str]
) -> dict[str, dict[str, Any]]:
    """id -> {publisher_zh, publisher_en, url, about_zh, about_en}."""
    raw = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    series = (raw or {}).get("series") or {}

    missing = sorted(set(ids) - set(series))
    if missing:
        raise ValueError(f"{path}: no entry for {missing}; every series needs one")
    unknown = sorted(set(series) - set(ids))
    if unknown:
        raise ValueError(f"{path}: entries for unknown series {unknown}")

    out: dict[str, dict[str, Any]] = {}
    for sid, entry in series.items():
        for field in ("publisher", "about"):
            text = (entry or {}).get(field) or {}
            empty = [lang for lang in _LANGS if not str(text.get(lang) or "").strip()]
            if empty:
                raise ValueError(f"{path}: {sid}.{field} has no text for {empty}")
        url = entry.get("url")
        if url is not None and not str(url).startswith("https://"):
            raise ValueError(f"{path}: {sid}.url must be https:// or null, got {url!r}")
        out[sid] = {
            "publisher_zh": entry["publisher"]["zh"].strip(),
            "publisher_en": entry["publisher"]["en"].strip(),
            "url": url,
            "about_zh": " ".join(entry["about"]["zh"].split()),
            "about_en": " ".join(entry["about"]["en"].split()),
        }
    return out
