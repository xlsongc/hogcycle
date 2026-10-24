/**
 * One issue of the weekly digest (docs/adr/0039): the week in a sentence,
 * the prices, the futures curve, what came out, what is due, the listed
 * producers, and every other issue.
 *
 * A server component, and nothing on it runs in the browser: every number
 * is gold's, and the page arranges them. It reads as plain text first, so a
 * link pasted into a chat or a feed reader carries the week with it.
 */

import Link from "next/link";
import type { Panel, WallContract, Week } from "@/types/generated/wall";
import { dict } from "@/i18n/dict";
import { nameOf, staticPath, weekPath, type Locale } from "@/i18n/locale";
import { SectionHead } from "@/components/shell/SectionHead";
import { WeekMoves } from "@/components/week/WeekMoves";
import { WeekCurve, WeekReleased, WeekUpcoming } from "@/components/week/WeekLists";
import { dayLabel, signedPct, spot, weekNumber, weekRange } from "@/lib/week";
import { headline } from "@/lib/weekHeadline";

type Props = { data: WallContract; week: Week; locale: Locale };

function Pager({ prev, next, locale }: { prev?: Week; next?: Week; locale: Locale }) {
  const t = dict(locale).week;
  if (!prev && !next) return null;
  return (
    <nav className="wk-pager" aria-label={t.archive.title}>
      {prev ? (
        <Link href={weekPath(locale, prev.id)} rel="prev">
          <small>← {t.prev}</small>
          <span>{weekRange(prev.start, prev.end, locale)}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={weekPath(locale, next.id)} rel="next" className="wk-pager-next">
          <small>{t.next} →</small>
          <span>{weekRange(next.start, next.end, locale)}</span>
        </Link>
      )}
    </nav>
  );
}

type ArchiveProps = { weeks: Week[]; current: string; panels: Map<string, Panel>; locale: Locale };

function Archive({ weeks, current, panels, locale }: ArchiveProps) {
  const t = dict(locale).week;
  return (
    <ol className="wk-archive">
      {[...weeks].reverse().map((w) => {
        const { n } = weekNumber(w.id);
        const m = spot(w);
        return (
          <li key={w.id}>
            <Link href={weekPath(locale, w.id)} aria-current={w.id === current ? "page" : undefined}>
              <span className="wk-archive-n num">W{n}</span>
              <span className="wk-archive-range">{weekRange(w.start, w.end, locale, true)}</span>
              {!w.complete && (
                <span className="live-dot" title={t.archive.current}>
                  <span className="sr-only">{t.archive.current}</span>
                </span>
              )}
              {m?.pct != null && panels.has(m.id) && (
                <span
                  className="wk-archive-move num"
                  title={nameOf(panels.get(m.id) as Panel, locale)}
                >
                  {signedPct(m.pct)}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export function WeekPage({ data, week, locale }: Props) {
  const t = dict(locale).week;
  const panels = new Map<string, Panel>(data.panels.map((p) => [p.id, p]));
  const weeks = data.weeks ?? [];
  const at = weeks.findIndex((w) => w.id === week.id);
  const { year, n } = weekNumber(week.id);
  const lede = headline(week, panels, locale);
  const equity = (id: string) => panels.get(id)?.tier === "equity";
  const cycle = week.moves.filter((m) => !equity(m.id));
  const shares = week.moves.filter((m) => equity(m.id));
  const settled = week.curve.map((k) => k.on).sort().pop();

  // Sections are numbered as drawn, so a week without a curve does not
  // skip a number.
  let count = 0;
  const index = () => String(++count).padStart(2, "0");

  return (
    <main className="wrap week">
      <header className="wk-head">
        <p className="wk-kicker">{t.kicker(year, n)}</p>
        <h1>{t.title(weekRange(week.start, week.end, locale))}</h1>
        <p className="wk-lede">{lede ?? t.noHeadline}</p>
        <ul className="ov-stamp">
          <li>
            {!week.complete && <span className="live-dot" aria-hidden="true" />}
            <span className="num">
              {week.complete ? t.closed(dayLabel(week.end, locale)) : t.open(dayLabel(week.cut, locale))}
            </span>
          </li>
          <li>
            <a href={staticPath(locale === "zh" ? "/zh/week.xml" : "/week.xml")}>{t.feed}</a>
          </li>
        </ul>
      </header>

      <section aria-labelledby="wk-moves-h">
        <SectionHead
          id="wk-moves-h"
          index={index()}
          title={t.moves.title}
          note={t.moves.note}
          method={t.method}
          locale={locale}
        />
        <WeekMoves moves={cycle} panels={panels} locale={locale} />
      </section>

      {week.curve.length > 0 && (
        <section aria-labelledby="wk-curve-h">
          <SectionHead
            id="wk-curve-h"
            index={index()}
            title={t.curve.title}
            note={t.curve.note(dayLabel(settled ?? week.cut, locale))}
            locale={locale}
          />
          <WeekCurve curve={week.curve} locale={locale} />
        </section>
      )}

      <div className="wk-two">
        <section aria-labelledby="wk-released-h">
          <SectionHead
            id="wk-released-h"
            index={index()}
            title={t.released.title}
            note={t.released.note}
            locale={locale}
          />
          <WeekReleased released={week.released} panels={panels} locale={locale} />
        </section>
        <section aria-labelledby="wk-due-h">
          <SectionHead
            id="wk-due-h"
            index={index()}
            title={t.upcoming.title}
            note={t.upcoming.note}
            locale={locale}
          />
          <WeekUpcoming upcoming={week.upcoming} panels={panels} locale={locale} />
        </section>
      </div>

      {shares.length > 0 && (
        <section aria-labelledby="wk-eq-h">
          <SectionHead
            id="wk-eq-h"
            index={index()}
            title={t.equities.title}
            note={t.equities.note}
            locale={locale}
          />
          <WeekMoves moves={shares} panels={panels} locale={locale} grouped={false} />
        </section>
      )}

      <Pager prev={weeks[at - 1]} next={weeks[at + 1]} locale={locale} />

      <section aria-labelledby="wk-archive-h">
        <SectionHead
          id="wk-archive-h"
          index={index()}
          title={t.archive.title}
          note={t.archive.note}
          locale={locale}
        />
        <Archive weeks={weeks} current={week.id} panels={panels} locale={locale} />
      </section>
    </main>
  );
}
