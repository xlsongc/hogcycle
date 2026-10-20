/**
 * How well one series, shifted forward k months, lines up with another, for
 * every k from 0 to MAX_LAG: the number behind "capacity leads price by
 * 10–12 months" (ADR-0033: over a pair and a basis the reader chose).
 *
 * Both series go to month ends (the last reading in each month), and by
 * default to their change from the same month a year before. Levels that
 * both trend correlate whether or not one leads the other, and a year-on-
 * year change also takes out the season. A series that reaches zero or
 * below has no percentage change, so its year-on-year is a difference.
 *
 * Pearson's r over the months both have, only where there are MIN_PAIRS of
 * them. With about three cycles of history this describes the history; it
 * is not a law, and the page says so.
 *
 * No imports but types, so `node --test` runs it as it stands.
 */

import type { Point } from "@/types/generated/wall";

export const MAX_LAG = 24;
export const MIN_PAIRS = 24;

export type Basis = "yoy" | "level";
export type LagR = { k: number; r: number | null; n: number };

/** "2026-09" → its month number since year 0, for arithmetic. */
const index = (ym: string) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;

export function monthly(points: Point[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const p of points) if (p.v != null) out.set(index(p.d), p.v);
  return out;
}

export function yearOnYear(series: Map<number, number>): Map<number, number> {
  const positive = [...series.values()].every((v) => v > 0);
  const out = new Map<number, number>();
  for (const [m, v] of series) {
    const before = series.get(m - 12);
    if (before == null) continue;
    out.set(m, positive ? 100 * (v / before - 1) : v - before);
  }
  return out;
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] as number) - mx;
    const dy = (ys[i] as number) - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

export function scan(lead: Point[], target: Point[], basis: Basis = "yoy"): LagR[] {
  const prep = (p: Point[]) => (basis === "yoy" ? yearOnYear(monthly(p)) : monthly(p));
  const a = prep(lead);
  const b = prep(target);
  const out: LagR[] = [];
  for (let k = 0; k <= MAX_LAG; k++) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const [m, y] of b) {
      const x = a.get(m - k);
      if (x != null) {
        xs.push(x);
        ys.push(y);
      }
    }
    out.push({ k, r: xs.length >= MIN_PAIRS ? pearson(xs, ys) : null, n: xs.length });
  }
  return out;
}

/** The lag with the largest |r|, or null when no lag has enough months. */
export function strongest(rs: LagR[]): LagR | null {
  return rs.reduce<LagR | null>(
    (best, x) => (x.r != null && (best?.r == null || Math.abs(x.r) > Math.abs(best.r)) ? x : best),
    null
  );
}
