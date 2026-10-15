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
 *  resolves to nothing inside a canvas. Read the variables the loader sets —
 *  both of them, so Chinese in a canvas label (数据始于, 盈亏线) lands on the
 *  same pixel face as the page instead of a heavy system fallback. */
export function monoFont(): string {
  const faces = [cssVar("--font-departure", ""), cssVar("--font-zpix", "")].filter(Boolean);
  return faces.length ? `${faces.join(", ")}, monospace` : "ui-monospace, monospace";
}

/** Canvas text that can carry Chinese — a threshold's label, "today", the
 *  coverage note, a legend of series names — sits on zpix's 12px grid on the
 *  Chinese page. Numerals and dates stay on Departure Mono's 11px in both:
 *  either face drawn off its own grid is resampled and goes soft. */
export const NUM_PX = 11;
export function labelPx(locale: Locale): number {
  return locale === "zh" ? 12 : NUM_PX;
}

/** Formats a value the way its unit wants to be read.
 *
 *  The digit count keys on the raw unit string, never on a localised label:
 *  the unit is part of the caliber and stays exactly as the source writes it.
 *  Only the grouping follows the locale. */
/** Units counted in whole things, where decimals would claim a precision
 *  the source never had. */
const WHOLE = new Set(["万头", "CNY/tonne", "1000 head", "1000 t CWE"]);

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
  /** A vertical line at a date that means something, e.g. today on a chart
   *  whose shifted series runs past it. */
  marker?: { date: string; label: string } | null;
};

/** Series ids, so a single series can be updated without resending the
 *  whole option — the probe dot moves on every pointer move. */
export const SERIES = { line: "line", coarse: "coarse", probe: "probe" } as const;

/** Below this share of the window, a "data starts here" label would not fit
 *  inside its shaded band, so the band is drawn bare. */
const START_LABEL_MIN_SHARE = 0.18;

/**
 * A y-range snapped to round numbers around the data.
 *
 * ECharts' own `scale: true` still reaches for a tick interval that often
 * lands on zero, which on a 104px panel spends half the height on empty
 * space below the series. These panels compare a series against *its own*
 * history, not against zero, so the baseline carries no meaning worth that
 * much room. A threshold line is folded in so it can never fall outside.
 */
function domain(
  panel: Panel,
  from: string,
  to: string
): { min: number; max: number } | { scale: true } {
  const all = panel.points.map((p) => p.v).filter((v): v is number => v != null);
  // Fitted to what the window shows. Scaled to the whole history, a five-year
  // view of 能繁母猪 drew 3,780-4,300 on a 2,900-4,800 axis and read as flat.
  // Segments that cross the window's edge are clipped by the chart.
  const shown = panel.points
    .filter((p) => p.d >= from && p.d <= to)
    .map((p) => p.v)
    .filter((v): v is number => v != null);
  const values = shown.length ? shown : all;
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
  { panel, min, max, showAxisLabels, locale, marker }: BaseArgs
): EChartsOption {
  const name = nameOf(panel, locale);
  const color = tierColor(panel.tier);
  const ink = cssVar("--ink", "#0b0b0b");
  const muted = cssVar("--muted", "#72716c");
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

  const yScale = domain(panel, min, max);

  // A daily series holds about a year (docs/adr/0004). On an 11-year axis an
  // empty decade beside it reads as missing data; shading it says "this
  // series starts here" instead.
  const first = panel.points.find((p) => p.v != null)?.d;
  const before = first && first > min ? first : null;
  const share = before
    ? (Date.parse(before) - Date.parse(min)) / (Date.parse(max) - Date.parse(min) || 1)
    : 0;
  const chip = cssVar("--chip", "rgba(0,0,0,.045)");

  return {
    animation: false,
    // A marker's label sits above the plot, so it needs the headroom.
    grid: { left: 58, right: 58, top: marker ? 18 : 8, bottom: showAxisLabels ? 22 : 8 },
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
        markLine:
          panel.threshold || marker
            ? {
                silent: true,
                symbol: "none",
                data: [
                  ...(panel.threshold
                    ? [
                        {
                          yAxis: panel.threshold.value,
                          lineStyle: { color: critical, width: 1, type: [4, 3] as number[] },
                          label: {
                            formatter: labelOf(panel.threshold, locale),
                            color: critical,
                            fontSize: labelPx(locale),
                            fontFamily: monoFont(),
                            position: "insideEndTop" as const,
                          },
                        },
                      ]
                    : []),
                  ...(marker
                    ? [
                        {
                          xAxis: marker.date,
                          lineStyle: { color: muted, width: 1, type: [2, 3] as number[] },
                          // "end" draws upright above the line's top; the
                          // inside positions run the text along the line,
                          // which on a vertical line means sideways.
                          label: {
                            formatter: marker.label,
                            color: muted,
                            fontSize: labelPx(locale),
                            fontFamily: monoFont(),
                            position: "end" as const,
                            distance: 2,
                          },
                        },
                      ]
                    : []),
                ],
              }
            : undefined,
        markArea: before
          ? {
              silent: true,
              itemStyle: { color: chip },
              label: {
                show: share >= START_LABEL_MIN_SHARE,
                position: "insideRight",
                color: muted,
                fontSize: labelPx(locale),
                fontFamily: monoFont(),
                formatter: dict(locale).chart.startsAt(before.slice(0, 7)),
              },
              data: [[{ xAxis: min }, { xAxis: before }]],
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
      // Hollow markers for the coarser readings — secondary encoding, so the
      // distinction never rests on colour alone.
      ...(mixed
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
