"""A feed to subscribe to and an index to program against, written beside
the CSVs at export time.

A reader who wants to know when 能繁母猪存栏 moves should not have to open
the site every day to find out. The Atom feeds (one per language) carry the
latest reading of every series, each entry dated by when it became public:
its release where the source dates one, otherwise the day this warehouse
learned it, never an assumed lag (ADR-0017). A feed reader then shows what
is new since it last looked.

`data/index.json` lists every series with its names, unit, tier, latest
reading and the paths of its CSV and JSON, so a script can find a series
without scraping a page. `data/series/<id>.json` holds the same rows as the
CSV. All of it is derived, like gold, and rebuilt on every export.
"""

from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from ..gold.series import all_specs, rows_of
from ..gold.vintage import learned_on
from ..registry.spec import Registry
from ..storage.silver import SilverStore

PUBLIC = "frontend/public"
# Where the site is served, for the absolute links a feed needs. The deploy
# can say otherwise; a fork deploys somewhere else.
SITE = os.environ.get("HOGCYCLE_SITE_URL", "https://xlsongc.github.io/hogcycle").rstrip("/")


def _iso(d: Any) -> str | None:
    return None if d is None else d.isoformat()


def write_series_json(
    registry: Registry,
    silver: SilverStore,
    public: Path | str = PUBLIC,
    *,
    moment: dt.datetime,
) -> int:
    """`data/series/<id>.json` for every series with data: the CSV's rows."""
    out = Path(public) / "data" / "series"
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.json"):
        old.unlink()
    written = 0
    for spec in all_specs(registry):
        rows = rows_of(spec, silver, moment=moment)
        if not rows:
            continue
        doc = {
            "id": spec.id,
            "name_zh": spec.name_zh,
            "name_en": spec.name_en,
            "unit": spec.unit,
            "tier": spec.tier,
            "rows": [
                {
                    "obs_date": r["obs_date"].isoformat(),
                    "value": r["value"],
                    "granularity": r["granularity"],
                    "published_on": _iso(r.get("published_on")),
                    "learned": learned_on(r),
                }
                for r in rows
            ],
        }
        (out / f"{spec.id}.json").write_text(
            json.dumps(doc, ensure_ascii=False, separators=(",", ":")), "utf-8"
        )
        written += 1
    return written


def write_index(payload: dict[str, Any], public: Path | str = PUBLIC) -> Path:
    """`data/index.json`: every series in the contract, where its files are,
    and its latest reading."""
    readings = {r["id"]: r for r in payload["readings"]}
    series = []
    for p in payload["panels"]:
        r = readings.get(p["id"], {})
        series.append(
            {
                "id": p["id"],
                "name_zh": p["name_zh"],
                "name_en": p["name_en"],
                "tier": p["tier"],
                "unit": p["unit"],
                "freq": p["freq"],
                "on_wall": p["in_wall"],
                "latest": {
                    "obs_date": r.get("obs_date"),
                    "value": r.get("value"),
                    "published_on": r.get("published_on"),
                },
                "csv": f"data/series/{p['id']}.csv",
                "json": f"data/series/{p['id']}.json",
                "page": f"series/{p['id']}/",
            }
        )
    path = Path(public) / "data" / "index.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "contract_version": payload.get("contract_version"),
                "generated_at": payload["generated_at"],
                "site": SITE,
                "series": series,
            },
            ensure_ascii=False,
            indent=1,
        ),
        "utf-8",
    )
    return path


_FEED = {
    "en": {"title": "The Hog Cycle Wall: latest readings", "path": "", "lang": "en"},
    "zh": {"title": "猪周期图表墙：最新读数", "path": "/zh", "lang": "zh-CN"},
}


def _when(r: dict[str, Any]) -> str:
    """The day a reading became public: its release, else the day first
    learned. Midnight UTC, because the sources date by day."""
    day = r.get("published_on") or r.get("first_seen") or r["obs_date"]
    return f"{day}T00:00:00Z"


def _number(v: float | None, unit: str) -> str:
    if v is None:
        return "—"
    whole = unit in {"万头", "CNY/tonne", "CNY/head", "1000 head", "1000 t CWE"}
    return f"{v:,.0f}" if whole else f"{v:,.2f}"


def atom(payload: dict[str, Any], locale: str) -> str:
    """One entry per series with a reading, newest first. An entry's id is
    the series and the period, so a new period is a new entry and a feed
    reader does not repeat an old one."""
    meta = _FEED[locale]
    base = f"{SITE}{meta['path']}"
    readings = sorted(
        (r for r in payload["readings"] if r.get("value") is not None),
        key=_when,
        reverse=True,
    )
    entries = []
    for r in readings:
        name = r["name_zh"] if locale == "zh" else r["name_en"]
        value = f"{_number(r['value'], r['unit'])} {r['unit']}"
        title = f"{name}: {value} ({r['obs_date']})"
        link = f"{base}/series/{r['id']}/"
        released = r.get("published_on")
        summary = (
            f"{name} {value}，所述时期 {r['obs_date']}"
            + (f"，{released} 发布" if released else "，来源未注明发布日期")
            if locale == "zh"
            else f"{name} {value} for the period ending {r['obs_date']}"
            + (f", released {released}" if released else ", release date not stated")
        )
        entries.append(
            "  <entry>\n"
            f"    <id>{escape(SITE)}/series/{r['id']}/#{r['obs_date']}</id>\n"
            f"    <title>{escape(title)}</title>\n"
            f"    <updated>{_when(r)}</updated>\n"
            f'    <link href="{escape(link)}"/>\n'
            f"    <summary>{escape(summary)}</summary>\n"
            "  </entry>\n"
        )
    today = f"{payload['generated_at'][:10]}T00:00:00Z"
    updated = _when(readings[0]) if readings else today
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        f'<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="{meta["lang"]}">\n'
        f"  <id>{escape(base)}/feed.xml</id>\n"
        f"  <title>{escape(meta['title'])}</title>\n"
        f"  <updated>{updated}</updated>\n"
        f'  <link rel="self" href="{escape(base)}/feed.xml"/>\n'
        f'  <link href="{escape(base)}/"/>\n'
        "  <author><name>hogcycle</name></author>\n"
        + "".join(entries)
        + "</feed>\n"
    )


def write_feeds(payload: dict[str, Any], public: Path | str = PUBLIC) -> list[Path]:
    paths = []
    for locale, meta in _FEED.items():
        path = Path(public) / meta["path"].lstrip("/") / "feed.xml"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(atom(payload, locale), "utf-8")
        paths.append(path)
    return paths
