/**
 * A series laid out year by year over one calendar, so this year can be read
 * against the season it is in: the seasonal chart of USDA's and Mysteel's
 * livestock reports. Hog prices have a season (a peak before the Spring
 * Festival, a trough after it), and a fall in March means less than one in
 * November.
 *
 * Placed by day of the year, so a weekly series keeps its weeks where they
 * fell. Only the readings themselves: no average of past years is drawn,
 * because which years to average is a choice, and the reader can see them.
 *
 * No imports but types, so `node --test` runs it as it stands.
 */

import type { Point } from "@/types/generated/wall";

export const SEASON_YEARS = 6;

export type Season = { year: number; points: { x: number; v: number; d: string }[] };

/** Day of the year, 1 on 1 January. A leap year's 29 February is day 60,
 *  and 1 March is day 61 in every year, so the seasons line up. */
export function dayOfYear(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const start = Date.UTC(y, 0, 1);
  const day = Math.round((Date.UTC(y, m - 1, d) - start) / 86_400_000) + 1;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return !leap && m > 2 ? day + 1 : day;
}

/** The last `years` calendar years holding at least two readings, oldest
 *  first. */
export function seasons(points: Point[], years = SEASON_YEARS): Season[] {
  const by = new Map<number, Season>();
  for (const p of points) {
    if (p.v == null) continue;
    const year = Number(p.d.slice(0, 4));
    const s = by.get(year) ?? { year, points: [] };
    s.points.push({ x: dayOfYear(p.d), v: p.v, d: p.d });
    by.set(year, s);
  }
  return [...by.values()]
    .filter((s) => s.points.length >= 2)
    .sort((a, b) => a.year - b.year)
    .slice(-years);
}

/** Whether a seasonal view says anything: a series read at least monthly,
 *  over at least two calendar years. */
export function seasonal(points: Point[]): boolean {
  const fine = points.filter((p) => p.v != null && (p.g === "D" || p.g === "W" || p.g === "M"));
  return fine.length >= 0.8 * points.filter((p) => p.v != null).length && seasons(fine).length >= 2;
}
