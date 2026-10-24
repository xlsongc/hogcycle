/**
 * The week's moves (docs/adr/0039): each daily and weekly series' latest
 * reading against the latest a week earlier, grouped along the chain. A
 * series with nothing new is named under the table rather than given a row
 * of zeros. Moves are drawn in ink with an arrow, never red or green.
 */

import Link from "next/link";
import type { Move, Panel } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { nameOf, seriesPath, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { arrow } from "@/lib/readingFacts";
import { shortDate } from "@/lib/period";
import { tierVars } from "@/lib/tier";
import { quiet, revised, signedPct } from "@/lib/week";
import { signed } from "@/lib/weekHeadline";

// Prices first: they are what a weekly reader came for. Then the futures
// beside them, the piglet price, the inputs and margins, the rest.
const ORDER: Panel["tier"][] = ["price", "market", "capacity", "margin", "noise", "equity"];

type Props = {
  moves: Move[];
  panels: Map<string, Panel>;
  locale: Locale;
  /** Group rows under their tier's heading. Off for a single-tier table. */
  grouped?: boolean;
};

function Change({ m, unit, locale }: { m: Move; unit: string; locale: Locale }) {
  if (m.delta == null) return <span className="muted">—</span>;
  const dir = m.delta < 0 ? "down" : m.delta > 0 ? "up" : null;
  return (
    <>
      <span className="wk-arrow" aria-hidden="true">
        {arrow(dir)}
      </span>{" "}
      {signed(m.delta, unit, locale)}
      {m.pct != null && <small> {signedPct(m.pct)}</small>}
    </>
  );
}

export function WeekMoves({ moves, panels, locale, grouped = true }: Props) {
  const t = dict(locale).week;
  const shown = moves.filter((m) => panels.has(m.id) && !quiet(m));
  const still = moves.filter((m) => panels.has(m.id) && quiet(m));
  const tiers = ORDER.filter((tier) => shown.some((m) => panels.get(m.id)?.tier === tier));

  return (
    <>
      <div className="wk-card">
        <table className="wk-moves">
          <thead>
            <tr>
              <th scope="col">{t.cols.series}</th>
              <th scope="col">{t.cols.latest}</th>
              <th scope="col">{t.cols.change}</th>
              <th scope="col">{t.cols.range}</th>
            </tr>
          </thead>
          {tiers.map((tier) => (
            <tbody key={tier} style={tierVars(tier)}>
              {grouped && (
                <tr className="wk-group">
                  <th colSpan={4} scope="colgroup">
                    {t.groups[tier]}
                  </th>
                </tr>
              )}
              {shown
                .filter((m) => panels.get(m.id)?.tier === tier)
                .map((m) => {
                  const p = panels.get(m.id) as Panel;
                  return (
                    <tr key={m.id}>
                      <td>
                        <Link href={seriesPath(locale, m.id)}>{nameOf(p, locale)}</Link>
                        {revised(m) && <em className="wk-tag">{t.revised}</em>}
                        {m.prev_d == null && <em className="wk-tag">{t.firstWeek}</em>}
                      </td>
                      <td className="num">
                        <b>{fmt(m.v, p.unit, locale)}</b> <small>{unitOf(p.unit, locale)}</small>
                        <small className="wk-date">{shortDate(m.d)}</small>
                      </td>
                      <td className="num wk-change">
                        <Change m={m} unit={p.unit} locale={locale} />
                      </td>
                      <td className="num wk-range">
                        {m.lo != null && m.hi != null
                          ? `${fmt(m.lo, p.unit, locale)} – ${fmt(m.hi, p.unit, locale)}`
                          : ""}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          ))}
        </table>
      </div>
      {still.length > 0 && (
        <p className="wk-quiet">
          {/* A space after the label is a gap between two characters in
              Chinese, where the label already ends in a full-width colon. */}
          <span>{t.quietLabel}</span>
          {locale === "zh" ? "" : " "}
          {still.map((m, i) => {
            const p = panels.get(m.id) as Panel;
            return (
              <span key={m.id}>
                {i > 0 && (locale === "zh" ? "、" : ", ")}
                <Link href={seriesPath(locale, m.id)}>{nameOf(p, locale)}</Link>
                <small className="muted"> {shortDate(m.d)}</small>
              </span>
            );
          })}
        </p>
      )}
    </>
  );
}
