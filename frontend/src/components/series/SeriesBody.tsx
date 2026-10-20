"use client";

/**
 * The parts of a series page that depend on the day it stands on: the latest
 * reading, the history and the recent readings. Everything else on the page
 * is the same on any day, and stays server-rendered (passed in as children).
 *
 * Standing on a past day (docs/adr/0025), the page shows only what was
 * knowable then and says which clock placed each value: the publisher's
 * release, or, for a source that gives none, the day this warehouse learned
 * it. The computed facts describe today's series, so they are not shown.
 */

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { Panel, Reading } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { SeriesChart } from "@/components/series/SeriesChart";
import { AsOfControl } from "@/components/AsOfControl";
import { Cycles } from "@/components/series/Cycles";
import { pathOf, staticPath, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { firstKnowable, knownOn, panelOn, type Known } from "@/lib/asOf";
import { granularityLetter, lagDays, periodLabel } from "@/lib/period";
import { arrow, contextOf, trendOf } from "@/lib/readingFacts";
import { useAsOf } from "@/lib/useAsOf";

const RECENT = 12;

type Props = {
  panel: Panel;
  reading: Reading | undefined;
  start: string;
  end: string;
  /** Today, as the contract knows it: the latest day worth asking about. */
  today: string;
  locale: Locale;
  children: ReactNode;
};

export function SeriesBody({ panel, reading, start, end, today, locale, children }: Props) {
  const t = dict(locale);
  const [day, setDay] = useAsOf();
  const known = day ? knownOn(panel, day) : null;
  const first = firstKnowable(panel);
  const shown = panelOn(panel, day);
  // The chart's twin (B9): the latest dozen by default, every reading on
  // request, for a reader who cannot or would rather not hover.
  const [all, setAll] = useState(false);
  const readings = (known ?? panel.points).filter((p) => p.v != null);
  const recent = (all ? readings : readings.slice(-RECENT)).slice().reverse();
  const unit = unitOf(panel.unit, locale);

  return (
    <>
      {!panel.forecast && first && (
        <AsOfControl day={day} onDay={setDay} min={first.date} max={today} locale={locale} />
      )}

      {known ? (
        <AsOfLatest panel={panel} known={known} day={day as string} locale={locale} />
      ) : (
        reading && <TodayLatest reading={reading} locale={locale} />
      )}

      <section aria-labelledby="history-h">
        <h2 className="section" id="history-h">
          {t.series.chartHeading}
        </h2>
        <SeriesChart
          panel={shown}
          start={start}
          end={day ?? end}
          asOf={day}
          locale={locale}
        />
        <p className="series-links">
          <a href={staticPath(`/data/series/${panel.id}.csv`)} download>
            {t.series.download}
          </a>
          <span className="muted"> · {t.series.downloadNote}</span>
          <br />
          {panel.in_wall !== false ? (
            <Link href={`${pathOf(locale, "wall")}${day ? `?asof=${day}` : ""}#${panel.id}`}>
              {t.series.onWall}
            </Link>
          ) : (
            <Link href={`${pathOf(locale, "compare")}?s=${panel.id}`}>{t.series.inCompare}</Link>
          )}
        </p>
      </section>

      {spansCycles(shown) && <Cycles panel={shown} locale={locale} />}

      {children}

      <section aria-labelledby="recent-h">
        <h2 className="section" id="recent-h">
          {t.series.recentHeading}
        </h2>
        <div className={all ? "readings-wrap table-wrap" : "readings-wrap"}>
          <table className="series-table">
            <thead>
              <tr>
                <th>{t.series.cols.period}</th>
                <th>
                  {t.series.cols.value} <span className="muted">{unit}</span>
                </th>
                <th>{known ? t.asOf.knownFrom : t.series.cols.released}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.d}>
                  <td>{periodLabel(p.d, p.g, locale)}</td>
                  <td className="num">{fmt(p.v, panel.unit, locale)}</td>
                  <td>{whenKnown(p as Known, Boolean(known), locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {readings.length > RECENT && (
          <div className="bar">
            <button aria-pressed={all} onClick={() => setAll((v) => !v)}>
              {all ? t.series.showRecent : t.series.showAll(readings.length)}
            </button>
            {all && <span className="hint">{t.series.allNote}</span>}
          </div>
        )}
      </section>
    </>
  );
}

/** Three years of readings: about one cycle. Below that there is nothing
 *  to lay over anything. */
function spansCycles(panel: Panel): boolean {
  const xs = panel.points.filter((p) => p.v != null);
  const first = xs[0]?.d;
  const last = xs[xs.length - 1]?.d;
  return !panel.forecast && !!first && !!last && Date.parse(last) - Date.parse(first) >= 3 * 365 * 86_400_000;
}

/** The release date where the source gives one; in the as-of view, the day
 *  this warehouse learned it where it does not, said as such. */
function whenKnown(p: Known, asOf: boolean, locale: Locale) {
  const t = dict(locale);
  if (p.p) return <span className="num">{p.p}</span>;
  if (asOf && p.learned) return <span className="muted">{t.asOf.learned(p.learned)}</span>;
  return <span className="muted">{t.series.unknown}</span>;
}

function TodayLatest({ reading: r, locale }: { reading: Reading; locale: Locale }) {
  const t = dict(locale);
  const s = t.series;
  const o = t.overview;
  const trend = trendOf(r, locale);
  const context = contextOf(r, locale);
  return (
    <section className="series-latest" aria-label={s.latest}>
      <p className="signal-value">
        <b className="num">{fmt(r.value, r.unit, locale)}</b>
        <span className="signal-unit">{unitOf(r.unit, locale)}</span>
      </p>
      <p>
        {periodLabel(r.obs_date, granularityLetter(r.granularity ?? ""), locale)}
        {r.published_on && (
          <span className="muted">
            {" · "}
            {lagDays(r.obs_date, r.published_on) < 0
              ? s.ahead(r.published_on, -lagDays(r.obs_date, r.published_on))
              : o.released(r.published_on, lagDays(r.obs_date, r.published_on))}
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
      {r.next_release && (
        <p className={r.next_release.overdue ? "next-overdue" : "muted"}>
          {s.releaseNext(
            periodLabel(r.next_release.period, granularityLetter(r.granularity ?? ""), locale),
            r.next_release.usual,
            r.next_release.by
          )}
        </p>
      )}
    </section>
  );
}

function AsOfLatest({
  panel,
  known,
  day,
  locale,
}: {
  panel: Panel;
  known: Known[];
  day: string;
  locale: Locale;
}) {
  const a = dict(locale).asOf;
  const last = [...known].reverse().find((p) => p.v != null);
  if (!last) {
    const first = firstKnowable(panel);
    return (
      <section className="series-latest" aria-label={a.latest}>
        <p>{a.nothing(day)}</p>
        {first && (
          <p className="muted">
            {first.basis === "published" ? a.firstPublished(first.date) : a.firstLearned(first.date)}
          </p>
        )}
      </section>
    );
  }
  return (
    <section className="series-latest" aria-label={a.latest} aria-live="polite">
      <p className="muted">{a.latest}</p>
      <p className="signal-value">
        <b className="num">{fmt(last.v, panel.unit, locale)}</b>
        <span className="signal-unit">{unitOf(panel.unit, locale)}</span>
      </p>
      <p>
        {periodLabel(last.d, last.g, locale)}
        <span className="muted">
          {" · "}
          {last.p ? a.released(last.p) : a.learned(last.learned ?? "")}
        </span>
      </p>
    </section>
  );
}
