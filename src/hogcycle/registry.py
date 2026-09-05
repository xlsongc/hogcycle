from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

import yaml

Tier = Literal["capacity", "margin", "noise"]


@dataclass(frozen=True, slots=True)
class IndicatorSpec:
    id: str
    name_zh: str
    tier: Tier
    freq: str
    unit: str
    lo: float
    hi: float
    adapter: str
    call: dict[str, Any]
    revises: bool = False
    notes: str = ""

    @property
    def source(self) -> str:
        """Stable provenance string carried on every row."""
        args = ":".join(str(v) for v in self.call.values())
        return f"{self.adapter}:{args}"


@dataclass(frozen=True, slots=True)
class Registry:
    indicators: dict[str, IndicatorSpec] = field(default_factory=dict)

    def __getitem__(self, key: str) -> IndicatorSpec:
        try:
            return self.indicators[key]
        except KeyError:
            raise KeyError(
                f"unknown indicator {key!r}; known: {sorted(self.indicators)}"
            ) from None

    def by_tier(self, tier: Tier) -> list[IndicatorSpec]:
        return [s for s in self.indicators.values() if s.tier == tier]

    def __iter__(self):
        return iter(self.indicators.values())

    def __len__(self) -> int:
        return len(self.indicators)


def load_registry(path: Path | str = "config/sources.yaml") -> Registry:
    raw = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    specs = {}
    for entry in raw["indicators"]:
        spec = IndicatorSpec(**entry)
        if spec.id in specs:
            raise ValueError(f"duplicate indicator id {spec.id!r} in {path}")
        if spec.lo >= spec.hi:
            raise ValueError(f"{spec.id}: lo must be < hi")
        specs[spec.id] = spec
    return Registry(specs)
