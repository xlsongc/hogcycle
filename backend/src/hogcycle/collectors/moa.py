"""Adapter over 农业农村部生猪专题·月度数据 — the 五部委 joint release.

Why this exists: 能繁母猪存栏 is the one genuine leading indicator in this
project, and it used to arrive through akshare, whose upstream is 玄田数据
(`xt.yangzhu.vip`) — a *third-party mirror* of the government release. That
mirror stopped updating after 2025年10月 and kept happily serving its last 22
rows, so every daily run printed `ok, 0 rows` while the series went eleven
months stale. Nothing failed; the number simply stopped being true. See
docs/adr/0013.

So this adapter reads the primary instead. 农业农村部、国家发展改革委、商务部、
海关总署、国家统计局 publish one release per month at a fully derivable URL:

    https://www.moa.gov.cn/ztzl/szcpxx/jdsj/{YYYY}/{YYYYMM}/

Each carries a linked XLSX whose rows are `指标分类 | 序号 | 指标 | 数值 |
环比 | 同比`. The XLSX is the parse target, never the HTML: 202606 renders
「能繁母猪存栏」split across tags so a text match on the page misses it, while
the workbook is clean.

Every 指标 label is `<period><name>（<unit>）`, and a row is claimed only when
the period parses *and* the name matches the configured one exactly:

    2026年2季度末能繁母猪存栏（万头）        -> 能繁母猪存栏
    2026年6月份生猪定点屠宰企业屠宰量（万头）  -> 生猪定点屠宰企业屠宰量
    2026年上半年生猪出栏（万头）             no period token   -> skipped
    2026年1-7月生猪定点屠宰企业屠宰量（万头）  no period token   -> skipped

Dropping the cumulative rows is not a special case: `1-7月` and `上半年` are
year-to-date totals rather than a value for the period they name, and neither
is a period token, so the head match rejects them. Row *order* is never used
— the 指标分类 cell is merged and the numbering shifts between years.

The name must match exactly, not by substring, and that is load-bearing:
「规模以上生猪定点屠宰企业屠宰量」 contains 「生猪定点屠宰企业屠宰量」, but
the 2025年7月 caliber change widened that survey's coverage and stepped the
level up. A substring match would have quietly welded two calibers into one
line, which is the single easiest way to produce a confident wrong answer.
They are two indicators here, each with one caliber.

Quarter-end months (03/06/09/12) carry the 统计局 quarterly stock figures;
other months carried a 农业农村部 monthly print up to 2025年10月, after which
the public cadence for 能繁母猪存栏 became quarterly only. That change is
upstream policy, not something this adapter can paper over: the granularity
recorded per row says which kind of reading each one is.
"""

from __future__ import annotations

import datetime as dt
import io
import re
import time
from typing import Any
from urllib.parse import urljoin

from ..contracts.schema import Observation
from ..registry.periods import parse_period
from ..registry.spec import IndicatorSpec

BASE = "https://www.moa.gov.cn/ztzl/szcpxx/jdsj"

# A .gov.cn host serving static files. It is not a rate-limited API, but we
# make two requests per edition and there is no reason to burst.
_MIN_INTERVAL_S = 0.5
_last_call = 0.0

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "zh-CN,zh;q=0.9",
}

_XLSX_HREF = re.compile(r'href="([^"]+\.xlsx)"')

# The trailing unit, e.g. （万头）. Stripped before the name is compared, so
# a unit containing digits or slashes (（元/公斤）) never reaches the matcher.
_UNIT_SUFFIX = re.compile(r"[（(][^（()）]*[)）]\s*$")

# The period token at the head of an 指标 label. Quarter tokens end in 季度末,
# month tokens in 月 / 月末 / 月份; `parse_period` understands all of them.
# Year-to-date labels (`2026年1-7月…`, `2026年上半年…`) match none of these,
# which is exactly how the cumulative rows get excluded.
_PERIOD_HEAD = re.compile(
    r"^\s*(\d{4}\s*年\s*(?:第?\s*[一二三四1-4]\s*季度\s*末?|\d{1,2}\s*月\s*[末份]?))"
)

# 「3780（相当于调控目标的100.8%）」 — the reading is the leading number; the
# parenthetical is the 产能调控 zone commentary, which belongs to policy, not
# to the measurement.
_LEADING_NUMBER = re.compile(r"^\s*([0-9]+(?:\.[0-9]+)?)")


class MoaFetchError(RuntimeError):
    """Every edition in the window failed. Distinct from "this month is not
    published yet", which is normal and merely skipped."""


def _throttle() -> None:
    global _last_call
    wait = _MIN_INTERVAL_S - (time.monotonic() - _last_call)
    if wait > 0:
        time.sleep(wait)
    _last_call = time.monotonic()


def _get(session: Any, url: str, *, attempts: int = 3) -> Any:
    """One request, retried on transport errors.

    `with_retry` in the pipeline wraps the *whole* fetch, which is the wrong
    granularity here: one flaky month must not re-download the other 52, but
    neither should it leave a hole. A backfill of 60 editions makes ~120
    requests, so at any per-request failure rate the odds of at least one
    timeout are high — and a silent hole in the middle of a series is exactly
    what this project refuses to tolerate.
    """
    last: Exception | None = None
    for i in range(attempts):
        _throttle()
        try:
            return session.get(url, timeout=30)
        except Exception as exc:  # transport only; HTTP status is judged below
            last = exc
            if i < attempts - 1:
                time.sleep(1.5 * (2**i))
    raise last  # type: ignore[misc]


