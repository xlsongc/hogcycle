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

import datetime as dt
from dataclasses import dataclass, field
from typing import Any, Literal

from ..contracts.schema import GRANULARITIES

Tier = Literal["capacity", "margin", "price", "noise", "equity"]

# The causal chain, in order:
#   capacity  能繁母猪、仔猪价 → (10-12m) → 出栏     the real leading indicator
#   margin    price - cost；decides whether a capacity move persists
#   price     the outcome being predicted, not a driver
#   noise     short-run supply disturbance; moves equities, not the cycle
#
# equity sits outside that chain on purpose. A share price is not a link in
# the physical cycle, it is a claim on it — so it stays out of the causal
# wall (`in_wall` is False) and lives in the overlay, where the question it
# actually answers is whether the market leads or lags 能繁母猪.
TIERS: tuple[str, ...] = ("capacity", "margin", "price", "noise", "equity")

REACHES: tuple[str, ...] = ("anywhere", "cn")


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
    # Other exact spellings the publisher used for the same figure in the
    # same report, each seen in a real issue (docs/adr/0027). Listed, never a
    # pattern: a pattern would also claim spellings nobody has seen.
    also: tuple[str, ...] = ()

    @property
    def names(self) -> tuple[str, ...]:
        return (self.value, *self.also)


# The longest a person may quiet the guard in one go. Renewing is allowed, but
# it is a commit that edits `review_by`, which is a decision someone has to
# make and can be asked about. An acknowledgement without a horizon is how a
# known outage turns back into an unknown one.
MAX_ACK_DAYS = 92


@dataclass(frozen=True, slots=True)
class UpstreamDark:
    """A human has seen this series stop and taken ownership of the fix.

    This is the third state between live and retired. The caliber still
    exists, but the source we reach has stopped carrying it, and the
    primary-source replacement has not been built yet. The guard keeps
    reporting the series every run; it only stops *failing* the run, and only
    until `review_by`. After that the alarm comes back by itself.
    """

    acknowledged: dt.date
    review_by: dt.date
    reason: str

    def __post_init__(self) -> None:
        if not self.reason.strip():
            raise ValueError(
                "upstream_dark.reason is required: say what broke and what replaces it"
            )
        span = (self.review_by - self.acknowledged).days
        if span <= 0:
            raise ValueError(
                f"upstream_dark.review_by {self.review_by} must be after "
                f"acknowledged {self.acknowledged}"
            )
        if span > MAX_ACK_DAYS:
            raise ValueError(
                f"upstream_dark spans {span} days ({self.acknowledged} → "
                f"{self.review_by}); the limit is {MAX_ACK_DAYS}. Renew it when "
                "it lapses instead of setting a horizon nobody will reach."
            )


@dataclass(frozen=True, slots=True)
class IndicatorSpec:
    id: str
    # Both names are required. An indicator that reaches the wall without an
    # English name would render its Chinese one on the English page, which is
    # the kind of failure that looks like a rendering glitch and is actually a
    # missing definition.
    name_zh: str
    name_en: str
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
    # Staleness limit in days, when the series' real publication cadence
    # differs from its declared `freq` — 能繁母猪存栏 is a monthly series whose
    # public cadence went quarterly at the end of 2025. Default: see
    # staleness.DEFAULT_MAX_AGE_DAYS.
    max_age_days: int | None = None
    # Upstream has stopped publishing this series and never will again, because
    # a survey's caliber changed and the old caliber was closed rather than
    # revised. The history stays — it is the only record of that caliber — but
    # absence stops being an error: it is neither a failed collection nor a
    # stale one, and it does not belong on a wall that reads as current.
    retired: bool = False
    # The caliber is alive but the source we reach went dark, and someone has
    # acknowledged it with a deadline. See UpstreamDark.
    upstream_dark: UpstreamDark | None = None
    # The obs_dates this indicator's caliber covers, when a source's history
    # runs across a caliber change. 白条肉出厂价 averaged 规模以上 plants until
    # the week of 2024-01-01 and every designated plant after it; the mirror
    # served both as one table. Each caliber is its own indicator, and these
    # bounds say which stretch of a shared history belongs to which. Rows
    # outside are another indicator's, so they are left out at ingest and at
    # read rather than being an error.
    caliber_from: dt.date | None = None
    caliber_until: dt.date | None = None
    # The indicator whose earlier caliber this one continues: two indicators,
    # never one line, but a reader at the seam should be told where the
    # earlier history is (ADR-0026). Checked against the registry at load.
    continues: str | None = None
    # A source's projection rather than a measurement: its obs_dates may lie
    # in the future and its releases precede the periods they describe. Kept
    # off the wall, whose every panel reads as "what happened", and out of the
    # window's end, which would otherwise run the whole wall into next year.
    forecast: bool = False
    # Where the collector has to run to reach the source. "cn" hosts refuse
    # or time out on datacenter addresses — 农业农村部 answered GitHub's
    # runners with 403 and 玄田 never answered at all on 2026-10-12, while
    # both served a residential connection — so they are collected from a
    # machine on an ordinary network, and the GitHub run collects the rest
    # and watches everything for staleness (ADR-0022).
    reach: str = "anywhere"
    # Each value is a running total from 1 January to its obs_date, as the
    # publisher prints it (统计局's 1季度 / 上半年 / 前3季度 / 全年). A sawtooth
    # that resets every January reads as a cycle on a chart, so it stays off
    # the wall; gold differences it into quarters (docs/adr/0030).
    ytd: bool = False
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
        if self.max_age_days is not None and self.max_age_days < 1:
            raise ValueError(f"{self.id}: max_age_days must be >= 1")
        if (
            self.caliber_from is not None
            and self.caliber_until is not None
            and self.caliber_from > self.caliber_until
        ):
            raise ValueError(f"{self.id}: caliber_from is after caliber_until")
        if self.continues == self.id:
            raise ValueError(f"{self.id}: continues itself")
        if self.reach not in REACHES:
            raise ValueError(f"{self.id}: reach {self.reach!r} must be one of {REACHES}")
        if self.retired and self.upstream_dark is not None:
            raise ValueError(
                f"{self.id}: retired and upstream_dark contradict each other — "
                "a closed caliber has nothing left to wait for"
            )

    def covers(self, obs_date: dt.date) -> bool:
        """Whether an observation of this date belongs to this caliber."""
        if self.caliber_from is not None and obs_date < self.caliber_from:
            return False
        return self.caliber_until is None or obs_date <= self.caliber_until

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
