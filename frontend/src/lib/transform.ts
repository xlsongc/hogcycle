/**
 * A series redrawn in other units, as FRED offers on every series page:
 * the change from a year ago, the same as a percentage, or the percentage
 * change from the reading before (ADR-0033: a view the reader chooses).
 *
 * A year ago is the reading nearest 365 days earlier, and only if one sits
 * within YEAR_TOLERANCE_DAYS of it; the same rule gold's year-on-year uses,
 * so the two never disagree on a card and a chart. No percentage where the
 * base is at or below zero: a loss has no base to be a share of. A point
 * with no answer is drawn as a gap, never filled.
 *
 * No imports but types, so `node --test` runs it as it stands.
 */

import type { Point } from "@/types/generated/wall";

export const UNITS = ["level", "yoy", "yoypct", "pct"] as const;
export type Units = (typeof UNITS)[number];

const DAY = 86_400_000;
/** gold/wall.py YOY_TOLERANCE_DAYS. */
export const YEAR_TOLERANCE_DAYS = 45;

const time = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function parseUnits(raw: string | null): Units {
  return (UNITS as readonly string[]).includes(raw ?? "") ? (raw as Units) : "level";
}

/** The unit a transformed series is read in: its own for a change, "%" for
 *  a percentage. */
export function unitAfter(units: Units, unit: string): string {
  return units === "yoypct" || units === "pct" ? "%" : unit;
}

export function transform(points: Point[], units: Units): Point[] {
  if (units === "level") return points;
  const known = points.filter((p): p is Point & { v: number } => p.v != null);
  const times = known.map((p) => time(p.d));

  const yearAgo = (i: number): number | null => {
    const target = (times[i] as number) - 365 * DAY;
    let best = -1;
    let gap = Infinity;
    for (let j = 0; j < i; j++) {
      const g = Math.abs((times[j] as number) - target);
      if (g < gap) {
        gap = g;
        best = j;
      }
    }
    return best >= 0 && gap <= YEAR_TOLERANCE_DAYS * DAY ? (known[best] as Point & { v: number }).v : null;
  };

  const out: Point[] = known.map((p, i) => {
    const base = units === "pct" ? (i > 0 ? (known[i - 1] as Point & { v: number }).v : null) : yearAgo(i);
    let v: number | null = null;
    if (base != null) {
      if (units === "yoy") v = p.v - base;
      else if (base > 0 && p.v > 0) v = 100 * (p.v / base - 1);
    }
    return { ...p, v: v == null ? null : Math.round(v * 100) / 100 };
  });
  return out;
}
