"""Adapter over USDA FAS · PSD Online, the livestock bulk file.

Why a foreign source: it is an independent body's account of China's herd,
and it is the only source here that publishes a forecast and then revises
it. USDA's attaché in Beijing and the Washington analysts set China's numbers
twice a year (the April and October livestock reports) and nudge them in
between. A warehouse that keeps every value it ever learned is what turns
that into a revision history; a plain download keeps only the latest.

    https://apps.fas.usda.gov/psdonline/downloads/psd_livestock_csv.zip

One CSV for every country and livestock commodity, about 15 MB unzipped.
Only China's swine rows are kept in bronze, as rows rather than the zip,
the way the 农业农村部 adapter keeps rows rather than workbooks.

How a row maps:

    Market_Year     China's swine year is the calendar year. A *beginning*
                    stock (Sow Beginning Stocks) is the herd on 1 January,
                    which is the 31 December before: the same instant as
                    统计局's year-end figure. From the end of 2023 USDA's
                    value equals it (41,420 / 40,780 / 39,610 thousand
                    against 4,142 / 4,078 / 3,961 万头). For 2021 and 2022
                    it keeps its own estimate (42,000 and 43,000 against
                    4,329 and 4,390), which is the point of a second source.
                    A flow (Production) covers the year and ends on
                    31 December.
    Calendar_Year,  when USDA last set the value. The file's Last-Modified
    Month           day becomes published_on for rows set in that month; an
                    older row says only its month, so its day is left NULL
                    rather than guessed (ADR-0017).

Values stay in USDA's units — thousand head, thousand tonnes carcass weight
equivalent. Rescaling 39,610 into 3,961 万头 to match the domestic series
would hide that they are two sources' numbers.
"""

from __future__ import annotations

import csv
import datetime as dt
import io
import zipfile
from email.utils import parsedate_to_datetime
from typing import Any

from ..contracts.schema import Observation
from ..registry.spec import IndicatorSpec

URL = "https://apps.fas.usda.gov/psdonline/downloads/psd_livestock_csv.zip"
COUNTRY = "China"
COMMODITIES = ("Animal Numbers, Swine", "Meat, Swine")

_FIELDS = {
    "Commodity_Description": "commodity",
    "Attribute_Description": "attribute",
    "Unit_Description": "unit",
    "Market_Year": "market_year",
    "Calendar_Year": "set_year",
    "Month": "set_month",
    "Value": "value",
}


def rows_from_zip(blob: bytes) -> list[dict[str, str]]:
    """China's swine rows out of the bulk file, renamed, as strings."""
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        names = [n for n in z.namelist() if n.endswith(".csv")]
        if len(names) != 1:
            raise ValueError(f"expected one CSV in the PSD zip, found {names}")
        text = z.read(names[0]).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    missing = set(_FIELDS) - set(reader.fieldnames or [])
    if missing:
        raise KeyError(f"PSD CSV lacks {sorted(missing)}; columns: {reader.fieldnames}")
    return [
        {new: row[old] for old, new in _FIELDS.items()}
        for row in reader
        if row["Country_Name"] == COUNTRY and row["Commodity_Description"] in COMMODITIES
    ]


class UsdaPsdAdapter:
    name = "usda_psd"

    def fetch(self, spec: IndicatorSpec) -> Any:
        import requests

        r = requests.get(URL, timeout=120)
        r.raise_for_status()
        rows = rows_from_zip(r.content)
        if not rows:
            raise ValueError(f"{spec.id}: no {COUNTRY} swine rows in {URL}")
        return {"url": URL, "last_modified": r.headers.get("Last-Modified"), "rows": rows}

    def normalise(
        self,
        spec: IndicatorSpec,
        payload: Any,
        *,
        snapshot_id: str,
        fetched_at: dt.datetime,
    ) -> list[Observation]:
        commodity, unit, at = spec.call["commodity"], spec.call["unit"], spec.call["at"]
        if at not in ("start", "end"):
            raise KeyError(f"{spec.id}: call.at must be 'start' or 'end', got {at!r}")
        released = _day(payload.get("last_modified"))

        out: list[Observation] = []
        for row in payload["rows"]:
            if (row["commodity"], row["attribute"], row["unit"]) != (
                commodity,
                spec.extract.value,
                unit,
            ):
                continue
            year = int(row["market_year"])
            value = float(row["value"])
            if value == 0 and spec.zero_is_null:
                continue
            set_in = (int(row["set_year"]), int(row["set_month"]))
            end = dt.date(year - 1, 12, 31) if at == "start" else dt.date(year, 12, 31)
            out.append(
                Observation(
                    indicator=spec.id,
                    obs_date=end,
                    value=value,
                    unit=spec.unit,
                    granularity="annual",
                    source=spec.source,
                    snapshot_id=snapshot_id,
                    fetched_at=fetched_at,
                    published_on=released
                    if released and set_in == (released.year, released.month)
                    else None,
                )
            )
        if not out:
            seen = sorted(
                {(r["commodity"], r["attribute"], r["unit"]) for r in payload["rows"]}
            )
            raise KeyError(
                f"{spec.id}: no {commodity!r} / {spec.extract.value!r} / {unit!r} rows. "
                f"Seen: {seen}"
            )
        return sorted(out, key=lambda o: o.obs_date)


def _day(header: str | None) -> dt.date | None:
    if not header:
        return None
    return parsedate_to_datetime(header).astimezone(dt.UTC).date()
