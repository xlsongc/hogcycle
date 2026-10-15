/**
 * Where a line is a measurement and where it is only a join.
 *
 * A line drawn between two readings a year apart says the series travelled
 * that path, and nobody measured it: 2015-2020 能繁母猪 are annual figures,
 * and since late 2025 it is published quarterly only. Drawn solid, a
 * quarterly series passes for a monthly curve. So a segment between readings
 * more than about a month apart is dashed: it marks that they are joined, not
 * what happened in between. Weekly and monthly series stay solid; a monthly
 * series that misses a month shows the gap, which is also true.
 */

import type { Point } from "@/types/generated/wall";

/** A month and a half: a monthly series' longest regular gap is 31 days. */
export const GAP_DAYS = 45;

const DAY = 86_400_000;

type Pair = [string, number | null];

function gap(a: Point, b: Point): number {
  return (Date.parse(b.d) - Date.parse(a.d)) / DAY;
}

/** The solid line, broken wherever readings are far apart, and the dashed
 *  joins across those gaps, each its own two-point stretch. */
export function splitByGap(points: Point[]): { solid: Pair[]; dashed: Pair[] } {
  const solid: Pair[] = [];
  const dashed: Pair[] = [];
  points.forEach((p, i) => {
    solid.push([p.d, p.v]);
    const next = points[i + 1];
    if (!next || gap(p, next) <= GAP_DAYS) return;
    // A null at the same instant ends the solid stretch without drawing.
    solid.push([p.d, null]);
    if (p.v != null && next.v != null) {
      dashed.push([p.d, p.v], [next.d, next.v], [next.d, null]);
    }
  });
  return { solid, dashed };
}
