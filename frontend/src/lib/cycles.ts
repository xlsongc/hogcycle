/**
 * Cycles laid over each other from starts the reader picked (A9).
 *
 * Each anchor is a month the reader chose; the cycle starts at the first
 * reading in that month and runs for `horizon` months, placed by months
 * since its start, so 2018's and 2022's upswings can be read against each
 * other on one axis. Nothing here finds a start: picking a trough or a peak
 * is reading the cycle, and the page leaves that to the reader. Computed in
 * the browser, over inputs only the reader can choose (phase-2 plan, Q4).
 *
 * No imports but types, so `node --test` runs it as it stands.
 */

import type { Point } from "@/types/generated/wall";

const DAY = 86_400_000;
/** The mean month, so a weekly series is placed where its days put it. */
const MONTH_MS = 30.4375 * DAY;

export const HORIZONS = [12, 24, 36, 48, 60] as const;
export const DEFAULT_HORIZON = 36;
/** One line per overlay slot: more would need a generated hue. */
export const MAX_CYCLES = 8;

export type CyclePoint = { x: number; y: number; d: string; v: number; g: string };

export type Cycle = {
  /** The month the reader chose, YYYY-MM. */
  anchor: string;
  /** The reading the cycle starts from; null when the month has none. */
  base: { d: string; v: number; g: string } | null;
  points: CyclePoint[];
};

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** "2018-05,2021-01" → sorted, unique, valid months, at most MAX_CYCLES.
 *  Anything malformed is dropped: a hand-edited link should still open. */
export function parseAnchors(raw: string | null): string[] {
  const months = (raw ?? "").split(",").filter((m) => MONTH.test(m));
  return [...new Set(months)].sort().slice(0, MAX_CYCLES);
}

export function parseHorizon(raw: string | null): number {
  const n = Number(raw);
  return (HORIZONS as readonly number[]).includes(n) ? n : DEFAULT_HORIZON;
}

/** An index divides by the start: for a series that reaches zero or below
 *  (a profit that turns to a loss) it means nothing, so such a series is
 *  laid over in its own units instead. */
export function indexable(points: Point[]): boolean {
  return points.every((p) => p.v == null || p.v > 0);
}

const time = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function cycles(
  points: Point[],
  anchors: string[],
  horizon: number,
  indexed: boolean
): Cycle[] {
  const readings = points.filter(
    (p): p is Point & { v: number } => p.v != null
  );
  return anchors.map((anchor) => {
    const start = readings.find((p) => p.d.slice(0, 7) === anchor);
    if (!start) return { anchor, base: null, points: [] };
    const t0 = time(start.d);
    const out: CyclePoint[] = [];
    for (const p of readings) {
      const x = (time(p.d) - t0) / MONTH_MS;
      if (x < 0 || x > horizon) continue;
      out.push({ x, y: indexed ? (100 * p.v) / start.v : p.v, d: p.d, v: p.v, g: p.g });
    }
    return { anchor, base: { d: start.d, v: start.v, g: start.g }, points: out };
  });
}
