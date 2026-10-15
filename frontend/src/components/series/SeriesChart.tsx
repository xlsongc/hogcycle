"use client";

/**
 * One series, large, with its whole history in reach: the window presets the
 * wall has, and — where the source dates its releases — the choice to place
 * each reading at the day it was published.
 *
 * Opens on all history, unlike the wall. On the wall five years keeps
 * seventeen panels comparable; here the reader came for this series, and the
 * long view is what a single series page is for.
 */

import { useState } from "react";
import type { Panel } from "@/types/generated/wall";
import { PanelChart } from "@/charts/PanelChart";
import { PRESETS, bounds, type Range } from "@/lib/range";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

const GROUP = "hogcycle-series";

type Props = {
  panel: Panel;
  start: string;
  end: string;
  /** The day the page stands on, marked on the chart (docs/adr/0025). */
  asOf?: string | null;
  locale: Locale;
};

export function SeriesChart({ panel, start, end, asOf = null, locale }: Props) {
  const t = dict(locale);
  const [range, setRange] = useState<Range>({ kind: "preset", preset: "all" });
  const [align, setAlign] = useState<"period" | "release">("period");
  const first = panel.points.find((p) => p.v != null)?.d ?? start;
  // A forecast runs past today; its last point is the reason to look.
  const last = panel.points[panel.points.length - 1]?.d ?? end;
  const until = last > end ? last : end;
  const [min, max] = bounds(range, first > start ? first : start, until);
  const marker = asOf
    ? { date: asOf, label: t.asOf.marker }
    : until > end
    ? { date: end, label: t.overview.today }
    : null;

  return (
    <div className="thesis">
      <div className="bar">
        <span className="filter-label">{t.window.label}</span>
        {PRESETS.map((p) => (
          <button
            key={p}
            aria-pressed={range.kind === "preset" && range.preset === p}
            onClick={() => setRange({ kind: "preset", preset: p })}
          >
            {t.window.ranges[p]}
          </button>
        ))}
        {range.kind === "custom" && (
          <button onClick={() => setRange({ kind: "preset", preset: "all" })}>
            {t.wall.reset}
          </button>
        )}
        {panel.release_lag && (
          <>
            <span className="filter-label bar-gap">{t.overview.align}</span>
            <button aria-pressed={align === "period"} onClick={() => setAlign("period")}>
              {t.overview.alignPeriod}
            </button>
            <button aria-pressed={align === "release"} onClick={() => setAlign("release")}>
              {t.overview.alignRelease}
            </button>
          </>
        )}
      </div>
      <div className="wall">
        <PanelChart
          panel={panel}
          group={GROUP}
          min={min}
          max={max}
          align={align}
          marker={marker}
          startNote={asOf ? t.asOf.startsAt : undefined}
          size="hero"
          showAxisLabels
          locale={locale}
          onZoom={(a, b) => setRange({ kind: "custom", min: a, max: b })}
          onReset={() => setRange({ kind: "preset", preset: "all" })}
        />
      </div>
    </div>
  );
}