def months_ending(now: dt.date, count: int) -> list[str]:
    """The `count` most recent YYYYMM stamps, oldest first."""
    out: list[str] = []
    y, m = now.year, now.month
    for _ in range(count):
        out.append(f"{y}{m:02d}")
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return list(reversed(out))


class MoaAdapter:
    """Fetches a trailing window of editions.

    The window rather than the full archive, because a published edition never
    changes: once an edition is in silver, re-reading it every morning buys
    nothing. The default reaches back far enough to cover the publication lag
    — the 2026年7月 release only appeared on 2026-08-27 — plus slack. Widen it
    with `hogcycle collect --months-back N` to backfill.
    """

    name = "moa"

    def __init__(self, months_back: int = 6, *, today: dt.date | None = None) -> None:
        if months_back < 1:
            raise ValueError("months_back must be >= 1")
        self.months_back = months_back
        self.today = today

    def fetch(self, spec: IndicatorSpec) -> Any:
        import requests

        session = requests.Session()
        session.headers.update(_HEADERS)

        today = self.today or dt.datetime.now(dt.UTC).date()
        editions: list[dict[str, Any]] = []
        skipped: list[dict[str, str]] = []

        for ym in months_ending(today, self.months_back):
            page = f"{BASE}/{ym[:4]}/{ym}/"
            try:
                r = _get(session, page)
                if r.status_code != 200:
                    # A month that was never published (202511) or is not out
                    # yet. Normal; recorded so bronze shows we looked.
                    skipped.append({"ym": ym, "why": f"page HTTP {r.status_code}"})
                    continue
                r.encoding = "utf-8"
                href = _XLSX_HREF.search(r.text)
                if not href:
                    # 202506 shipped without a workbook. Recorded rather than
                    # silently dropped: a missing month must stay visible.
                    skipped.append({"ym": ym, "why": "no xlsx link on page"})
                    continue
                xlsx_url = urljoin(page, href.group(1))
                blob = _get(session, xlsx_url)
                blob.raise_for_status()
                editions.append(
                    {"ym": ym, "page": page, "xlsx": xlsx_url, "rows": _rows(blob.content)}
                )
            except Exception as exc:
                skipped.append({"ym": ym, "why": f"{type(exc).__name__}: {exc}"[:160]})

        if not editions:
            raise MoaFetchError(
                f"{spec.id}: no usable edition in the last {self.months_back} "
                f"month(s) at {BASE}. Skipped: {skipped}"
            )
        return {"editions": editions, "skipped": skipped}

    def normalise(
        self,
        spec: IndicatorSpec,
        payload: Any,
        *,
        snapshot_id: str,
        fetched_at: dt.datetime,
    ) -> list[Observation]:
        label = spec.extract.value
        # Keyed by obs_date, and editions arrive oldest first, so when two
        # editions print the same period the later one wins. That is the
        # restatement case this project exists for: silver then sees a value
        # that differs from what it knew and records a revision, rather than
        # us pinning the original print forever.
        found: dict[dt.date, Observation] = {}
        names_seen: set[str] = set()

        for edition in payload["editions"]:
            for row in edition["rows"]:
                for i, cell in enumerate(row):
                    parsed = _label(cell)
                    if parsed is None:
                        continue
                    period_token, name = parsed
                    names_seen.add(name)
                    if name != label:
                        continue
                    raw = next((c for c in row[i + 1 :] if c not in (None, "")), None)
                    value = None if raw is None else _number(raw)
                    if value is None:
                        continue
                    period = parse_period(period_token, default=spec.freq)
                    found[period.date] = Observation(
                        indicator=spec.id,
                        obs_date=period.date,
                        value=value,
                        unit=spec.unit,
                        granularity=period.granularity,
                        source=spec.source,
                        snapshot_id=snapshot_id,
                        fetched_at=fetched_at,
                    )

        out = [found[d] for d in sorted(found)]
        if not out and spec.retired:
            # A closed caliber is absent from every recent edition by
            # definition. Failing here daily would train the reader to ignore
            # failures, which is how the last silent freeze survived so long.
            return []
        if not out:
            raise KeyError(
                f"{spec.id}: no 指标 named {label!r} in "
                f"{len(payload['editions'])} edition(s). Names seen: "
                f"{sorted(names_seen)}. The joint release renames indicators "
                "when a survey's caliber changes — a rename is a new caliber, "
                "so add an indicator rather than widening this match."
            )
        return out


def _rows(blob: bytes) -> list[list[str | None]]:
    """Workbook -> plain rows. Serialised as text so bronze holds JSON, not a
    pickled workbook, and stays readable when openpyxl moves on."""
    from openpyxl import load_workbook

    wb = load_workbook(io.BytesIO(blob), read_only=True, data_only=True)
    try:
        sheet = wb[wb.sheetnames[0]]
        return [
            [None if c is None else str(c) for c in row]
            for row in sheet.iter_rows(values_only=True)
        ]
    finally:
        wb.close()


def _label(cell: str | None) -> tuple[str, str] | None:
    """Split an 指标 cell into (period token, indicator name), or None when the
    cell is not an indicator label at all — a heading, a 指标分类, or one of
    the 指标说明 footnotes, which mention several indicator names in prose and
    would otherwise match."""
    if not cell:
        return None
    text = _UNIT_SUFFIX.sub("", cell.replace("\n", "")).strip()
    head = _PERIOD_HEAD.match(text)
    if head is None:
        return None
    return head.group(1).strip(), text[head.end() :].strip()


def _number(raw: str) -> float | None:
    m = _LEADING_NUMBER.match(raw.replace("\n", "").replace(",", "").strip())
    return float(m.group(1)) if m else None
