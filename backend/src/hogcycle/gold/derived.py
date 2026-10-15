"""Series gold derives from collected ones.

    hog_corn_ratio_county   生猪价格 ÷ 玉米价格, both from 农业农村部's 500-county
                            weekly report

The hog-to-corn ratio is the margin reading the cycle turns on, and the
official one — 发改委价格监测中心's weekly 猪粮比价 — has no machine-readable
primary source: it is published as an image, and the newest public issue is
for 2026-06-24 (config/sources.yaml, hog_corn_ratio). The 500-county report
prints both prices on the same collection day, so their quotient needs no
alignment across sources, no unit conversion and no guess about which day
pairs with which. That makes it a ratio this layer can compute honestly.

It is not the 发改委 number, and the name says so. Over the 230 weeks both
cover (2021-12 to 2026-08) the two move together — correlation 0.996 — but
this one sits 0.26 lower on average and up to 0.63 apart. That gap is why it
carries no threshold: the 5:1 and 6:1 lines are defined on the 发改委
caliber by 调控预案, and drawing them here would move every crossing by a
few weeks.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from typing import Any

from ..registry.spec import IndicatorSpec
from ..storage.silver import SilverStore


@dataclass(frozen=True, slots=True)
class Ratio:
    spec: IndicatorSpec
    num: str
    den: str

    def rows(self, silver: SilverStore, moment: dt.datetime) -> list[dict[str, Any]]:
        """One row per date both inputs hold. Exact dates only: the inputs
        are two lines of one article, so a date on one side without the
        other is a parse gap to see, not something to bridge."""
        num = {r["obs_date"]: r for r in silver.series(self.num, moment=moment)}
        den = {r["obs_date"]: r for r in silver.series(self.den, moment=moment)}
        out: list[dict[str, Any]] = []
        for d in sorted(num.keys() & den.keys()):
            a, b = num[d], den[d]
            if a["value"] is None or not b["value"]:
                continue
            released = [p for p in (a["published_on"], b["published_on"]) if p is not None]
            out.append(
                {
                    "obs_date": d,
                    "value": round(a["value"] / b["value"], 2),
                    "granularity": a["granularity"],
                    "unit": self.spec.unit,
                    # Knowable once both halves were out; for one article,
                    # the same day.
                    "published_on": max(released) if len(released) == 2 else None,
                    "fetched_at": max(a["fetched_at"], b["fetched_at"]),
                }
            )
        return out

    def first_seen(
        self, silver: SilverStore, obs_date: dt.date, *, moment: dt.datetime
    ) -> dt.datetime | None:
        seen = [silver.first_seen(i, obs_date, moment=moment) for i in (self.num, self.den)]
        return None if None in seen else max(seen)  # type: ignore[type-var]


DERIVED: tuple[Ratio, ...] = (
    Ratio(
        spec=IndicatorSpec(
            id="hog_corn_ratio_county",
            name_zh="猪粮比价（500县集贸）",
            name_en="Hog-to-corn ratio (500-county markets)",
            tier="margin",
            freq="weekly",
            unit="ratio",
            lo=0.1,
            hi=100.0,
            adapter="gold",
            call={"num": "hog_price_county", "den": "corn_price_county"},
        ),
        num="hog_price_county",
        den="corn_price_county",
    ),
)
