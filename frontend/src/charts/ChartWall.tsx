"use client";

/**
 * The wall: one panel per indicator, all sharing a single time axis.
 *
 * The point of the layout is the shared crosshair. Hovering any date reads
 * every indicator at that moment, so the causal chain — capacity, then margin,
 * then price — can be read down a single vertical line. `echarts.connect()`
 * gives that natively, which is the main reason ECharts won the stack choice
 * (docs/adr/0006); in any other library it is hand-written.
 */

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { LineChart, ScatterChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  MarkPointComponent,
  AxisPointerComponent,
  DataZoomComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

import type { Panel } from "@/types/generated/wall";
import { GRANULARITY_LABEL, TIER_LABEL, fmt, panelOption, tierColor } from "./base/theme";

echarts.use([
  LineChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  MarkPointComponent,
  AxisPointerComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

const GROUP = "hogcycle-wall";

const DAY = 86_400_000;
/** How far from the pointer an observation may sit and still count as being
 *  "at" that date. Scaled per granularity: an annual reading legitimately
 *  sits months from any given day, a daily one does not. */
const TOLERANCE_MS: Record<string, number> = {
  D: 20 * DAY,
  W: 30 * DAY,
  M: 50 * DAY,
  Q: 130 * DAY,
  A: 250 * DAY,
};

type Readout = { d: string; v: number | null; g: string };

/** null → the pointer is off the wall, so panels show their latest value.
 *  { hit: null } → the pointer is on the wall but this panel has nothing
 *  near that date, which must read as absence rather than as a number. */
type Probe = { hit: Readout | null } | null;

type Props = {
  panels: Panel[];
  min: string;
  max: string;
};

export function ChartWall({ panels, min, max }: Props) {
  return (
    <div className="wall">
      {panels.map((panel, i) => (
        <PanelChart
          key={panel.id}
          panel={panel}
          min={min}
          max={max}
          showAxisLabels={i === panels.length - 1}
        />
      ))}
    </div>
  );
}

function PanelChart({
  panel,
  min,
  max,
  showAxisLabels,
}: {
  panel: Panel;
  min: string;
  max: string;
  showAxisLabels: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [probe, setProbe] = useState<Probe>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const chart = echarts.init(el, null, { renderer: "canvas" });
    chart.group = GROUP;
    const render = () => chart.setOption(panelOption({ panel, min, max, showAxisLabels }));
    render();
    // connect() is idempotent per group, so a per-panel call on mount is safe.
    echarts.connect(GROUP);

    const onAxis = (raw: unknown) => {
      const at = (raw as { axesInfo?: { value?: number }[] }).axesInfo?.[0]?.value;
      if (at == null) return;
      // The pointer lands on a timestamp, not on a sample. Snap to the nearest
      // observation so panels running at four different frequencies still
      // agree on which reading is being shown.
      let best: Readout | null = null;
      let gap = Infinity;
      for (const p of panel.points) {
        const d = Math.abs(Date.parse(p.d) - at);
        if (d < gap) {
          gap = d;
          best = { d: p.d, v: p.v, g: p.g };
        }
      }
      // ...but only when an observation is genuinely near. The daily series
      // hold about a year (docs/adr/0004), so hovering 2019 would otherwise
      // snap them to a 2025 reading and print it beside everyone else's 2019.
      const within = best != null && gap <= (TOLERANCE_MS[best.g] ?? 30 * DAY);
      setProbe({ hit: within ? best : null });
    };

    chart.on("updateAxisPointer", onAxis);
    chart.getZr().on("globalout", () => setProbe(null));

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    // The chart reads its colours from CSS custom properties, so a theme
    // change means re-reading them rather than recomputing any data.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", render);
    window.addEventListener("hogcycle:theme", render);

    return () => {
      ro.disconnect();
      mq.removeEventListener("change", render);
      window.removeEventListener("hogcycle:theme", render);
      chart.dispose();
    };
  }, [panel, min, max, showAxisLabels]);

  const latest = [...panel.points].reverse().find((p) => p.v != null);
  const shown: Readout | null = probe
    ? probe.hit
    : latest
      ? { d: latest.d, v: latest.v, g: latest.g }
      : null;

  return (
    <div className="panel" style={{ ["--tier" as string]: tierColor(panel.tier) }}>
      <div className="panel-head">
        <span className="panel-title">{panel.name}</span>
        <span className="panel-unit">{panel.unit}</span>
        <span className="num panel-readout">
          {shown ? (
            <>
              <span style={{ color: "var(--ink)" }}>{fmt(shown.v, panel.unit)}</span>
              <span style={{ color: "var(--muted)", marginLeft: 6 }}>
                {shown.d}
                {GRANULARITY_LABEL[shown.g] ? ` · ${GRANULARITY_LABEL[shown.g]}` : ""}
              </span>
            </>
          ) : (
            <span style={{ color: "var(--muted)" }}>此期间无数据</span>
          )}
        </span>
        <span className="panel-tier">{TIER_LABEL[panel.tier]}</span>
      </div>
      <div
        ref={host}
        className={showAxisLabels ? "panel-chart tall" : "panel-chart"}
        role="img"
        aria-label={`${panel.name}，单位 ${panel.unit}，共 ${panel.points.length} 个观测点`}
      />
    </div>
  );
}
