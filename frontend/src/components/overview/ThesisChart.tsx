"use client";

/**
 * The project's thesis as one picture: capacity, shifted by the biological
 * lag, directly above the price it is supposed to lead.
 *
 * Two panels on one time axis rather than two lines on one chart — 万头 and
 * 元/公斤 on a shared y-scale would flatten one of them, and on two y-scales
 * their alignment would be arbitrary (CLAUDE.md: no dual axis). The shift is
 * the reader's to choose among the biologically meaningful values; none of
 * them is fitted.
 *
 * The second switch is the backtest's question. By period, a sow reading
 * sits at the quarter it describes; by release, at the day it was published,
 * which is where a reader could first have acted on it. The gap between the
 * two is lead time the biology grants and the publication lag spends.
 */

import { useState } from "react";
import type { Panel } from "@/types/generated/wall";
import { PanelChart } from "@/charts/PanelChart";
import { shiftMonths } from "@/lib/dates";
import { nameOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

const GROUP = "hogcycle-thesis";
const LEADS = [0, 10, 12];
const DEFAULT_LEAD = 10;

type Align = "period" | "release";
type Props = { capacity: Panel; price: Panel; end: string; locale: Locale };

export function ThesisChart({ capacity, price, end, locale }: Props) {
  const t = dict(locale).overview;
  const [lead, setLead] = useState(DEFAULT_LEAD);
  const [align, setAlign] = useState<Align>("period");
  const lag = capacity.release_lag;

  const placed = (q: Panel["points"][number]) => (align === "release" ? q.p : q.d);
  const capPts = capacity.points.filter((q) => q.v != null && placed(q));
  const first = (p: Panel) => p.points.find((q) => q.v != null)?.d ?? end;
  const capFirst = capPts[0] ? placed(capPts[0]) ?? end : end;
  const capLast = capPts.length ? placed(capPts[capPts.length - 1]!) ?? end : end;
  // Start where both lines exist, so neither panel opens on an empty stretch.
  const min = [first(price), shiftMonths(capFirst, lead)].sort()[1] as string;
  // Run past today when the shifted capacity does: that stretch is the point.
  const shiftedEnd = shiftMonths(capLast, lead);
  const max = shiftedEnd > end ? shiftedEnd : end;
  const marker = max > end ? { date: end, label: t.today } : null;

  return (
    <div className="thesis">
      <div className="bar">
        <span className="filter-label">{t.lead}</span>
        {LEADS.map((n) => (
          <button key={n} aria-pressed={lead === n} onClick={() => setLead(n)}>
            {t.leadOption(n)}
          </button>
        ))}
        {lag && (
          <>
            <span className="filter-label bar-gap">{t.align}</span>
            <button aria-pressed={align === "period"} onClick={() => setAlign("period")}>
              {t.alignPeriod}
            </button>
            <button aria-pressed={align === "release"} onClick={() => setAlign("release")}>
              {t.alignRelease}
            </button>
          </>
        )}
      </div>
      {align === "release" && lag && <p className="section-note">{t.alignNote(lag.median_days)}</p>}
      <div className="wall">
        <PanelChart
          panel={capacity}
          title={nameOf(capacity, locale) + t.shifted(lead)}
          shift={lead}
          align={align}
          group={GROUP}
          min={min}
          max={max}
          marker={marker}
          size="hero"
          anchor={false}
          locale={locale}
        />
        <PanelChart
          panel={price}
          group={GROUP}
          min={min}
          max={max}
          marker={marker}
          size="hero"
          showAxisLabels
          locale={locale}
        />
      </div>
    </div>
  );
}
