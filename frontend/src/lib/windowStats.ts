/**
 * Facts about a window the reader chose: where it starts and ends, how far
 * it moved, its high and low, and where its last reading sits among the rest.
 *
 * Computed here, in the browser, which the page otherwise leaves to gold:
 * gold cannot precompute a window nobody has picked yet (phase-2 plan, Q4).
 * So only a window the reader chose gets them, and the page says where they
 * came from. Facts only: no rate, no fitted line, no word about a phase.
 *
 * No imports but types, so `node --test` runs it as it stands.
 */

import type { Point } from "@/types/generated/wall";

export type At = { d: string; v: number; g: string };

export type WindowStats = {
  /** Readings in the window. */
  n: number;
  first: At;
  last: At;
  change: number;
  /** Null when a percentage would mislead: a window that reaches zero or
   *  below (a profit that turns to a loss) has no base to be a share of. */
  pct: number | null;
  /** The earliest reading at the window's highest and lowest value. */
  high: At;
  low: At;
  /** How many of the other readings sit strictly below the last one. */
  below: number;
};

/**
 * Over the readings drawn inside [min, max]. A reading's place on the axis
 * is its period, or, placed by release, its publication day (readings with
 * none are not drawn in that view, so they are not counted either).
 * Null below two readings: one value has no change and no rank.
 */
export function windowStats(
  points: Point[],
  min: string,
  max: string,
  align: "period" | "release" = "period"
): WindowStats | null {
  const inside: At[] = [];
  for (const p of points) {
    if (p.v == null) continue;
    const at = align === "release" ? p.p : p.d;
    if (at && at >= min && at <= max) inside.push({ d: p.d, v: p.v, g: p.g });
  }
  if (inside.length < 2) return null;
  const first = inside[0] as At;
  const last = inside[inside.length - 1] as At;
  let high = first;
  let low = first;
  for (const r of inside) {
    if (r.v > high.v) high = r;
    if (r.v < low.v) low = r;
  }
  const change = last.v - first.v;
  return {
    n: inside.length,
    first,
    last,
    change,
    pct: low.v > 0 ? (100 * change) / first.v : null,
    high,
    low,
    below: inside.filter((r) => r.v < last.v).length,
  };
}
