/**
 * What a panel marks besides the series itself: its threshold, a dated
 * marker (today, or the day the page stands on), the breaks where its
 * readings change cadence, and the band before its first reading.
 *
 * Each puts something a reader would otherwise meet in a footnote at the
 * place on the chart where it happens (docs/adr/0026).
 */

import type { MarkAreaComponentOption, MarkLineComponentOption } from "echarts";
import type { Panel } from "@/types/generated/wall";
import { labelOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { cssVar, labelPx, monoFont, textWidth } from "./ink";

export type Marker = { date: string; label: string };

/** The plot's horizontal inset inside the chart, on both sides. */
export const PLOT_INSET = 58;

/** The window, and the chart's width in pixels, which places labels. */
type Span = { min: string; max: string; width: number };

/** Space kept between two labels above the plot. Where two would come
 *  closer, the later one is drawn bare: the marker the page asked for comes
 *  first, then the breaks in date order. */
const LABEL_GAP_PX = 8;

/** Below this share of the window, a "data starts here" label would not fit
 *  inside its shaded band, so the band is drawn bare. */
const START_LABEL_MIN_SHARE = 0.18;

function share(date: string, { min, max }: Span): number {
  return (Date.parse(date) - Date.parse(min)) / (Date.parse(max) - Date.parse(min) || 1);
}

type Align = "left" | "center" | "right";
type Vertical = { date: string; label: string; dash: number[]; labelled: boolean; align: Align };

function verticals(panel: Panel, span: Span, marker: Marker | null, locale: Locale): Vertical[] {
  const c = dict(locale).chart;
  const px = labelPx(locale);
  const left = PLOT_INSET;
  const right = Math.max(span.width - PLOT_INSET, left + 1);
  const wanted = [
    ...(marker ? [{ ...marker, dash: [2, 3] }] : []),
    ...(panel.breaks ?? []).map((b) => ({
      date: b.d,
      label: c.cadenceBreak(c.cadence[b.from], c.cadence[b.to]),
      dash: [1, 3],
    })),
  ];
  const placed: [number, number][] = [];
  return wanted
    .filter((v) => v.date >= span.min && v.date <= span.max)
    .map((v) => {
      const x = left + share(v.date, span) * (right - left);
      const w = textWidth(v.label, px);
      // Centred on its line, except near an edge, where it runs inward.
      const align: Align =
        x - w / 2 < left ? "left" : x + w / 2 > right ? "right" : "center";
      const [a, b] =
        align === "left" ? [x, x + w] : align === "right" ? [x - w, x] : [x - w / 2, x + w / 2];
      const labelled = placed.every(([c0, c1]) => b + LABEL_GAP_PX <= c0 || a >= c1 + LABEL_GAP_PX);
      if (labelled) placed.push([a, b]);
      return { ...v, labelled, align };
    });
}

/** The threshold and the vertical marks as one markLine, and whether any
 *  vertical carries a label, which needs headroom above the plot. */
export function markLines(
  panel: Panel,
  span: Span,
  marker: Marker | null,
  locale: Locale
): { option: MarkLineComponentOption | undefined; headroom: boolean } {
  const muted = cssVar("--muted", "#72716c");
  const critical = cssVar("--critical", "#d03b3b");
  const text = { fontSize: labelPx(locale), fontFamily: monoFont() };
  const marks = verticals(panel, span, marker, locale);
  const data: NonNullable<MarkLineComponentOption["data"]> = [
    ...(panel.threshold
      ? [
          {
            yAxis: panel.threshold.value,
            lineStyle: { color: critical, width: 1, type: [4, 3] },
            label: {
              ...text,
              formatter: labelOf(panel.threshold, locale),
              color: critical,
              position: "insideEndTop" as const,
            },
          },
        ]
      : []),
    ...marks.map((m) => ({
      xAxis: m.date,
      lineStyle: { color: muted, width: 1, type: m.dash },
      // "end" draws upright above the line's top; the inside positions run
      // the text along the line, which on a vertical line means sideways.
      label: {
        ...text,
        show: m.labelled,
        formatter: m.label,
        align: m.align,
        color: muted,
        position: "end" as const,
        distance: 2,
      },
    })),
  ];
  return {
    option: data.length ? { silent: true, symbol: "none", data } : undefined,
    headroom: marks.some((m) => m.labelled),
  };
}

/**
 * The shaded band before the first reading.
 *
 * A daily series holds about a year (docs/adr/0004). On an 11-year axis an
 * empty decade beside it reads as missing data; shading it says "this series
 * starts here" instead. Where the series is a new caliber the band says that,
 * because the earlier one exists as its own series (docs/adr/0026).
 */
export function startBand(
  panel: Panel,
  span: Span,
  locale: Locale,
  startNote?: (month: string) => string
): MarkAreaComponentOption | undefined {
  const first = panel.points.find((p) => p.v != null)?.d;
  if (!first || first <= span.min) return undefined;
  const c = dict(locale).chart;
  const from = panel.caliber?.from;
  const note = startNote
    ? startNote(first.slice(0, 7))
    : from
    ? c.caliberFrom(from.slice(0, 7))
    : c.startsAt(first.slice(0, 7));
  return {
    silent: true,
    itemStyle: { color: cssVar("--chip", "rgba(0,0,0,.045)") },
    label: {
      show: share(first, span) >= START_LABEL_MIN_SHARE,
      position: "insideRight",
      color: cssVar("--muted", "#72716c"),
      fontSize: labelPx(locale),
      fontFamily: monoFont(),
      formatter: note,
    },
    data: [[{ xAxis: span.min }, { xAxis: first }]],
  };
}
