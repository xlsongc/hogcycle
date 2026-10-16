/**
 * Shared chart chrome. Every panel is built from these, so the wall reads as
 * one system rather than a stack of unrelated charts.
 *
 * ECharts is imported by component, never wholesale — the full bundle is
 * ~1MB and we use four pieces of it (docs/adr/0006).
 */

import type { EChartsOption } from "echarts";
import type { Panel } from "@/types/generated/wall";
import { NUMBER_LOCALE, nameOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { domain } from "./domain";
import { cssVar, monoFont, NUM_PX, tierColor } from "./ink";
import { PLOT_INSET, markLines, startBand, type Marker } from "./marks";
import { splitByGap } from "./segments";

/** Formats a value the way its unit wants to be read.
 *
 *  The digit count keys on the raw unit string, never on a localised label:
 *  the unit is part of the caliber and stays exactly as the source writes it.
 *  Only the grouping follows the locale. */
/** Units counted in whole things, where decimals would claim a precision
 *  the source never had. */
const WHOLE = new Set(["万头", "CNY/tonne", "CNY/head", "1000 head", "1000 t CWE"]);

export function fmt(
  value: number | null | undefined,
  unit: string,
  locale: Locale = "en"
): string {
  if (value == null) return "—";
  const digits = WHOLE.has(unit) ? 0 : unit === "kg" ? 1 : 2;
  return value.toLocaleString(NUMBER_LOCALE[locale], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

type BaseArgs = {
  panel: Panel;
  min: string;
  max: string;
  showAxisLabels: boolean;
  locale: Locale;
  /** The chart's width in pixels, so labels above the plot keep apart. */
  width: number;
  /** A vertical line at a date that means something, e.g. today on a chart
   *  whose shifted series runs past it. */
  marker?: Marker | null;
  /** The note on the shaded band before the first point. On a past day the
   *  band holds data that exists but was not yet knowable (docs/adr/0025). */
  startNote?: (month: string) => string;
};

/** Series ids, so a single series can be updated without resending the
 *  whole option — the probe dot moves on every pointer move. */
export const SERIES = {
  line: "line",
  join: "join",
  coarse: "coarse",
  probe: "probe",
} as const;

/**
 * One panel's option object.
 *
 * Each panel keeps its own y-axis in its own units. That is not a dual-axis
 * chart — it is small multiples, which is the only honest way to put 万头,
 * 元/公斤 and a bare ratio on one time axis. Overlaying them on two y-scales
 * would invent a correlation the data does not contain.
 */
export function panelOption(
  { panel, min, max, showAxisLabels, locale, width, marker, startNote }: BaseArgs
): EChartsOption {
  const name = nameOf(panel, locale);
  const color = tierColor(panel.tier);
  const ink = cssVar("--ink", "#0b0b0b");
  const muted = cssVar("--muted", "#72716c");
  const grid = cssVar("--grid", "#e1e0d9");
  const surface = cssVar("--surface-1", "#fcfcfb");

  // Solid where readings are close enough to be a measured path, dashed
  // across longer gaps (base/segments.ts).
  const { solid: data, dashed } = splitByGap(panel.points);

  // Annual and quarterly readings are a different kind of measurement, not a
  // smoother sample of the same one, so they are always marked: hollow, which
  // keeps the distinction off colour alone.
  const sparse = panel.points.filter((p) => p.g === "A" || p.g === "Q");

  const endpoint = [...panel.points].reverse().find(
    (p): p is typeof p & { v: number } => p.v != null
  );

  const yScale = domain(panel, min, max);
  const span = { min, max, width };
  const lines = markLines(panel, span, marker ?? null, locale);

  return {
    animation: false,
    // A vertical mark's label sits above the plot, so it needs the headroom.
    grid: { left: PLOT_INSET, right: PLOT_INSET, top: lines.headroom ? 18 : 8, bottom: showAxisLabels ? 22 : 8 },
    xAxis: {
      type: "time",
      min,
      max,
      axisLine: { lineStyle: { color: grid } },
      axisTick: { show: false },
      axisLabel: {
        show: showAxisLabels,
        color: muted,
        fontFamily: monoFont(),
        fontSize: NUM_PX,
      },
      splitLine: { show: false },
      axisPointer: {
        show: true,
        // Off, because ECharts would otherwise light the *nearest* point at
        // any distance: hovering 2024 lit 屠宰量's first point in 2025-07
        // while its header said "no data near this date". The probe series
        // below draws the dot only when an observation is genuinely near.
        triggerEmphasis: false,
        label: { show: false },
        lineStyle: { color: muted, width: 1 },
      },
    },
    yAxis: {
      type: "value",
      ...yScale,
      // Exactly three ticks: floor, midpoint, ceiling. Left to its own
      // devices ECharts draws the explicit bounds *and* its own sequence, and
      // the two collide near the top of a 104px panel.
      ...("min" in yScale ? { interval: (yScale.max - yScale.min) / 2 } : {}),
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: grid } },
      axisLabel: {
        color: muted,
        fontFamily: monoFont(),
        fontSize: NUM_PX,
        formatter: (v: number) => fmt(v, panel.unit, locale),
      },
    },
    series: [
      {
        id: SERIES.line,
        type: "line",
        name,
        data,
        showSymbol: false,
        symbolSize: 8,
        connectNulls: false,
        lineStyle: { width: 2, color },
        itemStyle: { color, borderColor: surface, borderWidth: 2 },
        emphasis: { scale: 1.4 },
        markLine: lines.option,
        markArea: startBand(panel, span, locale, startNote),
        markPoint: {
          silent: true,
          symbol: "circle",
          symbolSize: 7,
          itemStyle: { color, borderColor: surface, borderWidth: 2 },
          label: {
            show: true,
            position: "right",
            distance: 8,
            color: ink,
            fontSize: NUM_PX,
            fontFamily: monoFont(),
            formatter: (p: { value?: unknown }) =>
              fmt(typeof p.value === "number" ? p.value : null, panel.unit, locale),
          },
          // The one label worth drawing on the chart itself: the latest value.
          // A number beside every point would be unreadable, and the axis plus
          // the header readout carry the rest.
          data: endpoint
            ? [
                {
                  name,
                  coord: [endpoint.d, endpoint.v] as [string, number],
                  value: endpoint.v,
                },
              ]
            : [],
        },
      },
      // The joins across long gaps: same hue, dashed, nothing to hover.
      ...(dashed.length
        ? [
            {
              id: SERIES.join,
              type: "line" as const,
              silent: true,
              data: dashed,
              showSymbol: false,
              connectNulls: false,
              lineStyle: { width: 2, color, type: [3, 3] as number[] },
            },
          ]
        : []),
      // Hollow markers for the coarser readings — secondary encoding, so the
      // distinction never rests on colour alone.
      ...(sparse.length
        ? [
            {
              id: SERIES.coarse,
              type: "scatter" as const,
              name: `${name} (${dict(locale).chart.coarse})`,
              silent: true,
              symbolSize: 7,
              data: sparse.map((p) => [p.d, p.v] as [string, number | null]),
              itemStyle: {
                color: surface,
                borderColor: color,
                borderWidth: 2,
              },
            },
          ]
        : []),
      // The hovered observation, filled by the panel on pointer moves. Empty
      // whenever nothing sits near the pointer, which is the whole point.
      {
        id: SERIES.probe,
        type: "scatter" as const,
        silent: true,
        z: 5,
        symbolSize: 9,
        data: [] as [string, number][],
        itemStyle: { color, borderColor: surface, borderWidth: 2 },
      },
    ],
  };
}

/**
 * Categorical slots for the overlay chart.
 *
 * The wall is small multiples — an all-pairs form, which caps at three hues.
 * The overlay is a multi-line chart, an *adjacent* form, where the validated
 * eight-slot order is legal with a legend. Same palette, different gate.
 *
 * Slots are allocated when a series is added and released when it is removed,
 * so de-selecting one line never repaints the others: colour follows the
 * indicator, not its position in the current selection.
 */
export const OVERLAY_SLOTS = [
  "--slot-1",
  "--slot-2",
  "--slot-3",
  "--slot-4",
  "--slot-5",
  "--slot-6",
  "--slot-7",
  "--slot-8",
] as const;

export const MAX_OVERLAY_SERIES = OVERLAY_SLOTS.length;

export function slotColor(index: number): string {
  return cssVar(OVERLAY_SLOTS[index % MAX_OVERLAY_SERIES] ?? "--slot-1", "#2a78d6");
}
