"""Adapter over 农业农村部畜牧兽医局 · 监测预警 — two weekly price reports.

Why this exists: 仔猪价格 and 白条肉出厂价 used to arrive through akshare,
whose upstream is 玄田数据, a third-party mirror. On 2026-08-20 the mirror
stopped updating those tables and kept serving their last rows, the same
failure that froze 能繁母猪存栏 for eleven months (ADR-0013). The numbers
were never 玄田's: both are 农业农村部 weekly reports, published here:

    https://xmsyj.moa.gov.cn/jcyj/            list, 20 per page, newest first
    https://xmsyj.moa.gov.cn/jcyj/YYYYMM/tYYYYMMDD_NNNNNNN.htm

    畜产品和饲料集贸市场价格情况
        500 个县集贸市场和采集点. One collection day per week
        (「9月第5周（采集日为9月30日）」): 仔猪, 生猪, 猪肉, 玉米, 豆粕,
        育肥猪配合饲料 …, each a 全国平均价格 in 元/公斤.
    生猪定点屠宰企业生猪收购和白条肉出厂价格情况
        定点屠宰企业, Monday-to-Sunday weeks
        (「2026年9月28日—10月4日」): 生猪平均收购价格, 白条肉平均出厂价格.

Both are prose, not tables. The wording is fixed enough to parse, and the
parse is strict: a number is taken only as `<name>[为]<number>元/公斤` with
the configured name matched exactly, because 「全国生猪平均价格」 and
「全国仔猪平均价格」 differ by one character and are different markets.
The page splits digits across tags (`202</span><span>6`), so the text is
read with every tag and space removed first.

Bronze keeps each article as tag-free text rather than its HTML. The markup
is a `<font>` per word and runs ten times the size of what it says, and the
whole store is committed daily. Nothing the parser reads is lost: tags carry
no data here, and the text keeps its spaces so a person can still read it.

Each article states when it went up: `<meta name="PubDate">` carries the
minute. That becomes published_on. The list page shows the same day, and the
two must agree; a disagreement means one of them is not what we think it is.
"""

from __future__ import annotations

import datetime as dt
import html
import re
import time
from typing import Any

from ..contracts.schema import Observation
from ..registry.spec import IndicatorSpec
from .failures import STRUCTURE, TRANSIENT, CollectFailure, classify, worst

BASE = "https://xmsyj.moa.gov.cn/jcyj/"

# The report a spec reads, by `call.report`, and the title fragment that
# identifies it in the list. Matching on the title rather than on position
# is deliberate: the list interleaves several weekly series.
REPORTS = {
    "market": "畜产品和饲料集贸市场价格情况",
    "slaughter": "生猪定点屠宰企业生猪收购和白条肉出厂价格情况",
}

_PER_PAGE = 20
_MIN_INTERVAL_S = 0.5
_last_call = 0.0

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "zh-CN,zh;q=0.9",
}

_ITEM = re.compile(
    r'<a href="(\./\d{6}/t\d{8}_\d+\.htm)"[^>]*title=\'([^\']+)\'>.*?'
    r'<span class="sj_gztzri">(\d{4}-\d{2}-\d{2})</span>',
    re.S,
)
_PUBDATE = re.compile(r'<meta name="PubDate" content="(\d{4}-\d{2}-\d{2}) [\d:]+"')
# The body is closed by the page's next block, not by the first </div>: older
# articles nest a <div> per paragraph, and a non-greedy match to the first
# close kept only the opening sentence of six of them.
_BODY = re.compile(r'<div class="sj_arc_body">(.*?)<div class="sj_fukuangxia">', re.S)

# Period forms, read from the tag-free text. The first 日 is optional:
# 2023 wrote 「11月20—26日」, 2026 writes 「9月28日—10月4日」.
_RANGE = re.compile(
    r"(\d{4})年(\d{1,2})月(\d{1,2})日?[—–\-－至~～]+(?:(\d{4})年)?(?:(\d{1,2})月)?(\d{1,2})日"
)

# Whose prices the slaughter report averages. Until the week of 2024-01-01
# it was 「全国规模以上生猪定点屠宰企业」; from then, every designated plant.
# The level barely moved across the change (20.62 -> 20.36, an ordinary
# week), but a survey that changed whom it asks is two calibers, and the
# mirror this replaces had welded them into one line. A spec names the one
# it wants in `call.scope`; the other's articles are not its observations.
SCOPES = {"规模以上": "全国规模以上生猪定点屠宰企业", "全部定点": "生猪定点屠宰企业"}
_SUBJECT = re.compile(r"(全国规模以上)?生猪定点屠宰企业")
_FIGURE = re.compile(r"([\u4e00-\u9fff]{2,16}(?:价格|平均))为*\d+(?:\.\d+)?元/公斤")

_COLLECTION_DAY = re.compile(r"采集日为(\d{1,2})月(\d{1,2})日")

