"use client";

/**
 * The instrument primitives: a labelled bar, and a vertical scale with a
 * marker.
 *
 * Every gauge here is filled from a real reading. The reference this header
 * imitates is a spacecraft panel where the bars mean tank pressure; borrowing
 * the look while filling the bars with decoration would make the most
 * prominent thing on the page the one part of it that is invented. So the
 * bar's fill is the series' own historical percentile — a bounded 0-100 the
 * contract already carries — and a series too short to have one renders an
 * empty track with a dash rather than a plausible-looking fill.
 */

import type { Reading } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { litSegments } from "@/lib/segments";

/** Blocks in a bar. Discrete because the panel is a pixel grid, and because
 *  a segmented bar cannot imply precision the percentile does not have. */
const SEGMENTS = 12;

export function Bar({ reading }: { reading: Reading }) {
  const pct = reading.percentile;
  const lit = litSegments(pct, SEGMENTS);

  return (
    <div className="gauge">
      <span className="gauge-label">{reading.name}</span>
      <span
        className="gauge-track"
        role="img"
        aria-label={
          pct == null
            ? `${reading.name}：历史分位不足，样本太短`
            : `${reading.name}：历史第 ${pct} 分位`
        }
        style={{ ["--tier" as string]: `var(--${reading.tier})` }}
      >
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <i key={i} className={i < lit ? "on" : ""} />
        ))}
      </span>
      <span className="gauge-value num">
        {reading.value == null ? "—" : fmt(reading.value, reading.unit)}
      </span>
    </div>
  );
}

type ScaleProps = {
  min: number;
  max: number;
  value: number | null;
  label: string;
  unit: string;
  /** A line that means something in the domain, e.g. the 5:1 盈亏线. */
  threshold?: { value: number; label: string } | null;
};

/** A step from [1,2,5]x10ⁿ giving roughly `target` ticks. 2.5 is excluded: a
 *  scale counting in 2.5s is read wrong more often than it is read. */
function niceStep(span: number, target: number): number {
  const raw = span / Math.max(target, 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) {
    if (raw <= m * mag) return m * mag;
  }
  return 10 * mag;
}

/**
 * The vertical scale, with a marker at the current value.
 *
 * Ticks are positioned by value rather than laid out in even rows, so the
 * marker sits where the reading actually falls and the threshold is a line
 * across the scale instead of a label that has to coincide with a tick. That
 * is also what lets the marker say something: 4.55 sitting just *below* the
 * 5:1 line is the whole point of showing this series at all.
 */
export function Scale({ min, max, value, label, unit, threshold }: ScaleProps) {
  const lo = Math.min(min, value ?? min, threshold?.value ?? min);
  const hi = Math.max(max, value ?? max, threshold?.value ?? max);
  const span = hi - lo || 1;
  /** Percent from the top — the scale reads large at top, like the reference. */
  const y = (v: number) => ((hi - v) / span) * 100;

  const step = niceStep(span, 7);
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) {
    ticks.push(Math.round(t * 100) / 100);
  }

  return (
    <div className="scale">
      <div className="scale-head">
        <span>{label}</span>
        <span className="scale-unit">{unit}</span>
      </div>

      <div className="scale-plot">
        {ticks.map((t) => (
          <span key={t} className="scale-tick num" style={{ top: `${y(t)}%` }}>
            {String(t).padStart(2, "0")}
          </span>
        ))}

        {threshold && (
          <span
            className="scale-line"
            style={{ top: `${y(threshold.value)}%` }}
            aria-hidden="true"
          />
        )}

        {value != null && (
          <span
            className="scale-now num"
            style={{ top: `${y(value)}%` }}
            role="img"
            aria-label={`${label} 当前 ${value}`}
          >
            <b aria-hidden="true">◀</b>
            {value}
          </span>
        )}
      </div>

      {threshold && <div className="scale-note">{threshold.label}</div>}
    </div>
  );
}

export function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="hud-group">
      <h3>{label}</h3>
      {children}
    </section>
  );
}
