/**
 * The week in one sentence (docs/adr/0039): the lede of an issue, the line
 * on the overview, and the description a shared link carries.
 */

import type { Move, Panel, Week } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { nameOf, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { HEADLINE, quiet, signedPct } from "./week";

/** A change with its sign written out: "+0.25", "−0.34". */
export function signed(v: number, unit: string, locale: Locale): string {
  const s = fmt(Math.abs(v), unit, locale);
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : s;
}

/** One sentence of the week's moves, or null when none of them moved. */
export function headline(week: Week, panels: Map<string, Panel>, locale: Locale): string | null {
  const t = dict(locale).week;
  const parts = HEADLINE.flatMap((ids) => {
    const m = ids
      .map((id) => week.moves.find((x) => x.id === id))
      .find((x): x is Move => x != null && !quiet(x));
    const p = m && panels.get(m.id);
    if (!m || !p) return [];
    const value = `${fmt(m.v, p.unit, locale)} ${unitOf(p.unit, locale)}`;
    const delta = m.delta == null ? null : signed(m.delta, p.unit, locale);
    const pct = m.pct == null ? null : signedPct(m.pct);
    return [t.headlinePart(nameOf(p, locale), value, delta, pct)];
  });
  return parts.length ? parts.join(t.join) + t.stop : null;
}
