/**
 * What was published lately, newest first, by the publisher's own date.
 *
 * Only readings whose source dates its releases appear. A daily price
 * "arrives" every morning and would bury the monthly survey that matters;
 * and a feed ordered by when *we* collected would put a 2022 backfill at the
 * top. Publication date is the order a reader following the releases would
 * have seen them in.
 */

import Link from "next/link";
import type { Reading } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { nameOf, seriesPath, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { periodLabel, shortDate } from "@/lib/period";
import { SectionHead } from "@/components/shell/SectionHead";

const SHOWN = 8;

export function ReleaseFeed({
  readings,
  locale,
  index,
}: {
  readings: Reading[];
  locale: Locale;
  index?: string;
}) {
  const o = dict(locale).overview;
  const dated = readings
    .filter((r): r is Reading & { published_on: string } => r.published_on != null)
    .sort((a, b) => (a.published_on < b.published_on ? 1 : -1))
    .slice(0, SHOWN);
  if (!dated.length) return null;

  return (
    <section className="feed" aria-labelledby="feed-h">
      <SectionHead id="feed-h" index={index} title={o.feedHeading} note={o.feedNote} locale={locale} />
      <ol>
        {dated.map((r) => (
          <li key={r.id} className={r.stale ? "stale" : undefined}>
            <time className="num" dateTime={r.published_on}>
              {shortDate(r.published_on)}
            </time>
            <span className="feed-name">
              <Link href={seriesPath(locale, r.id)}>{nameOf(r, locale)}</Link>
              <small>{periodLabel(r.obs_date, r.granularity ?? "", locale)}</small>
            </span>
            <span className="feed-value">
              <span className="num">{fmt(r.value, r.unit, locale)}</span>
              <span className="muted"> {unitOf(r.unit, locale)}</span>
            </span>
            <span
              className={
                r.change ? `feed-change num dir-${r.change.pct < 0 ? "down" : "up"}` : "feed-change"
              }
            >
              {r.change ? `${r.change.pct > 0 ? "+" : ""}${r.change.pct}%` : ""}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
