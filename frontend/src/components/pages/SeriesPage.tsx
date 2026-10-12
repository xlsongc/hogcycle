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
import type { Panel, Reading } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { SeriesChart } from "@/components/series/SeriesChart";
import { nameOf, pathOf, staticPath, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { granularityLetter, lagDays, periodLabel } from "@/lib/period";
import { arrow, contextOf, trendOf } from "@/lib/readingFacts";

const RECENT = 12;

type Props = {
  panel: Panel;
  reading: Reading | undefined;
  start: string;
  end: string;
  locale: Locale;
};

export function SeriesPage({ panel, reading: r, start, end, locale }: Props) {
  const t = dict(locale);
  const s = t.series;
  const o = t.overview;
  const zh = locale === "zh";
  const name = nameOf(panel, locale);
  const about = panel.about;
  const unit = unitOf(panel.unit, locale);
  const trend = r ? trendOf(r, locale) : null;
  const context = r ? contextOf(r, locale) : null;
  const recent = panel.points.filter((p) => p.v != null).slice(-RECENT).reverse();

  return (
    <main className="wrap series" style={{ ["--tier" as string]: `var(--${panel.tier})` }}>
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
        ) : panel.in_wall === false ? (
          <p className="muted">{s.retired}</p>
        ) : null}
      </header>

      {r && (
        <section className="series-latest" aria-label={s.latest}>
          <p className="signal-value">
            <b className="num">{fmt(r.value, r.unit, locale)}</b>
            <span className="signal-unit">{unit}</span>
          </p>
          <p>
            {periodLabel(r.obs_date, granularityLetter(r.granularity ?? ""), locale)}
            {r.published_on && (
              <span className="muted">
                {" · "}
                {o.released(r.published_on, lagDays(r.obs_date, r.published_on))}
              </span>
            )}
            {r.stale && <span className="stale-tag">{o.staleBadge(r.age_days ?? 0)}</span>}
          </p>
          <ul className="signal-facts">
            {trend && (
              <li className={trend.dir ? `dir-${trend.dir}` : undefined}>
                <span aria-hidden="true">{arrow(trend.dir)}</span> {trend.text}
                {r.yoy != null && <span className="muted"> · {o.yoy(r.yoy)}</span>}
              </li>
            )}
            {context && <li className="muted">{context}</li>}
          </ul>
        </section>
      )}

      <section aria-labelledby="history-h">
        <h2 className="section" id="history-h">
          {s.chartHeading}
        </h2>
        <SeriesChart panel={panel} start={start} end={end} locale={locale} />
        <p className="series-links">
          <a href={staticPath(`/data/series/${panel.id}.csv`)} download>
            {s.download}
          </a>
          <span className="muted"> · {s.downloadNote}</span>
          <br />
          {panel.in_wall !== false ? (
            <Link href={`${pathOf(locale, "wall")}#${panel.id}`}>{s.onWall}</Link>
          ) : (
            <Link href={`${pathOf(locale, "compare")}?s=${panel.id}`}>{s.inCompare}</Link>
          )}
        </p>
      </section>

      <div className="ov-two">
        <section aria-labelledby="release-h">
          <h2 className="section" id="release-h">
            {s.releaseHeading}
          </h2>
          <p className="section-note">
            {panel.release_lag
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
                        <td>{i === 0 ? rev.d : ""}</td>
                        <td>{fmt(p.v, panel.unit, locale)}</td>
                        <td>{p.p ?? s.unknown}</td>
                        <td>{p.learned}</td>
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

      <section aria-labelledby="recent-h">
        <h2 className="section" id="recent-h">
          {s.recentHeading}
        </h2>
        <div className="readings-wrap">
          <table className="series-table">
            <thead>
              <tr>
                <th>{s.cols.period}</th>
                <th>
                  {s.cols.value} <span className="muted">{unit}</span>
                </th>
                <th>{s.cols.released}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.d}>
                  <td>{periodLabel(p.d, p.g, locale)}</td>
                  <td>{fmt(p.v, panel.unit, locale)}</td>
                  <td>{p.p ?? <span className="muted">{s.unknown}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
