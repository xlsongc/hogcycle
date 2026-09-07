/**
 * Shared chart chrome. Every panel is built from these, so the wall reads as
 * one system rather than a stack of unrelated charts.
 *
 * ECharts is imported by component, never wholesale — the full bundle is
 * ~1MB and we use four pieces of it (docs/adr/0006).
 */

import type { EChartsOption } from "echarts";
import type { Panel } from "@/types/generated/wall";
import { NUMBER_LOCALE, labelOf, nameOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

export type Tier = Panel["tier"];

/** CSS custom properties are the single source of colour; reading them back
 *  keeps the chart in step with the theme toggle and with prefers-color-scheme
 *  instead of duplicating the palette in JS. */
export function cssVar(name: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

export function tierColor(tier: Tier): string {
  return cssVar(`--${tier}`, "#2a78d6");
}

/** next/font generates a hashed family name, so the literal "Departure Mono"
 *  resolves to nothing inside a canvas. Read the variable the loader sets. */
export function monoFont(): string {
  const v = cssVar("--font-departure", "");
  return v ? `${v}, monospace` : "ui-monospace, monospace";
}

/** Formats a value the way its unit wants to be read.
 *
 *  The digit count keys on the raw unit string, never on a localised label:
 *  the unit is part of the caliber and stays exactly as the source writes it.
 *  Only the grouping follows the locale. */
export function fmt(
  value: number | null | undefined,
  unit: string,
  locale: Locale = "en"
): string {
  if (value == null) return "—";
  const digits = unit === "万头" || unit === "CNY/tonne" ? 0 : unit === "kg" ? 1 : 2;
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
};

/**
 * A y-range snapped to round numbers around the data.
 *
 * ECharts' own `scale: true` still reaches for a tick interval that often
 * lands on zero, which on a 104px panel spends half the height on empty
 * space below the series. These panels compare a series against *its own*
 * history, not against zero, so the baseline carries no meaning worth that
 * much room. A threshold line is folded in so it can never fall outside.
 */
function domain(panel: Panel): { min: number; max: number } | { scale: true } {
  const values = panel.points
    .map((p) => p.v)
    .filter((v): v is number => v != null);
  if (!values.length) return { scale: true };

  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (panel.threshold) {
    lo = Math.min(lo, panel.threshold.value);
    hi = Math.max(hi, panel.threshold.value);
  }
  // Round to a unit scaled to the *padding*, not to the range. Sizing the
  // unit off the range makes it coarse enough that flooring drops a series
  // whose floor is well above zero — 仔猪价格 spans 20-110 and would snap to
  // 0-150, spending a fifth of a 104px panel on space the data never visits.
  const pad = (hi - lo) * 0.06 || Math.abs(hi) * 0.05 || 1;
  const unit = niceUnit(pad);
  return {
    min: Math.floor((lo - pad) / unit) * unit,
    max: Math.ceil((hi + pad) / unit) * unit,
  };
}

/** Smallest of 1/2/5/10 × 10^n that is at least `x`. 2.5 is excluded: it
 *  produces axis labels like 22.50 that read as data rather than as ticks. */
function niceUnit(x: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(x)));
  return (
    [1, 2, 5, 10].map((m) => m * magnitude).find((u) => u >= x) ?? magnitude * 10
  );
}

/**
 * One panel's option object.
 *
 * Each panel keeps its own y-axis in its own units. That is not a dual-axis
 * chart — it is small multiples, which is the only honest way to put 万头,
 * 元/公斤 and a bare ratio on one time axis. Overlaying them on two y-scales
 * would invent a correlation the data does not contain.
 */
export function panelOption(
  { panel, min, max, showAxisLabels, locale }: BaseArgs
): EChartsOption {
  const name = nameOf(panel, locale);
  const color = tierColor(panel.tier);
  const ink = cssVar("--ink", "#0b0b0b");
  const muted = cssVar("--muted", "#898781");
  const grid = cssVar("--grid", "#e1e0d9");
  const surface = cssVar("--surface-1", "#fcfcfb");
  const critical = cssVar("--critical", "#d03b3b");

  const data = panel.points.map((p) => [p.d, p.v] as [string, number | null]);

  // Annual readings in a series that is monthly elsewhere are a different kind
  // of measurement, not a smoother sample of the same one. Marking them keeps
  // that visible instead of letting one line imply uniform resolution.
  const sparse = panel.points.filter((p) => p.g === "A" || p.g === "Q");
  const mixed = new Set(panel.points.map((p) => p.g)).size > 1;

  const endpoint = [...panel.points].reverse().find(
    (p): p is typeof p & { v: number } => p.v != null
  );

  const yScale = domain(panel);

  return {
    animation: false,
    grid: { left: 58, right: 58, top: 8, bottom: showAxisLabels ? 22 : 8 },
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
        fontSize: 11,
      },
      splitLine: { show: false },
      axisPointer: { show: true, label: { show: false }, lineStyle: { color: muted, width: 1 } },
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
        fontSize: 11,
        formatter: (v: number) => fmt(v, panel.unit, locale),
      },
    },
    series: [
      {
        type: "line",
        name,
        data,
        showSymbol: false,
        symbolSize: 8,
        connectNulls: false,
        lineStyle: { width: 2, color },
        itemStyle: { color, borderColor: surface, borderWidth: 2 },
        emphasis: { scale: 1.4 },
        markLine: panel.threshold
          ? {
              silent: true,
              symbol: "none",
              data: [{ yAxis: panel.threshold.value }],
              lineStyle: { color: critical, width: 1, type: [4, 3] },
              label: {
                formatter: labelOf(panel.threshold, locale),
                color: critical,
                fontSize: 11,
                fontFamily: monoFont(),
                position: "insideEndTop",
              },
            }
          : undefined,
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
            fontSize: 11,
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
      // Hollow markers for the coarser readings — secondary encoding, so the
      // distinction never rests on colour alone.
      ...(mixed
        ? [
            {
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
