"""The weekly digest as a feed: one entry per finished week (docs/adr/0039).

A reader who wants the week without visiting, or a newsletter tool later
pointed at the site, subscribes to this. It needs no account on either side,
which is why it comes before any mailing list. Only a week that is over gets
an entry: the current one still changes, and a feed entry should not.
"""

from __future__ import annotations

import datetime as dt
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from .feeds import PUBLIC, SITE, _number

_META = {
    "en": {"title": "The Hog Cycle Wall: weekly digest", "path": "", "lang": "en"},
    "zh": {"title": "猪周期图表墙：猪市周报", "path": "/zh", "lang": "zh-CN"},
}

# The same headline the page leads with (frontend lib/week.ts): the spot
# price, the futures price, and what a hog earns.
_HEADLINE = (
    ("hog_price_wai3", "hog_price_county", "hog_price_index"),
    ("lh_futures_main",),
    ("profit_per_head_est",),
)


MINUS = "\u2212"

# The units the headline uses, as the Chinese page shows them (frontend
# unitOf). The contract keeps the source's own form.
_UNIT_ZH = {"CNY/kg": "元/公斤", "CNY/tonne": "元/吨", "CNY/head": "元/头"}


def _value(v: float, unit: str, locale: str) -> str:
    shown = _UNIT_ZH.get(unit, unit) if locale == "zh" else unit
    return f"{_number(v, unit).replace('-', MINUS)} {shown}"


def _signed(v: float, unit: str) -> str:
    s = _number(abs(v), unit)
    return f"+{s}" if v > 0 else f"{MINUS}{s}" if v < 0 else s


def _signed_pct(p: float) -> str:
    sign = "+" if p > 0 else MINUS if p < 0 else ""
    return f"{sign}{abs(p)}%"


def _quiet(m: dict[str, Any]) -> bool:
    return m["prev_d"] == m["d"] and m["delta"] == 0


def _part(m: dict[str, Any], p: dict[str, Any], locale: str) -> str:
    name = p["name_zh"] if locale == "zh" else p["name_en"]
    value = _value(m["v"], p["unit"], locale)
    if m["delta"] is None:
        return f"{name} {value}"
    change = _signed(m["delta"], p["unit"])
    pct = None if m["pct"] is None else _signed_pct(m["pct"])
    if locale == "zh":
        return f"{name} {value}，较上周 {change}" + (f"（{pct}）" if pct else "")
    return f"{name} {value}, {change}" + (f" ({pct})" if pct else "") + " on the week"


def summary(week: dict[str, Any], panels: dict[str, dict[str, Any]], locale: str) -> str:
    """One sentence of the week's moves, as the page's headline."""
    moves = {m["id"]: m for m in week["moves"]}
    parts = []
    for ids in _HEADLINE:
        m = next(
            (moves[i] for i in ids if i in moves and i in panels and not _quiet(moves[i])),
            None,
        )
        if m is not None:
            parts.append(_part(m, panels[m["id"]], locale))
    if locale == "zh":
        return "；".join(parts) + "。" if parts else "本周主要价格都没有新数据。"
    return "; ".join(parts) + "." if parts else "No headline price had a new reading."


def _title(week: dict[str, Any], locale: str) -> str:
    year, n = week["id"].split("-W")
    start, end = week["start"], week["end"]
    if locale == "zh":
        return f"{year} 年第 {int(n)} 周猪市周报（{start} 至 {end}）"
    return f"Week {int(n)}, {year}: the hog market, {start} to {end}"


def atom(payload: dict[str, Any], locale: str) -> str:
    meta = _META[locale]
    base = f"{SITE}{meta['path']}"
    panels = {p["id"]: p for p in payload["panels"]}
    done = [w for w in payload.get("weeks", []) if w["complete"]]
    entries = []
    for w in reversed(done):
        link = f"{base}/week/{w['id'].lower()}/"
        # Dated the Monday after: the first day the whole week was knowable.
        updated = (dt.date.fromisoformat(w["end"]) + dt.timedelta(days=1)).isoformat()
        entries.append(
            "  <entry>\n"
            f"    <id>{escape(link)}</id>\n"
            f"    <title>{escape(_title(w, locale))}</title>\n"
            f"    <updated>{updated}T00:00:00Z</updated>\n"
            f'    <link href="{escape(link)}"/>\n'
            f"    <summary>{escape(summary(w, panels, locale))}</summary>\n"
            "  </entry>\n"
        )
    updated = (
        (dt.date.fromisoformat(done[-1]["end"]) + dt.timedelta(days=1)).isoformat()
        if done
        else payload["generated_at"][:10]
    )
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        f'<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="{meta["lang"]}">\n'
        f"  <id>{escape(base)}/week.xml</id>\n"
        f"  <title>{escape(meta['title'])}</title>\n"
        f"  <updated>{updated}T00:00:00Z</updated>\n"
        f'  <link rel="self" href="{escape(base)}/week.xml"/>\n'
        f'  <link href="{escape(base)}/week/"/>\n'
        "  <author><name>hogcycle</name></author>\n"
        + "".join(entries)
        + "</feed>\n"
    )


def write_week_feeds(payload: dict[str, Any], public: Path | str = PUBLIC) -> list[Path]:
    paths = []
    for locale, meta in _META.items():
        path = Path(public) / meta["path"].lstrip("/") / "week.xml"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(atom(payload, locale), "utf-8")
        paths.append(path)
    return paths