# A weekly report describes the week just ended. Over 400 articles the lag
# is 5 days at the median and 8 at p95; the longest are catch-ups — the
# market report 16 days before the 2026 May Day holiday, the slaughter report
# 23 days when three weeks went up together on 2025-08-26. About twice the
# longest is the tripwire, as for the monthly release: it exists to catch a
# 采集日 put in the wrong year, which is off by 365, not to forecast upstream.
MAX_RELEASE_LAG_DAYS = 45


class MoaWeeklyFetchError(CollectFailure):
    """No article of the requested report could be read at all."""


def _throttle() -> None:
    global _last_call
    wait = _MIN_INTERVAL_S - (time.monotonic() - _last_call)
    if wait > 0:
        time.sleep(wait)
    _last_call = time.monotonic()


def _get(session: Any, url: str, *, attempts: int = 3) -> str:
    """One page, retried only when the failure is transient (ADR-0028). A 404
    on a listed article is a fact worth recording, and a 403 is the host
    refusing this network: asking twice more changes nothing. This used to
    retry both, under a pipeline that retried the whole fetch three times."""
    last: Exception | None = None
    for i in range(attempts):
        _throttle()
        try:
            r = session.get(url, timeout=30)
            r.raise_for_status()
            r.encoding = "utf-8"
            return r.text
        except Exception as exc:
            if classify(exc) != TRANSIENT:
                raise
            last = exc
            if i < attempts - 1:
                time.sleep(1.5 * (2**i))
    raise last  # type: ignore[misc]


def list_items(page_html: str) -> list[tuple[str, str, str]]:
    """(relative href, title, listed date) for every article on a list page."""
    return [(h, t.strip(), d) for h, t, d in _ITEM.findall(page_html)]


class MoaWeeklyAdapter:
    """Reads the newest `pages` list pages and every matching article on them.

    Two pages hold about eight weeks of each report, enough to cover a missed
    run or two. Widen with `hogcycle collect --weekly-pages 25` to backfill;
    the list stops at 25 pages (500 articles), which reaches 2021-12 for the
    market report and 2023-11 for the slaughter report.
    """

    name = "moa_weekly"

    def __init__(self, pages: int = 2) -> None:
        if pages < 1:
            raise ValueError("pages must be >= 1")
        self.pages = pages

    def fetch(self, spec: IndicatorSpec) -> Any:
        import requests

        report = spec.call["report"]
        if report not in REPORTS:
            raise KeyError(
                f"{spec.id}: unknown report {report!r}; known: {sorted(REPORTS)}"
            )
        wanted = REPORTS[report]

        session = requests.Session()
        session.headers.update(_HEADERS)

        items: list[tuple[str, str, str]] = []
        for i in range(self.pages):
            url = BASE if i == 0 else f"{BASE}index_{i}.htm"
            page = list_items(_get(session, url))
            if not page:
                raise MoaWeeklyFetchError(
                    STRUCTURE,
                    f"{spec.id}: list page {url} holds no article links; the list "
                    "markup changed"
                )
            items += [x for x in page if wanted in x[1]]
            if len(page) < _PER_PAGE:
                break

        articles: list[dict[str, Any]] = []
        skipped: list[dict[str, str]] = []
        kinds: list[str] = []
        for href, title, listed in items:
            url = BASE + href[2:]
            try:
                page = _get(session, url)
            except Exception as exc:
                skipped.append({"url": url, "why": f"{type(exc).__name__}: {exc}"[:160]})
                kinds.append(classify(exc))
                continue
            pub = _PUBDATE.search(page)
            body = _BODY.search(page)
            articles.append(
                {
                    "url": url,
                    "title": title,
                    "listed": listed,
                    "pubdate": pub.group(1) if pub else None,
                    "text": readable(body.group(1)) if body else None,
                }
            )

        if not articles:
            raise MoaWeeklyFetchError(
                worst(kinds),
                f"{spec.id}: no {wanted!r} article in the newest {self.pages} "
                f"list page(s). Skipped: {skipped}"
            )
        return {"report": report, "articles": articles, "skipped": skipped}

    def shape(self, payload: Any) -> frozenset[str]:
        """The names of the prices the articles print, 「<name>为<n>元/公斤」
        (ADR-0032). Names end in 价格 or 平均, which keeps 「较上周上涨0.12
        元/公斤」 out: a change is not a figure."""
        return frozenset(
            m
            for art in payload["articles"]
            for m in _FIGURE.findall(plain(art["text"] or ""))
        )

    def normalise(
        self,
        spec: IndicatorSpec,
        payload: Any,
        *,
        snapshot_id: str,
        fetched_at: dt.datetime,
    ) -> list[Observation]:
        name = spec.extract.value
        # 为 repeated is the publisher's typo (「价格为为17.46」, 2025-11-21), not
        # another phrasing: the name and the number around it are unchanged.
        # A spelling the publisher used for the same figure is listed in
        # extract.also and matched as exactly as the name (docs/adr/0027);
        # longest first, so one spelling is never read as part of another.
        spellings = sorted(spec.extract.names, key=len, reverse=True)
        value_re = re.compile(
            "(?:" + "|".join(map(re.escape, spellings)) + r")为*(\d+(?:\.\d+)?)元/公斤"
        )
        scope = spec.call.get("scope")
        if scope is not None and scope not in SCOPES:
            raise KeyError(f"{spec.id}: unknown scope {scope!r}; known: {sorted(SCOPES)}")
        # Same rule as the monthly release: one row per release of a value.
        # Read in publication order, a week gets a second row only when a
        # later article prints a different number — a correction, kept as
        # its own release rather than overwriting the first.
        found: dict[dt.date, list[Observation]] = {}

        for art in sorted(payload["articles"], key=released):
            where = art["url"]
            published_on = released(art)
            text = plain(art["text"] or "")
            if not text:
                raise ValueError(f"{spec.id}: {where} has no article body")
            if scope is not None:
                subject = _SUBJECT.search(text)
                if subject is None:
                    raise KeyError(
                        f"{spec.id}: {where} names no 生猪定点屠宰企业, so whose prices "
                        f"it averages is unknown. Text starts: {text[:80]!r}"
                    )
                if ("规模以上" if subject.group(1) else "全部定点") != scope:
                    continue  # the other caliber's week, not a missing one

            values ={float(v) for v in value_re.findall(text)}
            if not values:
                raise KeyError(
                    f"{spec.id}: no {name!r}<number>元/公斤 in {where}. Text starts: "
                    f"{text[:120]!r}. A renamed series is a new caliber; add an "
                    "indicator rather than loosening this match."
                )
            if len(values) > 1:
                raise ValueError(f"{spec.id}: {where} prints {name} as {sorted(values)}")

            obs_date = period_end(text, published_on, where=where)
            lag = (published_on - obs_date).days
            if not 0 <= lag <= MAX_RELEASE_LAG_DAYS:
                raise ValueError(
                    f"{spec.id}: {where} is dated {published_on} but reports a week "
                    f"ending {obs_date} ({lag} days); expected 0-{MAX_RELEASE_LAG_DAYS}"
                )
            obs = Observation(
                indicator=spec.id,
                obs_date=obs_date,
                value=values.pop(),
                unit=spec.unit,
                granularity="weekly",
                source=spec.source,
                snapshot_id=snapshot_id,
                fetched_at=fetched_at,
                published_on=published_on,
            )
            prints = found.setdefault(obs_date, [])
            if prints and prints[-1].value == obs.value:
                continue
            prints.append(obs)
        return [o for d in sorted(found) for o in found[d]]


