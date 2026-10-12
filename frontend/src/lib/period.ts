/**
 * What period a reading describes, in words, and how long after it the
 * reading became public.
 *
 * The contract dates every reading by its period END (2026-06-30), which is
 * right for a time axis and wrong for a sentence: "3,780 on 2026-06-30" reads
 * as a daily figure, when it is the statistics bureau's quarter-end survey.
 * The granularity says which kind of period it was, so the label is built
 * from both. Plain functions, so server components can call them.
 */

import type { Locale } from "@/i18n/locale";

const DAY = 86_400_000;

const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Readings name their granularity in words, points by letter. */
const LETTER: Record<string, string> = {
  daily: "D",
  weekly: "W",
  monthly: "M",
  quarterly: "Q",
  annual: "A",
};

export function granularityLetter(g: string): string {
  return LETTER[g] ?? g;
}

/** "2026年2季度末" / "end of Q2 2026" for a quarterly reading, and so on. */
export function periodLabel(d: string, g: string, locale: Locale): string {
  const [y, m] = d.split("-").map(Number) as [number, number];
  const zh = locale === "zh";
  switch (granularityLetter(g)) {
    case "A":
      return zh ? `${y}年` : `${y}`;
    case "Q":
      return zh ? `${y}年${Math.ceil(m / 3)}季度末` : `end of Q${Math.ceil(m / 3)} ${y}`;
    case "M":
      return zh ? `${y}年${m}月` : `${MONTHS_EN[m - 1]} ${y}`;
    case "W":
      return zh ? `${d} 当周` : `week to ${d}`;
    default:
      return d;
  }
}

/** Whole days from the period's end to its release. */
export function lagDays(d: string, p: string): number {
  return Math.round((Date.parse(p) - Date.parse(d)) / DAY);
}

/** 2026-07-23 → 07-23, for a release date shown next to its period. */
export function shortDate(iso: string): string {
  return iso.slice(5);
}
