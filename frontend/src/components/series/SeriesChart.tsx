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

import { useEffect, useMemo, useState } from "react";
import { useAlign } from "@/lib/useAlign";
import type { Panel } from "@/types/generated/wall";
import { PanelChart } from "@/charts/PanelChart";
import { DEFAULT_RANGE, PRESETS, bounds, parseRange, rangeParams, type Range } from "@/lib/range";
import { readParams, writeParams } from "@/lib/urlState";
import { windowStats } from "@/lib/windowStats";
import { UNITS, parseUnits, transform, unitAfter, type Units } from "@/lib/transform";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { Term } from "@/components/Term";
import { WindowFacts } from "./WindowFacts";

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
  const [range, setRange] = useState<Range>(DEFAULT_RANGE);
  const [align, setAlign] = useAlign();
  // A window someone zoomed into is a view they can send. The prerendered
  // page cannot know the query, so it is read once mounted and written back
  // only after that, or the first render would erase it.
  const [units, setUnits] = useState<Units>("level");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const q = readParams();
    setRange(parseRange(q));
    setUnits(parseUnits(q.get("u")));
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) writeParams({ ...rangeParams(range), u: units === "level" ? null : units });
  }, [range, units, ready]);
  // The series as the reader asked to see it (lib/transform.ts). A threshold
  // is a level, so it goes with the level view.
  const drawn = useMemo(
    () =>
      units === "level"
        ? panel
        : {
            ...panel,
            points: transform(panel.points, units),
            unit: unitAfter(units, panel.unit),
            threshold: null,
          },
    [panel, units]
  );
  const first = panel.points.find((p) => p.v != null)?.d ?? start;
  // A forecast runs past today; its last point is the reason to look.
  const last = panel.points[panel.points.length - 1]?.d ?? end;
  const until = last > end ? last : end;
  const [min, max] = bounds(range, first > start ? first : start, until);
  const chosen = range.kind === "custom" || range.preset !== "all";
  const stats = useMemo(
    () => (chosen ? windowStats(drawn.points, min, max, align) : null),
    [chosen, drawn.points, min, max, align]
  );
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
          <button onClick={() => setRange(DEFAULT_RANGE)}>
            {t.wall.reset}
          </button>
        )}
        {panel.release_lag && (
          <>
            <span className="filter-label bar-gap">
              <Term id="releaseVsPeriod" locale={locale}>
                {t.overview.align}
              </Term>
            </span>
            <button aria-pressed={align === "period"} onClick={() => setAlign("period")}>
              {t.overview.alignPeriod}
            </button>
            <button aria-pressed={align === "release"} onClick={() => setAlign("release")}>
              {t.overview.alignRelease}
            </button>
          </>
        )}
      </div>
      {!panel.forecast && (
      <div className="bar">
        <span className="filter-label">{t.units.label}</span>
        {UNITS.map((u) => (
          <button key={u} aria-pressed={units === u} onClick={() => setUnits(u)}>
            {t.units[u]}
          </button>
        ))}
      </div>
      )}
      <div className="wall">
        <PanelChart
          panel={drawn}
          group={GROUP}
          min={min}
          max={max}
          align={align}
          marker={marker}
          startNote={
            align === "release" ? t.chart.datedFrom : asOf ? t.asOf.startsAt : undefined
          }
          size="hero"
          showAxisLabels
          locale={locale}
          onZoom={(a, b) => setRange({ kind: "custom", min: a, max: b })}
          onReset={() => setRange(DEFAULT_RANGE)}
        />
      </div>
      {chosen ? (
        <WindowFacts
          stats={stats}
          unit={drawn.unit}
          // A percentage change of a percentage, or of a change, is not
          // something anyone reads correctly.
          pct={units === "level"}
          locale={locale}
        />
      ) : (
        <p className="hint window-hint">{t.span.hint}</p>
      )}
    </div>
  );
}
