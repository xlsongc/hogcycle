"""Period labels -> (date, granularity).

Upstream does not hand you dates. It hands you *period labels*, and for the
one series this project cares most about they arrive in four shapes inside a
single column:

    2009                 annual
    2025年一季度（末）     quarter end, 国家统计局 caliber
    2025年7月             month end, 农业农村部 定点监测 extrapolation
    2018年第01周          ISO-ish week (白条肉 uses this)
    2026-08-31           a plain date

and, from the 农业农村部 joint release, the same two period kinds spelled
differently again — 2026年2季度末, 2025年10月末, 2026年6月份.

So granularity is a property of the **row**, not of the indicator, and the
parser has to report it. Anything that flattens these into one column of
dates is claiming an annual figure and a monthly figure are the same kind of
measurement. They are not.

**Convention: every label resolves to the END of its period.** These series
are point-in-time stocks (存栏) or period averages; the end date is the only
reading that stays correct when granularities sit side by side.

A plain date carries no granularity of its own, so the caller supplies the
indicator's declared `freq` as the fallback — a daily and a weekly series
both arrive as bare dates and only the config can tell them apart.
"""

from __future__ import annotations

import datetime as dt
import re
from dataclasses import dataclass
from typing import Any

_CN_DIGITS = "一二三四"

_RE_YEAR = re.compile(r"^(\d{4})\s*年?$")
# 末 and 份 are the 农业农村部 joint release's own suffixes — 2025年10月末 is a
# stock at month end, 2026年6月份 a flow over the month. Both resolve to the
# same date under the period-end convention; only the indicator says which
# kind of quantity it is, so the suffix carries no extra meaning here.
_RE_MONTH = re.compile(r"^(\d{4})\s*年\s*(\d{1,2})\s*月\s*[末份]?$")
_RE_QUARTER = re.compile(
    rf"^(\d{{4}})\s*年\s*第?\s*([{_CN_DIGITS}1-4])\s*季度\s*[（(]?\s*末?\s*[）)]?$"
)
_RE_WEEK = re.compile(r"^(\d{4})\s*年\s*第?\s*(\d{1,2})\s*周$")

_DATE_FORMATS = ("%Y-%m-%d", "%Y/%m/%d", "%Y%m%d", "%Y年%m月%d日")


class PeriodParseError(ValueError):
    """The label matched none of the known shapes."""


@dataclass(frozen=True, slots=True)
class Period:
    date: dt.date
    granularity: str


def month_end(year: int, month: int) -> dt.date:
    nxt = dt.date(year + (month == 12), month % 12 + 1, 1)
    return nxt - dt.timedelta(days=1)


def quarter_end(year: int, quarter: int) -> dt.date:
    return month_end(year, quarter * 3)


def parse_period(raw: Any, *, default: str) -> Period:
    """Resolve one period label. `default` is the indicator's declared freq,
    used only when the label is a bare date and carries no period of its own."""
    if isinstance(raw, dt.datetime):
        return Period(raw.date(), default)
    if isinstance(raw, dt.date):
        return Period(raw, default)

    s = str(raw).strip()
    if not s:
        raise PeriodParseError("empty period label")

    if m := _RE_MONTH.match(s):
        year, month = int(m[1]), int(m[2])
        if not 1 <= month <= 12:
            raise PeriodParseError(f"month out of range in {s!r}")
        return Period(month_end(year, month), "monthly")

    if m := _RE_QUARTER.match(s):
        q = m[2]
        quarter = int(q) if q.isdigit() else _CN_DIGITS.index(q) + 1
        return Period(quarter_end(int(m[1]), quarter), "quarterly")

    if m := _RE_WEEK.match(s):
        year, week = int(m[1]), int(m[2])
        try:
            # ISO week, taking Sunday as the end. 第N周 and ISO weeks can differ
            # by a few days at year boundaries; for a weekly series that is
            # within the measurement's own resolution.
            return Period(dt.date.fromisocalendar(year, week, 7), "weekly")
        except ValueError as exc:
            raise PeriodParseError(f"no ISO week {week} in {year} ({s!r})") from exc

    if m := _RE_YEAR.match(s):
        return Period(dt.date(int(m[1]), 12, 31), "annual")

    for fmt in _DATE_FORMATS:
        try:
            # A date, not a moment — there is no timezone to attach.
            return Period(dt.datetime.strptime(s, fmt).date(), default)  # noqa: DTZ007
        except ValueError:
            continue

    raise PeriodParseError(
        f"unparseable period label {raw!r}. Known shapes: a plain date, "
        "'2009', '2025年7月', '2025年一季度（末）', '2018年第01周'."
    )
