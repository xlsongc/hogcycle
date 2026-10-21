/**
 * The day's prices in one strip, under the heading: the readings a reader
 * checks every morning, each with its latest move and the date it is for.
 *
 * Every number is a reading the contract carries and every move is gold's
 * own `change` (ADR-0019): the strip arranges, it does not compute. Moves
 * are drawn in ink, with an arrow, never red or green.
 */

import Link from "next/link";
import type { Reading } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { nameOf, seriesPath, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { arrow } from "@/lib/readingFacts";
import { shortDate } from "@/lib/period";

// Daily and weekly prices along the chain, spot before futures before
// inputs before the retail end.
const IDS = [
  "hog_price_wai3",
  "lh_futures_main",
  "piglet_price",
  "corn_price",
  "soymeal_price_county",
  "pork_price_county",
];

export function Ticker({ readings, locale }: { readings: Reading[]; locale: Locale }) {
  const o = dict(locale).overview;
  const shown = IDS.flatMap((id) => readings.filter((r) => r.id === id && r.value != null));
  if (!shown.length) return null;
  return (
    <ul className="ticker" aria-label={o.tickerLabel}>
      {shown.map((r) => {
        const pct = r.change?.pct;
        const dir = pct == null || pct === 0 ? null : pct < 0 ? "down" : "up";
        return (
          <li key={r.id}>
            <Link href={seriesPath(locale, r.id)}>
              <span className="ticker-name" title={nameOf(r, locale)}>
                {nameOf(r, locale)}
              </span>
              <span className="ticker-value num">
                <b>{fmt(r.value, r.unit, locale)}</b> <small>{unitOf(r.unit, locale)}</small>
              </span>
              <span className="ticker-move num">
                {pct != null && (
                  <>
                    <span aria-hidden="true">{arrow(dir)}</span> {pct > 0 ? "+" : pct < 0 ? "−" : ""}
                    {Math.abs(pct)}%
                  </>
                )}
                <span className="muted"> {shortDate(r.obs_date)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
