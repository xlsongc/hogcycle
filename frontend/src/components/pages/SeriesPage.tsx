/**
 * One series' own page: what the number is, who publishes it, where it
 * stands, how late it becomes public, whether it has ever changed, and the
 * file to take away.
 *
 * Every name on the site links here. The wall answers how the chain reads at
 * a date; this page answers the questions a reader has about one number
 * before trusting it. A server component, given one panel and its reading,
 * so the page ships one series rather than the contract.
 */

import Link from "next/link";
import type { Market, Panel, Reading } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { SeriesBody } from "@/components/series/SeriesBody";
import { nameOf, pathOf, seriesPath, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { tierVars } from "@/lib/tier";
import { Glossary } from "@/components/Glossary";
import type { TermId } from "@/i18n/en/terms";

/** The terms a series' own page should explain, beyond the release dates
 *  every dated series has. */
const TERMS_OF: Record<string, TermId[]> = {
  sow_inventory: ["sowHerd", "normalHolding", "hollowMarkers"],
  hog_corn_ratio: ["hogCornRatio"],
  hog_corn_ratio_county: ["hogCornRatio"],
};

type Named = { id: string; name_zh: string; name_en: string };

type Props = {
  panel: Panel;
  /** The series this caliber continues, and the one that continues it
   *  (docs/adr/0026): two indicators, and each page says where the other is. */
  earlier?: Named;
  later?: Named;
  reading: Reading | undefined;
  start: string;
  end: string;
  /** The day the contract was generated: the latest a reader can stand on. */
  today: string;
  /** The futures curve's history and track record, when this is that curve. */
  market?: Market;
  locale: Locale;
};

export function SeriesPage({
  panel,
  earlier,
  later,
  reading: r,
  start,
  end,
  today,
  market,
  locale,
}: Props) {
  const t = dict(locale);
  const s = t.series;
  const zh = locale === "zh";
  const name = nameOf(panel, locale);
  const about = panel.about;
  const termIds: TermId[] = [
    ...(TERMS_OF[panel.id] ?? []),
    ...(panel.caliber ? (["caliber"] as const) : []),
    ...(panel.release_lag ? (["releaseVsPeriod"] as const) : []),
  ];

  return (
    <main className="wrap series" style={tierVars(panel.tier)}>
      <p className="crumbs">
        <Link href={pathOf(locale, "overview")}>{t.nav.overview}</Link>
        <span aria-hidden="true"> / </span>
        <span className="series-tier">{t.chart.tierNote[panel.tier]}</span>
      </p>
      <header className="series-head">
        <h1>{name}</h1>
        {about && <p className="series-about">{zh ? about.about_zh : about.about_en}</p>}
        {about && (
          <p className="muted">
            {s.publisher}: {zh ? about.publisher_zh : about.publisher_en}
            {" · "}
            {about.url ? (
              <a href={about.url} rel="noopener noreferrer">
                {s.sourcePage}
              </a>
            ) : (
              s.noUrl
            )}
          </p>
        )}
        {panel.tier === "equity" ? (
          <p className="muted">{s.equity}</p>
        ) : panel.tier === "market" ? (
          <p className="muted">{s.market}</p>
        ) : panel.forecast ? (
          <p className="muted">{s.forecast}</p>
        ) : panel.in_wall === false ? (
          <p className="muted">{s.retired}</p>
        ) : null}
        {earlier && (
          <p className="muted">
            {s.caliberEarlier(
              panel.caliber?.from?.slice(0, 7) ?? null,
              <Link href={seriesPath(locale, earlier.id)}>{nameOf(earlier, locale)}</Link>
            )}
          </p>
        )}
        {later && (
          <p className="muted">
            {s.caliberLater(
              panel.caliber?.until?.slice(0, 7) ?? null,
              <Link href={seriesPath(locale, later.id)}>{nameOf(later, locale)}</Link>
            )}
          </p>
        )}
        {termIds.length > 0 && <Glossary ids={termIds} locale={locale} />}
      </header>

      <SeriesBody
        panel={panel}
        reading={r}
        start={start}
        end={end}
        today={today}
        locale={locale}
        market={market}
      >
        <div className="ov-two">
          <section aria-labelledby="release-h">
            <h2 className="section" id="release-h">
              {s.releaseHeading}
            </h2>
            <p className="section-note">
              {panel.forecast
                ? s.releaseForecast
                : panel.release_lag
                ? s.releaseBody(
                    panel.release_lag.median_days,
                    panel.release_lag.max_days,
                    panel.release_lag.n
                  )
                : s.releaseNone}
            </p>
          </section>

          <section aria-labelledby="revisions-h">
            <h2 className="section" id="revisions-h">
              {s.revisionsHeading}
            </h2>
            {panel.revisions.length ? (
              <>
                <p className="section-note">{s.revisionsNote}</p>
                <table className="series-table">
                  <thead>
                    <tr>
                      <th>{s.cols.period}</th>
                      <th>{s.cols.value}</th>
                      <th>{s.cols.released}</th>
                      <th>{s.cols.learned}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panel.revisions.flatMap((rev) =>
                      rev.prints.map((p, i) => (
                        <tr key={`${rev.d}-${i}`}>
                          <td className="num">{i === 0 ? rev.d : ""}</td>
                          <td className="num">{fmt(p.v, panel.unit, locale)}</td>
                          <td className={p.p ? "num" : undefined}>{p.p ?? s.unknown}</td>
                          <td className="num">{p.learned}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="section-note">{s.revisionsNone}</p>
            )}
          </section>
        </div>
      </SeriesBody>
    </main>
  );
}
