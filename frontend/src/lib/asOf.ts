/**
 * What could be known on a given day, from the contract alone.
 *
 * The rule is docs/adr/0025, and gold/vintage.py applies the same one to
 * silver. For each period, take its prints (the revision trail if it has one,
 * else the point):
 *
 *   - if any print is dated, only dated prints count, and the one in force is
 *     the latest released on or before the day. A publisher's record outranks
 *     a mirror's undated copy of it;
 *   - otherwise, the latest this warehouse had learned by then, labelled so.
 *
 * A release date is never inferred. This selects among points the contract
 * gave; it computes no number.
 */

import type { Panel, Point } from "@/types/generated/wall";

export type Basis = "published" | "learned";

export type Known = Point & {
  /** Which clock placed this point on the day asked about. */
  basis: Basis;
  /** When this warehouse learned it, where that is the clock. */
  learned: string | null;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isDay(s: string | null | undefined): s is string {
  return s != null && ISO.test(s);
}

/** When this warehouse learned an undated point: its own date, else the
 *  panel's. Null in a 1.0 contract, which did not carry it. */
export function learnedOf(panel: Panel, point: Point): string | null {
  return point.l ?? panel.learned ?? null;
}

type Print = { v: number | null; p: string | null; learned: string };

function inForce(prints: Print[], day: string): { print: Print; basis: Basis } | null {
  const dated = prints.filter((p): p is Print & { p: string } => p.p != null);
  if (dated.length) {
    const known = dated
      .filter((p) => p.p <= day)
      .sort((a, b) => a.p.localeCompare(b.p) || a.learned.localeCompare(b.learned));
    const last = known[known.length - 1];
    return last ? { print: last, basis: "published" } : null;
  }
  const known = prints
    .filter((p) => p.learned <= day)
    .sort((a, b) => a.learned.localeCompare(b.learned));
  const last = known[known.length - 1];
  return last ? { print: last, basis: "learned" } : null;
}

/** The panel as it could be known on `day`, ascending by period. */
export function knownOn(panel: Panel, day: string): Known[] {
  const revised = new Map(panel.revisions.map((r) => [r.d, r.prints]));
  const out: Known[] = [];
  for (const point of panel.points) {
    const trail = revised.get(point.d);
    if (trail) {
      const hit = inForce(trail, day);
      if (hit) {
        const { print, basis } = hit;
        out.push({
          d: point.d,
          g: point.g,
          v: print.v,
          ...(print.p ? { p: print.p } : {}),
          basis,
          learned: basis === "learned" ? print.learned : null,
        });
      }
      continue;
    }
    if (point.p != null) {
      if (point.p <= day) out.push({ ...point, basis: "published", learned: null });
      continue;
    }
    const learned = learnedOf(panel, point);
    if (learned != null && learned <= day) out.push({ ...point, basis: "learned", learned });
  }
  return out;
}

/** The earliest day anything of the panel was knowable, and on which clock;
 *  what a page says when the day asked about comes before it. */
export function firstKnowable(panel: Panel): { date: string; basis: Basis } | null {
  let first: { date: string; basis: Basis } | null = null;
  for (const point of panel.points) {
    const candidate: { date: string; basis: Basis } | null =
      point.p != null
        ? { date: point.p, basis: "published" }
        : learnedOf(panel, point) != null
        ? { date: learnedOf(panel, point) as string, basis: "learned" }
        : null;
    if (candidate && (!first || candidate.date < first.date)) first = candidate;
  }
  return first;
}

/** The panel cut down to what was knowable on `day`, for a chart. */
export function panelOn(panel: Panel, day: string | null): Panel {
  return day ? { ...panel, points: knownOn(panel, day) } : panel;
}
