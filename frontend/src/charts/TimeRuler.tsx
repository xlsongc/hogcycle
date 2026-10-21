"use client";

/**
 * A bare time axis that stays on screen while the wall scrolls under it.
 *
 * The wall is thirteen panels tall and only its last panel can afford axis
 * labels, so reading 能繁母猪 at the top meant scrolling 1,900px to find out
 * what year a turn happened in. This axis joins the wall's pointer group: it
 * shows the hovered date as a label, and scrubbing along it moves the
 * crosshair on every panel. Its insets match panelOption's grid, so its
 * ticks sit exactly above theirs.
 */

import { useEffect, useRef } from "react";
import { echarts } from "./base/echarts";
import { NUM_PX, cssVar, chartFont } from "./base/ink";
import { syncPointer } from "./base/pointerSync";
import { toIso } from "@/lib/dates";

type Props = { group: string; min: string; max: string };

export function TimeRuler({ group, min, max }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const chart = echarts.init(el, null, { renderer: "canvas" });

    const render = () => {
      const muted = cssVar("--muted", "#72716c");
      const grid = cssVar("--grid", "#e1e0d9");
      chart.setOption({
        animation: false,
        grid: { left: 58, right: 58, top: 4, bottom: 22 },
        xAxis: {
          type: "time",
          min,
          max,
          axisLine: { lineStyle: { color: grid } },
          axisTick: { show: true, lineStyle: { color: grid } },
          axisLabel: { color: muted, fontFamily: chartFont(), fontSize: NUM_PX },
          splitLine: { show: false },
          axisPointer: {
            show: true,
            triggerTooltip: false,
            lineStyle: { color: muted, width: 1 },
            label: {
              show: true,
              formatter: (p: { value: unknown }) => toIso(Number(p.value)),
              fontFamily: chartFont(),
              fontSize: NUM_PX,
              padding: [3, 6],
              color: cssVar("--page", "#fff"),
              backgroundColor: cssVar("--ink", "#000"),
            },
          },
        },
        yAxis: { type: "value", show: false, min: 0, max: 1 },
        // An axis pointer needs a series on its axis to attach to; this one
        // draws nothing.
        series: [{ type: "line", data: [[min, 0]], silent: true, symbol: "none", lineStyle: { opacity: 0 } }],
      });
    };
    render();
    // grid.top is 4, so y 5 is inside the ruler's thin plot.
    const unsync = syncPointer(chart, el, group, undefined, () => 5);

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", render);
    window.addEventListener("hogcycle:theme", render);
    return () => {
      unsync();
      ro.disconnect();
      mq.removeEventListener("change", render);
      window.removeEventListener("hogcycle:theme", render);
      chart.dispose();
    };
  }, [group, min, max]);

  return <div ref={host} className="ruler" aria-hidden="true" />;
}
