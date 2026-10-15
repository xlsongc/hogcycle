"use client";

/**
 * One panel of a small-multiples chart: one series on its own y-axis, sharing
 * a time axis — and a crosshair — with every other panel in its group.
 *
 * What hovering does, and why each part is there:
 *
 *   every panel in the group writes its reading at the pointer into its own
 *   header, so the causal chain can be read down one vertical line;
 *
 *   the panel under the pointer also prints that reading beside the cursor,
 *   because a header 600px up the page is not where the eye is;
 *
 *   a dot marks the observation being read — only when one is genuinely near
 *   the pointer (TOLERANCE_MS). ECharts' own highlight lit the nearest point
 *   at any distance, which drew a dot in 2025 under a header saying "no data
 *   near 2024".
 *
 * Dragging across the plot selects a span to zoom to; double-click resets.
 * Touch keeps the tap-to-read behaviour and scrolls normally: a drag gesture
 * on a phone is a scroll, and hijacking it would trap the reader in a chart.
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Panel } from "@/types/generated/wall";
import { echarts } from "./base/echarts";
import { SERIES, fmt, panelOption } from "./base/theme";
import { syncPointer } from "./base/pointerSync";
import { shiftMonths, toIso, toTime } from "@/lib/dates";
import { nameOf, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

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

/** The grid's horizontal inset in panelOption; a drag is clamped to the plot. */
const PLOT_INSET = 58;
/** Below this, a press-and-release is a click, not a selection. */
const DRAG_MIN_PX = 6;

type Readout = { d: string; v: number | null; g: string; p?: string };

/** null → pointer is off the group, so the header shows the latest value.
 *  { hit: null } → pointer is on the group but nothing of this series sits
 *  near that date, which must read as absence rather than as a number. */
type Probe = { hit: Readout | null } | null;

export type PanelChartProps = {
  panel: Panel;
  /** Panels sharing a group share the crosshair (base/pointerSync.ts). */
  group: string;
  min: string;
  max: string;
  locale: Locale;
  showAxisLabels?: boolean;
  size?: "short" | "tall" | "hero";
  /** Draw the series this many months later than it happened. The header
   *  still reports the date the value describes. */
  shift?: number;
  /** Where on the time axis a reading goes: at the period it describes, or
   *  at the day it was published. Readings with no publication date have no
   *  place in the second view, and are left out of it rather than guessed. */
  align?: "period" | "release";
  title?: string;
  marker?: { date: string; label: string } | null;
  /** Give the panel an id so /wall/#<id> lands on it. */
  anchor?: boolean;
  /** Where the panel's name leads: the series' own page. */
  href?: string;
  onZoom?: (min: string, max: string) => void;
  onReset?: () => void;
};

