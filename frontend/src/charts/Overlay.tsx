"use client";

/**
 * The configurable overlay: pick any series, put them on one time axis.
 *
 * The request "let me stack whichever curves I want" collides head-on with the
 * one rule this project will not bend — no dual axis. 能繁母猪 (4,000 万头)
 * and 猪价 (11 元/公斤) on one scale flattens the price into the baseline;
 * on two scales the alignment between them is arbitrary and the chart invents
 * a correlation the data does not contain.
 *
 * The way out is normalisation, and which one depends on what was selected:
 *
 *   every series shares a unit  ->  raw values, one axis. Comparing 猪价,
 *                                   白条肉 and 仔猪价 in 元/公斤 is a real
 *                                   comparison and the levels carry meaning.
 *   units differ                ->  index every series to 100 at the first
 *                                   date in view. Levels become relative
 *                                   moves, which is what a mixed-unit
 *                                   comparison can honestly answer.
 *
 * Chosen automatically, and the axis says which mode is in force.
 */

import { useEffect, useMemo, useRef } from "react";
import { nameOf, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { shiftMonths, toIso } from "@/lib/dates";
import { lagDays, periodLabel } from "@/lib/period";
import { hasReleases, type Align } from "@/lib/useAlign";

import type { Panel, Point } from "@/types/generated/wall";
import { echarts } from "./base/echarts";
import { fmt, slotColor } from "./base/theme";
import { NUM_PX, cssVar, labelPx, monoFont } from "./base/ink";

export type LagSpec = { id: string; months: number };

type Props = {
  panels: Panel[];
  /** Selection order is irrelevant to colour; `slots` owns that. */
  selected: string[];
  slots: Map<string, number>;
  min: string;
  max: string;
  lag: LagSpec | null;
  /** Where readings go: at their period, or at the day they were published,
   *  where an undated source has no place and is named as left out. */
  align?: Align;
  locale: Locale;
};

type TipItem = {
  seriesIndex?: number;
  seriesName?: string;
  marker?: string;
  value?: unknown;
  axisValue?: unknown;
};

/** Contract text goes into the tooltip's HTML, so it is escaped. */
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function Overlay({ panels, selected, slots, min, max, lag, align = "period", locale }: Props) {
  const t = dict(locale);
  const host = useRef<HTMLDivElement>(null);

  const picked = useMemo(
    () => selected.map((id) => panels.find((p) => p.id === id)).filter((p): p is Panel => !!p),
    [panels, selected]
  );
  const placed = useMemo(
    () => (align === "release" ? picked.filter((p) => hasReleases(p.points)) : picked),
    [picked, align]
  );
  const undated = picked.filter((p) => !placed.includes(p));

  // One shared unit means raw values are honest and more informative; mixed
  // units leave indexing as the only non-misleading option. An index divides
  // by the first value, which means nothing for a series that crosses zero:
  // a profit of 32 that turns to a loss of 244 would read as -760. Such a
  // series is named and left out of an indexed view, never drawn as one.
  const mixed = new Set(placed.map((p) => p.unit)).size > 1;
  const chosen = useMemo(
    () => (mixed ? placed.filter((p) => p.points.every((q) => q.v == null || q.v > 0)) : placed),
    [placed, mixed]
  );
  const signed = placed.filter((p) => !chosen.includes(p));
  const indexed = new Set(chosen.map((p) => p.unit)).size > 1;

  // Indexing alone is not enough once the spans differ by an order of
  // magnitude. 牧原 is up ~20x since 2015 (index 2000) while 能繁母猪 moved
  // between 85 and 100; on a linear axis the sow line is pinned flat against
  // the baseline and the comparison the chart exists for is unreadable. A log
  // axis gives equal percentage moves equal height, which is precisely what
  // "compare relative change" means. Reserved for when it is needed, since a
  // log axis costs the casual reader something.
  const spread = useMemo(() => {
    if (!indexed) return 1;
    const ratios = chosen.map((p) => {
      const vs = p.points
        .filter((q) => q.d >= min && q.d <= max && q.v != null)
        .map((q) => q.v as number);
      const base = vs[0];
      if (!base || !vs.length) return 1;
      const rel = vs.map((v) => v / base);
      return Math.max(...rel) / Math.min(...rel.filter((r) => r > 0));
    });
    return Math.max(...ratios, 1);
  }, [chosen, indexed, min, max]);

  const log = indexed && spread > 10;
  const unitLabel = indexed
    ? t.overlay.indexAxis(log)
    : unitOf(chosen[0]?.unit ?? "", locale);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const chart = echarts.init(el, null, { renderer: "canvas" });

    const render = () => {
      const muted = cssVar("--muted", "#72716c");
      const grid = cssVar("--grid", "#e1e0d9");
      const ink = cssVar("--ink", "#0b0b0b");
      const surface = cssVar("--surface-1", "#fcfcfb");

      // The reading behind each drawn point, per series, for the tooltip:
      // which period a value describes, and how late it became public.
      const behind: Map<string, Point>[] = [];
      const series = chosen.map((panel) => {
        const shift = lag && lag.id === panel.id ? lag.months : 0;
        const inWindow = panel.points
          .filter((p) => p.v != null && (align === "period" || p.p != null))
          .map((p) => ({ x: shiftMonths(align === "release" ? (p.p as string) : p.d, shift), p }))
          .filter(({ x }) => x >= min && x <= max)
          .sort((a, b) => a.x.localeCompare(b.x));
        const base = inWindow[0]?.p.v ?? null;
        behind.push(new Map(inWindow.map(({ x, p }) => [x, p])));

        const data = inWindow.map(({ x, p }) => {
          const v = p.v as number;
          return [x, indexed ? (base ? (v / base) * 100 : null) : v] as [string, number | null];
        });

        const color = slotColor(slots.get(panel.id) ?? 0);
        return {
          type: "line" as const,
          name: nameOf(panel, locale) + (shift ? t.overlay.shifted(shift) : ""),
          data,
          showSymbol: false,
          connectNulls: false,
          lineStyle: { width: 2, color },
          itemStyle: { color, borderColor: surface, borderWidth: 2 },
          emphasis: { focus: "series" as const },
          // No end labels: two lines finishing at similar values write over
          // each other and ECharts does not dodge them. The legend below
          // carries name and final value together, which is one label per
          // series and cannot collide.
        };
      });

      // Final value per series, so the legend can carry identity and number
      // in one uncollidable place.
      const finals = new Map<string, number>();
      for (const sr of series) {
        const last = [...sr.data].reverse().find((d) => typeof d[1] === "number");
        if (last) finals.set(sr.name, last[1] as number);
      }

      chart.setOption(
        {
          animation: false,
          grid: { left: 62, right: 26, top: 12, bottom: 54 },
          legend: {
            show: chosen.length >= 2,
            bottom: 0,
            icon: "roundRect",
            itemWidth: 12,
            itemHeight: 2,
            textStyle: { color: muted, fontSize: labelPx(locale), fontFamily: monoFont() },
            formatter: (name: string) => {
              const v = finals.get(name);
              return v == null ? name : `${name}  ${fmt(v, indexed ? "index" : (chosen[0]?.unit ?? ""), locale)}`;
            },
          },
          tooltip: {
            trigger: "axis",
            backgroundColor: surface,
            borderColor: cssVar("--border", "rgba(0,0,0,.1)"),
            textStyle: { color: ink, fontSize: labelPx(locale), fontFamily: monoFont() },
            axisPointer: { type: "line", lineStyle: { color: muted, width: 1 } },
            formatter: (raw: unknown) => {
              const items = (Array.isArray(raw) ? raw : [raw]) as TipItem[];
              const at = items[0]?.axisValue;
              const head = typeof at === "number" ? toIso(at) : String(at ?? "");
              const rows = items
                .filter((i) => i.seriesName)
                .map((i) => {
                  const [x, v] = (i.value ?? []) as [string, number | null];
                  const value =
                    typeof v === "number"
                      ? fmt(v, indexed ? "index" : (chosen[0]?.unit ?? ""), locale)
                      : "—";
                  const p = behind[i.seriesIndex ?? -1]?.get(x);
                  const notes = p
                    ? [
                        align === "release" ? periodLabel(p.d, p.g, locale) : null,
                        p.p ? t.chart.published(p.p, lagDays(p.d, p.p)) : null,
                      ].filter(Boolean)
                    : [];
                  const note = notes.length
                    ? `<br/><span style="color:${muted}">${esc(notes.join(" · "))}</span>`
                    : "";
                  return `${i.marker ?? ""}${esc(i.seriesName ?? "")}&nbsp;&nbsp;${value}${note}`;
                });
              return [esc(head), ...rows].join("<br/>");
            },
          },
          xAxis: {
            type: "time",
            min,
            max,
            axisLine: { lineStyle: { color: grid } },
            axisTick: { show: false },
            axisLabel: { color: muted, fontSize: NUM_PX, fontFamily: monoFont() },
          },
          yAxis: {
            type: log ? "log" : "value",
            scale: !indexed,
            splitLine: { lineStyle: { color: grid } },
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: muted,
              fontSize: NUM_PX,
              fontFamily: monoFont(),
              formatter: (v: number) => fmt(v, indexed ? "index" : (chosen[0]?.unit ?? ""), locale),
            },
          },
          series: [
            ...series,
            // The 100 line is the reading aid that makes an indexed chart
            // legible: everything above it outperformed the window's start.
            ...(indexed
              ? [
                  {
                    type: "line" as const,
                    name: "",
                    data: [] as [string, number][],
                    silent: true,
                    markLine: {
                      silent: true,
                      symbol: "none",
                      data: [{ yAxis: 100 }],
                      lineStyle: { color: muted, width: 1, type: [3, 3] as [number, number] },
                      label: { show: false },
                    },
                  },
                ]
              : []),
          ],
        },
        { notMerge: true }
      );
    };

    render();
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", render);
    window.addEventListener("hogcycle:theme", render);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", render);
      window.removeEventListener("hogcycle:theme", render);
      chart.dispose();
    };
  }, [chosen, slots, min, max, lag, align, indexed, log, locale, t]);

  return (
    <div className="overlay-card">
      <div className="overlay-head">
        <span className="panel-unit">{unitLabel}</span>
        {indexed && (
          <span className="hint">{t.overlay.indexedNote(log)}</span>
        )}
        {undated.length > 0 && (
          <span className="hint">{t.compare.undated(undated.map((p) => nameOf(p, locale)))}</span>
        )}
        {signed.length > 0 && (
          <span className="hint">{t.compare.signed(signed.map((p) => nameOf(p, locale)))}</span>
        )}
      </div>
      <div
        ref={host}
        className="overlay-chart"
        role="img"
        aria-label={t.overlay.label(chosen.length, indexed)}
      />
    </div>
  );
}
