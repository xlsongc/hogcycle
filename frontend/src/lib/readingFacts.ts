/**
 * The sentences a reading's computed facts become, shared by the overview
 * cards and the series pages so the two cannot describe one number two ways.
 *
 * A run beats a single move, which beats nothing, because each says strictly
 * more about direction than the next. Context is a multi-year extreme when
 * there is one, else the reading's place in its own history.
 */

import type { Reading } from "@/types/generated/wall";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { granularityLetter } from "./period";

export type Trend = { text: string; dir: "up" | "down" | null };

export function trendOf(r: Reading, locale: Locale): Trend | null {
  const o = dict(locale).overview;
  const g = granularityLetter(r.granularity ?? "");
  if (r.streak) return { text: o.streak(r.streak.dir, r.streak.n, g), dir: r.streak.dir };
  if (r.change) {
    return { text: o.change(r.change.pct, r.change.since), dir: r.change.pct < 0 ? "down" : "up" };
  }
  return null;
}

export function contextOf(r: Reading, locale: Locale): string | null {
  const o = dict(locale).overview;
  if (r.extreme) return o.extreme(r.extreme.kind, r.extreme.since, r.extreme.all);
  return r.percentile != null ? o.position(r.percentile) : null;
}

export function arrow(dir: Trend["dir"]): string {
  return dir === "down" ? "▼" : dir === "up" ? "▲" : "•";
}
