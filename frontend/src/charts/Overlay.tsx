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
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  AxisPointerComponent,
  MarkLineComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

import type { Panel } from "@/types/generated/wall";
import { cssVar, fmt, slotColor } from "./base/theme";

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  AxisPointerComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

export type LagSpec = { id: string; months: number };

type Props = {
  panels: Panel[];
  /** Selection order is irrelevant to colour; `slots` owns that. */
  selected: string[];
  slots: Map<string, number>;
  min: string;
  max: string;
  lag: LagSpec | null;
};

/** Shifts a date forward by whole months, clamping to the month's length. */
function shiftMonths(iso: string, months: number): string {
  if (!months) return iso;
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const total = (y * 12 + (m - 1)) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

export function Overlay({ panels, selected, slots, min, max, lag }: Props) {
  const host = useRef<HTMLDivElement>(null);

  const chosen = useMemo(
    () => selected.map((id) => panels.find((p) => p.id === id)).filter((p): p is Panel => !!p),
    [panels, selected]
  );

  // One shared unit means raw values are honest and more informative; mixed
  // units leave indexing as the only non-misleading option.
  const units = new Set(chosen.map((p) => p.unit));
  const indexed = units.size > 1;

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
    ? `指数（起点=100${log ? "，对数轴" : ""}）`
    : (chosen[0]?.unit ?? "");

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const chart = echarts.init(el, null, { renderer: "canvas" });

    const render = () => {
      const muted = cssVar("--muted", "#898781");
      const grid = cssVar("--grid", "#e1e0d9");
      const ink = cssVar("--ink", "#0b0b0b");
      const surface = cssVar("--surface-1", "#fcfcfb");

      const series = chosen.map((panel) => {
        const shift = lag && lag.id === panel.id ? lag.months : 0;
        const inWindow = panel.points.filter((p) => {
          const d = shiftMonths(p.d, shift);
          return d >= min && d <= max && p.v != null;
        });
        const base = inWindow[0]?.v ?? null;

        const data = inWindow.map((p) => {
          const v = p.v as number;
          return [
            shiftMonths(p.d, shift),
            indexed ? (base ? (v / base) * 100 : null) : v,
          ] as [string, number | null];
        });

        const color = slotColor(slots.get(panel.id) ?? 0);
        return {
          type: "line" as const,
          name: panel.name + (shift ? ` (前移${shift}月)` : ""),
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
            textStyle: { color: muted, fontSize: 11, fontFamily: "Departure Mono, monospace" },
            formatter: (name: string) => {
              const v = finals.get(name);
              return v == null ? name : `${name}  ${fmt(v, indexed ? "index" : (chosen[0]?.unit ?? ""))}`;
            },
          },
          tooltip: {
            trigger: "axis",
            backgroundColor: surface,
            borderColor: cssVar("--border", "rgba(0,0,0,.1)"),
            textStyle: { color: ink, fontSize: 11, fontFamily: "Departure Mono, monospace" },
            axisPointer: { type: "line", lineStyle: { color: muted, width: 1 } },
            valueFormatter: (v: unknown) =>
              typeof v === "number" ? fmt(v, indexed ? "index" : (chosen[0]?.unit ?? "")) : "—",
          },
          xAxis: {
            type: "time",
            min,
            max,
            axisLine: { lineStyle: { color: grid } },
            axisTick: { show: false },
            axisLabel: { color: muted, fontSize: 11, fontFamily: "Departure Mono, monospace" },
          },
          yAxis: {
            type: log ? "log" : "value",
            scale: !indexed,
            splitLine: { lineStyle: { color: grid } },
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: muted,
              fontSize: 11,
              fontFamily: "Departure Mono, monospace",
              formatter: (v: number) => fmt(v, indexed ? "index" : (chosen[0]?.unit ?? "")),
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
  }, [chosen, slots, min, max, lag, indexed, log]);

  return (
    <div className="overlay-card">
      <div className="overlay-head">
        <span className="panel-unit">{unitLabel}</span>
        {indexed && (
          <span className="hint">
            所选序列单位不一致，已全部指数化到窗口起点 —— 比较的是相对涨跌，不是水平
            {log ? "。跨度超过 10 倍，已切换对数轴，使等百分比涨幅占等高" : ""}
          </span>
        )}
      </div>
      <div
        ref={host}
        className="overlay-chart"
        role="img"
        aria-label={`叠放图，${chosen.length} 条序列，${indexed ? "指数化" : "原值"}`}
      />
    </div>
  );
}
