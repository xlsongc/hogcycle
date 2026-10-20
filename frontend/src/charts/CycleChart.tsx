"use client";

/**
 * Cycles of one series laid over each other, by months since each start the
 * reader picked (lib/cycles.ts).
 *
 * One series, so one unit: no second axis and no mixing of calibers. Indexed
 * to 100 at each start where the series stays above zero, in its own units
 * where it does not. Colour follows the cycle's slot in the reader's list,
 * from the validated overlay order, and the legend names each start.
 */

import { useEffect, useMemo, useRef } from "react";
import type { Cycle } from "@/lib/cycles";
import { echarts } from "./base/echarts";
import { fmt, slotColor } from "./base/theme";
import { NUM_PX, cssVar, labelPx, monoFont } from "./base/ink";
import { unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { periodLabel } from "@/lib/period";

type Props = {
  cycles: Cycle[];
  horizon: number;
  indexed: boolean;
  unit: string;
  locale: Locale;
};

/** Contract text goes into the tooltip's HTML, so it is escaped. */
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function CycleChart({ cycles, horizon, indexed, unit, locale }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const t = dict(locale).cycles;
  const drawn = useMemo(() => cycles.filter((c) => c.points.length > 1), [cycles]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const chart = echarts.init(el, null, { renderer: "canvas" });
    const yUnit = indexed ? "index" : unit;

    const render = () => {
      const muted = cssVar("--muted", "#72716c");
      const grid = cssVar("--grid", "#e1e0d9");
      const ink = cssVar("--ink", "#0b0b0b");
      const surface = cssVar("--surface-1", "#fcfcfb");
      chart.setOption(
        {
          animation: false,
          grid: { left: 62, right: 26, top: 12, bottom: 54 },
          legend: {
            show: true,
            bottom: 0,
            icon: "roundRect",
            itemWidth: 12,
            itemHeight: 2,
            textStyle: { color: muted, fontSize: labelPx(locale), fontFamily: monoFont() },
          },
          tooltip: {
            trigger: "axis",
            backgroundColor: surface,
            borderColor: cssVar("--border", "rgba(0,0,0,.1)"),
            textStyle: { color: ink, fontSize: labelPx(locale), fontFamily: monoFont() },
            axisPointer: { type: "line", lineStyle: { color: muted, width: 1 } },
            formatter: (raw: unknown) => {
              const items = (Array.isArray(raw) ? raw : [raw]) as {
                seriesIndex?: number;
                marker?: string;
                axisValue?: unknown;
              }[];
              const at = Number(items[0]?.axisValue ?? 0);
              // Each cycle's reading nearest the pointer, so cycles of a
              // weekly series agree on which month is being read.
              const rows = drawn.map((c, i) => {
                let best = c.points[0];
                for (const p of c.points) {
                  if (best && Math.abs(p.x - at) < Math.abs(best.x - at)) best = p;
                }
                if (!best || Math.abs(best.x - at) > 1.5) return null;
                const marker = items.find((it) => it.seriesIndex === i)?.marker ?? "";
                const value = indexed
                  ? `${fmt(best.y, "index", locale)} · ${fmt(best.v, unit, locale)} ${unitOf(unit, locale)}`
                  : `${fmt(best.v, unit, locale)} ${unitOf(unit, locale)}`;
                return `${marker}${esc(t.legend(c.anchor))}&nbsp;&nbsp;${esc(value)}<br/><span style="color:${muted}">${esc(periodLabel(best.d, best.g, locale))}</span>`;
              });
              return [esc(t.monthsIn(Math.round(at))), ...rows.filter(Boolean)].join("<br/>");
            },
          },
          xAxis: {
            type: "value",
            min: 0,
            max: horizon,
            interval: horizon > 36 ? 12 : 6,
            axisLine: { lineStyle: { color: grid } },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: {
              color: muted,
              fontSize: NUM_PX,
              fontFamily: monoFont(),
              formatter: (v: number) => t.tick(v),
            },
          },
          yAxis: {
            type: "value",
            scale: true,
            splitLine: { lineStyle: { color: grid } },
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: muted,
              fontSize: NUM_PX,
              fontFamily: monoFont(),
              formatter: (v: number) => fmt(v, yUnit, locale),
            },
          },
          series: [
            ...drawn.map((c) => {
              const color = slotColor(cycles.indexOf(c));
              return {
                type: "line" as const,
                name: t.legend(c.anchor),
                data: c.points.map((p) => [p.x, p.y] as [number, number]),
                showSymbol: false,
                lineStyle: { width: 2, color },
                itemStyle: { color, borderColor: surface, borderWidth: 2 },
                emphasis: { focus: "series" as const },
              };
            }),
            // The start line: everything above 100 is above where its
            // cycle began.
            ...(indexed
              ? [
                  {
                    type: "line" as const,
                    name: "",
                    data: [] as [number, number][],
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
  }, [cycles, drawn, horizon, indexed, unit, locale, t]);

  return (
    <div
      ref={host}
      className="overlay-chart"
      role="img"
      aria-label={t.label(drawn.length, horizon, indexed)}
    />
  );
}