export function PanelChart({
  panel,
  group,
  min,
  max,
  locale,
  showAxisLabels = false,
  size = "short",
  shift = 0,
  align = "period",
  title,
  marker = null,
  anchor = false,
  href,
  onZoom,
  onReset,
}: PanelChartProps) {
  const t = dict(locale);
  const name = title ?? nameOf(panel, locale);
  const host = useRef<HTMLDivElement>(null);
  const [probe, setProbe] = useState<Probe>(null);
  // Pointer x and the plot width, so the label can flip before the edge.
  const [cursor, setCursor] = useState<{ x: number; w: number } | null>(null);
  const [band, setBand] = useState<[number, number] | null>(null);

  // Handlers in refs, so a parent re-render does not tear the chart down.
  const zoomRef = useRef(onZoom);
  const resetRef = useRef(onReset);
  useEffect(() => {
    zoomRef.current = onZoom;
    resetRef.current = onReset;
  });

  // The points drawn, and the readings they stand for. Kept as two arrays
  // because a drawn point's date is where it was placed, while the readout
  // must report the period the value describes.
  const source = useMemo(
    () => (align === "release" ? panel.points.filter((p) => p.p) : panel.points),
    [panel, align]
  );
  const plotted = useMemo(
    () => ({
      ...panel,
      points: source.map((p) => ({
        ...p,
        d: shiftMonths(align === "release" && p.p ? p.p : p.d, shift),
      })),
    }),
    [panel, source, align, shift]
  );
  const markerDate = marker?.date;
  const markerLabel = marker?.label;

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const chart = echarts.init(el, null, { renderer: "canvas" });
    const mark = markerDate && markerLabel ? { date: markerDate, label: markerLabel } : null;
    const render = () =>
      chart.setOption(
        panelOption({ panel: plotted, min, max, showAxisLabels, locale, marker: mark })
      );
    render();

    // Deferred to the next frame: this runs inside ECharts' own dispatch of
    // the pointer event, where setOption is not allowed (development builds
    // assert on it; production carries on in an undefined state).
    let frame = 0;
    const showDot = (i: number | null) => {
      const p = i == null ? null : plotted.points[i];
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (chart.isDisposed()) return;
        chart.setOption({
          series: [{ id: SERIES.probe, data: p && p.v != null ? [[p.d, p.v]] : [] }],
        });
      });
    };
    const clear = () => {
      setProbe(null);
      showDot(null);
    };

    const onAxis = (raw: unknown) => {
      const at = (raw as { axesInfo?: { value?: number }[] }).axesInfo?.[0]?.value;
      // Leaving is signalled explicitly (syncPointer's onLeave), never inferred
      // from an update that happens to carry no value.
      if (at == null) return;
      // The pointer lands on a timestamp, not on a sample. Snap to the
      // nearest observation so panels at four different frequencies agree
      // on which reading is being shown...
      let best = -1;
      let gap = Infinity;
      plotted.points.forEach((p, i) => {
        const d = Math.abs(toTime(p.d) - at);
        if (d < gap) {
          gap = d;
          best = i;
        }
      });
      // ...but only when one is genuinely near. The daily series hold about
      // a year (docs/adr/0004): hovering 2019 must not snap them to 2025.
      const g = plotted.points[best]?.g ?? "M";
      const hit = best >= 0 && gap <= (TOLERANCE_MS[g] ?? 30 * DAY) ? best : null;
      // Report the date the value describes, not where a shift drew it.
      const orig = hit == null ? null : source[hit];
      setProbe({ hit: orig ? { d: orig.d, v: orig.v, g: orig.g, p: orig.p } : null });
      showDot(hit);
    };
    chart.on("updateAxisPointer", onAxis);
    const unsync = syncPointer(chart, el, group, clear);

    const zr = chart.getZr();
    let from: number | null = null;
    const clamp = (x: number) =>
      Math.min(Math.max(x, PLOT_INSET), el.clientWidth - PLOT_INSET);
    const isMouse = (e: { event?: Event }) => {
      const n = e.event;
      if (!n || "touches" in n) return false;
      return !("pointerType" in n) || (n as PointerEvent).pointerType === "mouse";
    };

    zr.on("mousemove", (e) => {
      setCursor({ x: e.offsetX, w: el.clientWidth });
      if (from != null) setBand([from, clamp(e.offsetX)]);
    });
    zr.on("mousedown", (e) => {
      const button = (e.event as MouseEvent | undefined)?.button ?? 0;
      if (zoomRef.current && isMouse(e) && button === 0) from = clamp(e.offsetX);
    });
    zr.on("mouseup", (e) => {
      if (from == null) return;
      const [a, b] = [from, clamp(e.offsetX)].sort((x, y) => x - y) as [number, number];
      from = null;
      setBand(null);
      if (b - a < DRAG_MIN_PX) return;
      const toDate = (x: number) =>
        toIso(chart.convertFromPixel({ xAxisIndex: 0 }, x) as unknown as number);
      zoomRef.current?.(toDate(a), toDate(b));
    });
    zr.on("dblclick", () => resetRef.current?.());
    zr.on("globalout", () => {
      setCursor(null);
      from = null;
      setBand(null);
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    // Colours come from CSS custom properties, so a theme change means
    // re-reading them rather than recomputing any data.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", render);
    window.addEventListener("hogcycle:theme", render);

    return () => {
      cancelAnimationFrame(frame);
      unsync();
      ro.disconnect();
      mq.removeEventListener("change", render);
      window.removeEventListener("hogcycle:theme", render);
      chart.dispose();
    };
  }, [panel, source, plotted, group, min, max, showAxisLabels, locale, markerDate, markerLabel]);

  const latest = [...panel.points].reverse().find((p) => p.v != null);
  const shown: Readout | null = probe
    ? probe.hit
    : latest
      ? { d: latest.d, v: latest.v, g: latest.g }
      : null;
  const gran = (g: string) => t.granularity[g as keyof typeof t.granularity] ?? "";
  const granName = (g: string) =>
    t.chart.granularityName[g as keyof typeof t.chart.granularityName] ?? "";

  return (
    <div
      className="panel"
      id={anchor ? panel.id : undefined}
      // A var() reference rather than the resolved colour: the server cannot
      // read computed styles, so resolving here rendered a different colour
      // on each side of hydration.
      style={{ ["--tier" as string]: `var(--${panel.tier})` }}
    >
      <div className="panel-head">
        {href ? (
          <Link className="panel-title" href={href}>
            {name}
          </Link>
        ) : (
          <span className="panel-title">{name}</span>
        )}
        <span className="panel-unit">{unitOf(panel.unit, locale)}</span>
        <span className={probe ? "panel-readout live" : "panel-readout"}>
          {shown ? (
            <>
              <b className="num">{fmt(shown.v, panel.unit, locale)}</b>
              <span title={granName(shown.g)}>
                <span className="num">{shown.d}</span>
                {gran(shown.g) ? ` · ${gran(shown.g)}` : ""}
              </span>
            </>
          ) : (
            <span>{t.chart.noneNear}</span>
          )}
        </span>
        <span className="panel-tier" title={t.chart.tierNote[panel.tier]}>
          {t.tier[panel.tier]}
        </span>
      </div>
      <div className="panel-body">
        <div
          ref={host}
          className={`panel-chart ${size}`}
          role="img"
          aria-label={t.chart.panelLabel(name, unitOf(panel.unit, locale), panel.points.length)}
        />
        {cursor != null && probe && (
          <div
            className={cursor.x > cursor.w * 0.62 ? "probe flip" : "probe"}
            style={{ left: cursor.x }}
            aria-hidden="true"
          >
            {probe.hit ? (
              <>
                <b>{fmt(probe.hit.v, panel.unit, locale)}</b> {unitOf(panel.unit, locale)}
                <br />
                {probe.hit.d} · {granName(probe.hit.g)}
                {probe.hit.p && (
                  <>
                    <br />
                    {t.chart.published(probe.hit.p)}
                  </>
                )}
              </>
            ) : (
              t.chart.noneNear
            )}
          </div>
        )}
        {band && (
          <div
            className="drag-band"
            style={{ left: Math.min(...band), width: Math.abs(band[1] - band[0]) }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
