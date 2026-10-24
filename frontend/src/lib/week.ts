/**
 * How a week of the digest (docs/adr/0039) is named, and which of its moves
 * lead it. Every number is one gold computed: these functions choose and
 * phrase, they do not work anything out. Only types are imported, so the
 * tests run them as they stand (lib/weekHeadline.ts phrases the sentence).
 */

import type { Move, Week } from "@/types/generated/wall";
import type { Locale } from "@/i18n/locale";

const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** `2026-W43` → its ISO year and number. */
export function weekNumber(id: string): { year: number; n: number } {
  const [y, w] = id.split("-W");
  return { year: Number(y), n: Number(w) };
}

/** 2026-10-24 → "Oct 24" / "10月24日". */
export function dayLabel(iso: string, locale: Locale): string {
  const [, m, d] = iso.split("-").map(Number) as [number, number, number];
  return locale === "zh" ? `${m}月${d}日` : `${MONTHS_EN[m - 1]} ${d}`;
}

/** "Oct 19 – 25, 2026" / "2026年10月19日至25日", naming the month once when
 *  the week stays in it, and both years when it crosses one. `short` leaves
 *  the year off, for a list whose weeks are already in order. */
export function weekRange(start: string, end: string, locale: Locale, short = false): string {
  const [y1, m1] = start.split("-").map(Number) as [number, number];
  const [y2, m2, d2] = end.split("-").map(Number) as [number, number, number];
  const zh = locale === "zh";
  if (y1 !== y2) {
    return zh
      ? `${y1}年${dayLabel(start, locale)}至${y2}年${dayLabel(end, locale)}`
      : `${dayLabel(start, locale)}, ${y1} – ${dayLabel(end, locale)}, ${y2}`;
  }
  const tail = m1 === m2 ? (zh ? `${d2}日` : `${d2}`) : dayLabel(end, locale);
  const span = zh ? `${dayLabel(start, locale)}至${tail}` : `${dayLabel(start, locale)} – ${tail}`;
  if (short) return span;
  return zh ? `${y1}年${span}` : `${span}, ${y1}`;
}

export function signedPct(p: number): string {
  return `${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p).toFixed(1)}%`;
}

/** Nothing new came out: the same reading on both sides of the week. */
export function quiet(m: Move): boolean {
  return m.prev_d === m.d && m.delta === 0;
}

/** The same period on both sides with another value: a revision. */
export function revised(m: Move): boolean {
  return m.prev_d === m.d && m.delta !== 0;
}

// The week's headline: the spot price, the futures price, and what a hog
// earns, each the first of its list the week holds a new reading of. The
// 外三元 daily price moves first; the ministry's weekly 500-county price
// stands in when it is missing.
export const HEADLINE = [
  ["hog_price_wai3", "hog_price_county", "hog_price_index"],
  ["lh_futures_main"],
  ["profit_per_head_est"],
];

/** The week's spot-price move, for a line in the list of issues. */
export function spot(week: Week): Move | undefined {
  return (HEADLINE[0] ?? [])
    .map((id) => week.moves.find((x) => x.id === id))
    .find((x): x is Move => x != null && !quiet(x));
}
