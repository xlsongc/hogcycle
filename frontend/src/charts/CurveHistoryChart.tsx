"use client";

/**
 * Every live-hog contract's settles, week by week from listing to delivery,
 * on one time axis (gold/market.py). One contract is in focus: drawn thick
 * and labelled, and, unless the whole history is asked for, the axes close
 * in on its life with its neighbours faint behind it. A delivered contract
 * in focus carries its last settle as a dashed line. Clicking a line puts
 * that contract in focus. Pointing at a week lists every contract's settle
 * that week.
 */

import { useEffect, useRef } from "react";
import type { History } from "@/types/generated/wall";
import { echarts } from "./base/echarts";
import { fmt } from "./base/theme";
import { NUM_PX, cssVar, labelPx, chartFont, tierColor } from "./base/ink";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

type Props = {
  history: History[];
  unit: string;
  locale: Locale;
  /** The delivery month in focus. */
  focus?: string;
  /** Every contract since the first, rather than the one in focus. */
  whole?: boolean;
  onPick?: (delivery: string) => void;
};

const DAY = 86_400_000;
// A weekly settle is "that week's" within half a week of the pointer.
const NEAR = 3.5 * DAY;
const PAD = 14 * DAY;
const time = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function CurveHistoryChart({ history, unit, locale, focus, whole, onPick }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const t = dict(locale).futures;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const chart = echarts.init(el, null, { renderer: "canvas" });
    const focused = history.find((h) => h.delivery === focus);
    const born = focused?.settles[0];
    const ends = focused?.settles[focused.settles.length - 1];

    // The window, and the value range of whatever falls inside it.
    const all = history.flatMap((h) => h.settles.map((s) => time(s.d)));
    const [x0, x1] =
      born && ends && !whole
        ? [time(born.d) - PAD, time(ends.d) + PAD]
        : [Math.min(...all), Math.max(...all)];
    const seen = history.flatMap((h) =>
      h.settles.filter((s) => time(s.d) >= x0 && time(s.d) <= x1).map((s) => s.v)
    );
    const lo = Math.min(...seen);
    const hi = Math.max(...seen);
    // Round ends on a round step, so no tick label crowds the axis's own.
    const step = [100, 200, 250, 500, 1000, 2000, 2500, 5000].find((x) => (hi - lo) / x <= 6) ?? 10000;

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
            textStyle: { color: ink, fontSize: labelPx(locale), fontFamily: chartFont() },
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
                const color = h.delivered && h !== focused ? muted : live;
                const name = t.contract(h.delivery);
                return [
                  `<span style="color:${color}">${h === focused ? `<b>${name}</b>` : name}</span>&nbsp;&nbsp;${fmt(best.v, unit, locale)}`,
                ];
              });
              return rows.length ? [`<span style="color:${muted}">${day}</span>`, ...rows].join("<br/>") : "";
            },
          },
          xAxis: {
            type: "time",
            min: x0,
            max: x1,
            axisLine: { lineStyle: { color: grid } },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { color: muted, fontSize: NUM_PX, fontFamily: chartFont(), hideOverlap: true },
          },
          yAxis: {
            type: "value",
            min: Math.floor(lo / step) * step,
            max: Math.ceil(hi / step) * step,
            interval: step,
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
          series: history.map((h) => {
            const on = h === focused;
            const last = h.settles[h.settles.length - 1];
            return {
              type: "line" as const,
              name: t.contract(h.delivery),
              data: h.settles.map((s) => [time(s.d), s.v] as [number, number]),
              showSymbol: false,
              triggerLineEvent: true,
              cursor: onPick ? "pointer" : "default",
              lineStyle: on
                ? { width: 2.5, color: live }
                : h.delivered
                ? { width: 1, color: muted, opacity: focused ? 0.35 : 0.55 }
                : { width: focused ? 1.25 : 2, color: live, opacity: focused ? 0.35 : 1 },
              itemStyle: { color: h.delivered && !on ? muted : live },
              z: on ? 4 : h.delivered ? 2 : 3,
              endLabel: {
                show: on || (!focused && !h.delivered),
                formatter: () => t.contract(h.delivery),
                color: live,
                fontSize: NUM_PX,
                fontFamily: chartFont(),
                fontWeight: on ? 600 : 400,
              },
              labelLayout: { moveOverlap: "shiftY" as const },
              markLine:
                on && h.delivered && last
                  ? {
                      silent: true,
                      symbol: "none",
                      lineStyle: { color: ink, type: "dashed" as const, width: 1 },
                      label: {
                        position: "insideStartTop" as const,
                        color: ink,
                        fontSize: NUM_PX,
                        fontFamily: chartFont(),
                        formatter: () => t.finalLine(fmt(last.v, unit, locale)),
                      },
                      data: [{ yAxis: last.v }],
                    }
                  : undefined,
            };
          }),
        },
        { notMerge: true }
      );
    };

    render();
    chart.on("click", (p: { seriesIndex?: number }) => {
      const h = p.seriesIndex == null ? undefined : history[p.seriesIndex];
      if (h) pick.current?.(h.delivery);
    });
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
  }, [history, unit, locale, t, focus, whole]);

  const shown = history.find((h) => h.delivery === focus);
  return (
    <div
      ref={host}
      className="overlay-chart"
      role="img"
      aria-label={shown && !whole ? t.contractLabel(t.contract(shown.delivery)) : t.chartLabel(history.length)}
    />
  );
}
