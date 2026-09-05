"""The typed shape of one indicator. `config/sources.yaml` is its only author.

Adding a series stays a config change, not a code change — but the config has
to be able to describe upstream as it actually is, which includes wide tables
and Chinese period labels. Two escape hatches carry that weight:

    extract   which column is the period, which is the value
    accept    which granularities may enter silver

Both default to the common case, so a well-behaved narrow date/value series
still needs neither.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from ..contracts.schema import GRANULARITIES

Tier = Literal["capacity", "margin", "price", "noise"]

# The causal chain, in order:
#   capacity  能繁母猪、仔猪价 → (10-12m) → 出栏     the real leading indicator
#   margin    price - cost；decides whether a capacity move persists
#   price     the outcome being predicted, not a driver
#   noise     short-run supply disturbance; moves equities, not the cycle
TIERS: tuple[str, ...] = ("capacity", "margin", "price", "noise")


@dataclass(frozen=True, slots=True)
class Extract:
    """Where in the payload the period and the value live.

    The defaults are akshare's actual convention for narrow frames, not a
    fuzzy guess list. When a source departs from it — a wide table like
    `futures_hog_supply(symbol=生猪产能)` — the config must say so, and the
    failure when it doesn't is a loud KeyError naming the columns it saw.
    """

    period: str = "date"
    value: str = "value"


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
    extract: Extract = field(default_factory=Extract)
    accept: tuple[str, ...] | None = None
    revises: bool = False
    zero_is_null: bool = False
    notes: str = ""

    def __post_init__(self) -> None:
        if self.tier not in TIERS:
            raise ValueError(f"{self.id}: unknown tier {self.tier!r}; expected {TIERS}")
        if self.freq not in GRANULARITIES:
            raise ValueError(
                f"{self.id}: freq {self.freq!r} must be one of {GRANULARITIES}"
            )
        if self.lo >= self.hi:
            raise ValueError(f"{self.id}: lo must be < hi")
        if self.accept is not None:
            unknown = set(self.accept) - set(GRANULARITIES)
            if unknown:
                raise ValueError(f"{self.id}: unknown granularity in accept: {unknown}")

    @property
    def call_key(self) -> str:
        """Identity of the upstream call. Two indicators reading different
        columns of one wide table share a call_key, so the pipeline fetches
        it once per run instead of hitting the endpoint per indicator."""
        args = ":".join(f"{k}={v}" for k, v in sorted(self.call.items()))
        return f"{self.adapter}:{args}"

    @property
    def source(self) -> str:
        """Stable provenance string carried on every row."""
        args = ":".join(str(v) for v in self.call.values())
        base = f"{self.adapter}:{args}"
        # Only wide-table extractions need the column to be unambiguous.
        return base if self.extract.value == "value" else f"{base}:{self.extract.value}"


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
