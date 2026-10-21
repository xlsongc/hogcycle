"use client";

/**
 * One series, one line per calendar year over a shared January–December
 * axis (lib/seasons.ts). The latest year is drawn heavier, so it reads as
 * "this year against the others" without a colour having to say so.
 */

import { useEffect, useRef } from "react";
import type { Season } from "@/lib/seasons";
import { echarts } from "./base/echarts";
import { fmt, slotColor } from "./base/theme";
import { NUM_PX, cssVar, labelPx, chartFont } from "./base/ink";
import { unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

type Props = { seasons: Season[]; unit: string; locale: Locale };

/** Day of the year each month starts on, in lib/seasons.ts's calendar. */
const MONTH_STARTS = [1, 32, 61, 92, 122, 153, 183, 214, 245, 275, 306, 336];

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function SeasonChart({ seasons, unit, locale }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const t = dict(locale).seasons;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const chart = echarts.init(el, null, { renderer: "canvas" });
    const last = seasons.length - 1;

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
            textStyle: { color: muted, fontSize: labelPx(locale), fontFamily: chartFont() },
          },
          tooltip: {
            trigger: "axis",
            backgroundColor: surface,
            borderColor: cssVar("--border", "rgba(0,0,0,.1)"),
            textStyle: { color: ink, fontSize: labelPx(locale), fontFamily: chartFont() },
            axisPointer: { type: "line", lineStyle: { color: muted, width: 1 } },
            formatter: (raw: unknown) => {
              const items = (Array.isArray(raw) ? raw : [raw]) as {
                seriesIndex?: number;
                marker?: string;
                axisValue?: unknown;
              }[];
              const at = Number(items[0]?.axisValue ?? 1);
              const rows = seasons.map((s, i) => {
                let best = s.points[0];
                for (const p of s.points) {
                  if (best && Math.abs(p.x - at) < Math.abs(best.x - at)) best = p;
                }
                // A week either side: past that, the year has no reading here.
                if (!best || Math.abs(best.x - at) > 10) return null;
                const marker = items.find((it) => it.seriesIndex === i)?.marker ?? "";
                return `${marker}${s.year}&nbsp;&nbsp;${esc(fmt(best.v, unit, locale))} ${esc(unitOf(unit, locale))}&nbsp;<span style="color:${muted}">${best.d}</span>`;
              });
              return rows.filter(Boolean).reverse().join("<br/>");
            },
          },
          xAxis: {
            type: "value",
            min: 1,
            max: 366,
            axisLine: { lineStyle: { color: grid } },
            axisTick: { show: false },
            splitLine: { show: false },
            // Ticks at each month's first day, labelled by month.
            interval: 30.5,
            axisLabel: {
              color: muted,
              fontSize: NUM_PX,
              fontFamily: chartFont(),
              // The ticks step 30.5 days from day 1, so they drift either
              // side of the month starts: label each by the start nearest it.
              // Taking the start at or before it named the 31.5 tick January
              // twice and dropped February; the axis end (366) is no start.
              formatter: (v: number) => {
                let m = 0;
                MONTH_STARTS.forEach((s, i) => {
                  if (Math.abs(v - s) < Math.abs(v - (MONTH_STARTS[m] ?? 1))) m = i;
                });
                return Math.abs(v - (MONTH_STARTS[m] ?? 1)) <= 3 ? t.month(m + 1) : "";
              },
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
              fontFamily: chartFont(),
              formatter: (v: number) => fmt(v, unit, locale),
            },
          },
          series: seasons.map((s, i) => {
            const color = slotColor(i);
            return {
              type: "line" as const,
              name: String(s.year),
              data: s.points.map((p) => [p.x, p.v] as [number, number]),
              showSymbol: false,
              lineStyle: { width: i === last ? 3 : 1.5, color, opacity: i === last ? 1 : 0.8 },
              itemStyle: { color },
              z: i === last ? 3 : 2,
              emphasis: { focus: "series" as const },
            };
          }),
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
  }, [seasons, unit, locale, t]);

  return (
    <div
      ref={host}
      className="overlay-chart"
      role="img"
      aria-label={t.label(seasons.map((s) => s.year))}
    />
  );
}