def readable(fragment: str) -> str:
    """An article body as text: style blocks and tags gone, runs of space
    collapsed to one. What bronze stores."""
    fragment = re.sub(r"<(style|script)\b.*?</\1>", "", fragment, flags=re.S | re.I)
    text = html.unescape(re.sub(r"<[^>]+>", "", fragment))
    return re.sub(r"[\s　\xa0]+", " ", text).strip()


def plain(text: str) -> str:
    """Every kind of space removed, so a number the page split across tags
    (`202</span><span>6`) reads whole."""
    return re.sub(r"[\s　\xa0]+", "", text)


def released(art: dict[str, Any]) -> dt.date:
    """The article's publication day, from its PubDate meta, checked against
    the list page that announced it."""
    if not art.get("pubdate"):
        raise ValueError(f"{art['url']}: no PubDate meta; the article template changed")
    published = dt.date.fromisoformat(art["pubdate"])
    if art.get("listed") and dt.date.fromisoformat(art["listed"]) != published:
        raise ValueError(
            f"{art['url']}: PubDate {published} but listed as {art['listed']}"
        )
    return published


def period_end(text: str, published_on: dt.date, *, where: str) -> dt.date:
    """The last day the report describes.

    A Monday-Sunday range carries its own year. A collection day does not:
    its year is the publication's, unless that would put it after the
    publication — the 12月第5周 report comes out in January.
    """
    m = _RANGE.search(text)
    if m:
        y0, m0, _d0, y1, m1, d1 = m.groups()
        year = int(y1 or y0)
        month = int(m1 or m0)
        end = dt.date(year, month, int(d1))
        if y1 is None and end < dt.date(int(y0), int(m0), int(_d0)):
            end = dt.date(year + 1, month, int(d1))  # 12月29日—1月4日
        return end
    m = _COLLECTION_DAY.search(text)
    if m:
        month, day = int(m.group(1)), int(m.group(2))
        end = dt.date(published_on.year, month, day)
        if end > published_on:
            end = dt.date(published_on.year - 1, month, day)
        return end
    raise ValueError(
        f"{where}: no week range or 采集日 in {text[:120]!r}; the report wording changed"
    )
