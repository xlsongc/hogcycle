"use client";

/**
 * Every live-hog contract's settles, week by week from listing to delivery,
 * on one time axis (gold/market.py). The contracts still trading are drawn
 * in the market tier's colour and labelled at their ends; the delivered ones
 * are thin and muted, the history the live ones are read against. Pointing
 * at a week lists the curve as it stood then: each contract's settle that
 * week, by delivery month.
 */

import { useEffect, useRef } from "react";
import type { History } from "@/types/generated/wall";
import { echarts } from "./base/echarts";
import { fmt } from "./base/theme";
import { NUM_PX, cssVar, labelPx, monoFont, tierColor } from "./base/ink";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

type Props = { history: History[]; unit: string; locale: Locale };

const DAY = 86_400_000;
// A weekly settle is "that week's" within half a week of the pointer.
const NEAR = 3.5 * DAY;
const time = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function CurveHistoryChart({ history, unit, locale }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const t = dict(locale).futures;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const chart = echarts.init(el, null, { renderer: "canvas" });

    const render = () => {
      const muted = cssVar("--muted", "#72716c");
      const grid = cssVar("--grid", "#e1e0d9");
      const ink = cssVar("--ink", "#0b0b0b");
      const surface = cssVar("--surface-1", "#fcfcfb");
      const live = tierColor("market");
      chart.setOption(
        {
          animation: false,
          grid: { left: 62, right: 62, top: 12, bottom: 28 },
          tooltip: {
            trigger: "axis",
            backgroundColor: surface,
            borderColor: cssVar("--border", "rgba(0,0,0,.1)"),
            textStyle: { color: ink, fontSize: labelPx(locale), fontFamily: monoFont() },
            axisPointer: { type: "line", lineStyle: { color: muted, width: 1 } },
            formatter: (raw: unknown) => {
              const first = (Array.isArray(raw) ? raw : [raw])[0] as { axisValue?: unknown };
              const at = Number(first?.axisValue ?? 0);
              let day = "";
              const rows = history.flatMap((h) => {
                let best: { d: string; v: number } | undefined;
                for (const s of h.settles) {
                  const gap = Math.abs(time(s.d) - at);
                  if (gap <= NEAR && (!best || gap < Math.abs(time(best.d) - at))) best = s;
                }
                if (!best) return [];
                if (best.d > day) day = best.d;
                const color = h.delivered ? muted : live;
                return [
                  `<span style="color:${color}">${t.contract(h.delivery)}</span>&nbsp;&nbsp;${fmt(best.v, unit, locale)}`,
                ];
              });
              return rows.length ? [`<span style="color:${muted}">${day}</span>`, ...rows].join("<br/>") : "";
            },
          },
          xAxis: {
            type: "time",
            axisLine: { lineStyle: { color: grid } },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { color: muted, fontSize: NUM_PX, fontFamily: monoFont() },
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
              formatter: (v: number) => fmt(v, unit, locale),
            },
          },
          series: history.map((h) => ({
            type: "line" as const,
            name: t.contract(h.delivery),
            data: h.settles.map((s) => [time(s.d), s.v] as [number, number]),
            showSymbol: false,
            lineStyle: h.delivered
              ? { width: 1, color: muted, opacity: 0.55 }
              : { width: 2, color: live },
            itemStyle: { color: h.delivered ? muted : live },
            z: h.delivered ? 2 : 3,
            endLabel: {
              show: !h.delivered,
              formatter: () => t.contract(h.delivery),
              color: live,
              fontSize: NUM_PX,
              fontFamily: monoFont(),
            },
            labelLayout: { moveOverlap: "shiftY" as const },
            emphasis: { focus: "series" as const },
          })),
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
  }, [history, unit, locale, t]);

  return (
    <div ref={host} className="overlay-chart" role="img" aria-label={t.chartLabel(history.length)} />
  );
}
