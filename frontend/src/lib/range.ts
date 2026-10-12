/**
 * The time window every chart on a page is scoped to.
 *
 * A window is either one of the presets or a custom span from dragging across
 * a panel. It is plain data so it can live in the URL: a view someone zoomed
 * into is a view they can send.
 */

import { shiftMonths } from "./dates";

export const PRESETS = ["all", "8y", "5y", "3y", "1y"] as const;
export type Preset = (typeof PRESETS)[number];

const YEARS: Record<Preset, number | null> = { all: null, "8y": 8, "5y": 5, "3y": 3, "1y": 1 };

export type Range =
  | { kind: "preset"; preset: Preset }
  | { kind: "custom"; min: string; max: string };

export const DEFAULT_RANGE: Range = { kind: "preset", preset: "all" };

/** The wall opens on five years. Most series begin in 2021-12, so "all"
 *  spent half of twelve panels on an empty stretch before 2021; five years
 *  still holds about one and a half cycles. Compare keeps "all", because a
 *  lead is tested over as much history as there is. */
export const WALL_RANGE: Range = { kind: "preset", preset: "5y" };

/** The [min, max] a range resolves to, given the data's own extent. */
export function bounds(range: Range, start: string, end: string): [string, string] {
  if (range.kind === "custom") return [range.min, range.max];
  const years = YEARS[range.preset];
  return years ? [shiftMonths(end, -12 * years), end] : [start, end];
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Query string → range. Anything malformed falls back to the default rather
 *  than throwing: a hand-edited URL should land on a working page. */
export function parseRange(q: URLSearchParams, fallback: Range = DEFAULT_RANGE): Range {
  const from = q.get("from");
  const to = q.get("to");
  if (from && to && ISO.test(from) && ISO.test(to) && from < to) {
    return { kind: "custom", min: from, max: to };
  }
  const w = q.get("w");
  return PRESETS.includes(w as Preset)
    ? { kind: "preset", preset: w as Preset }
    : fallback;
}

/** The page's own default stays out of the URL, so a plain link is clean. */
export function rangeParams(
  range: Range,
  fallback: Range = DEFAULT_RANGE
): Record<string, string | null> {
  if (range.kind === "custom") return { w: null, from: range.min, to: range.max };
  const isDefault = fallback.kind === "preset" && fallback.preset === range.preset;
  return { w: isDefault ? null : range.preset, from: null, to: null };
}
