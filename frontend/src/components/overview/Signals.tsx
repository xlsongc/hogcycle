/**
 * The three readings the cycle turns on, in causal order: capacity, the
 * price it becomes, and the margin that decides whether capacity follows.
 *
 * Each card answers the questions a reader has about one number, in the
 * order they have them: what is it, how big, which way has it been going,
 * how unusual is that, and how old is it. Every line is a fact gold computed
 * (gold/facts.py) or a field the contract carries; the card arranges them
 * and decides nothing. A stale reading keeps its card and says so first,
 * because a card that quietly showed August's number in October would be
 * the silent failure the collector guards against.
 */

import Link from "next/link";
import type { Panel, Reading } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { nameOf, seriesPath, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { granularityLetter, lagDays, periodLabel, shortDate } from "@/lib/period";
import { arrow, contextOf, trendOf } from "@/lib/readingFacts";
import { Sparkline } from "./Sparkline";
import { tierVars } from "@/lib/tier";

export type Role = "capacity" | "price" | "margin";

/** `outlook` is another source's forecast of the same quantity, shown as
 *  that source's statement and linked to its own page. */
export type Signal = { role: Role; reading: Reading; panel: Panel; outlook?: Reading };

type Props = { signals: Signal[]; end: string; locale: Locale };

/** When the next value is due, or that it is later than any before it
 *  (docs/adr/0031). An expectation the pipeline read off past releases. */
export function NextRelease({ reading: r, locale }: { reading: Reading; locale: Locale }) {
  const o = dict(locale).overview;
  const n = r.next_release;
  if (!n) return null;
  const period = periodLabel(n.period, granularityLetter(r.granularity ?? ""), locale);
  return n.overdue ? (
    <li className="next-overdue">{o.nextOverdue(period, n.by)}</li>
  ) : (
    <li className="muted">{o.nextRelease(period, shortDate(n.usual))}</li>
  );
}

export function Signals({ signals, end, locale }: Props) {
  return (
    <div className="signals">
      {signals.map((s) => (
        <SignalCard key={s.role} {...s} end={end} locale={locale} />
      ))}
    </div>
  );
}

function SignalCard({
  role,
  reading: r,
  panel,
  outlook,
  end,
  locale,
}: Signal & { end: string; locale: Locale }) {
  const t = dict(locale);
  const o = t.overview;
  const g = granularityLetter(r.granularity ?? "");
  const name = nameOf(r, locale);

  const trend = trendOf(r, locale);
  const context = contextOf(r, locale);

  return (
    <article
      className={r.stale ? "signal stale" : "signal"}
      style={tierVars(r.tier)}
    >
      <header>
        <span className="signal-role">{t.tier[role]}</span>
        <span className="signal-note">{o.role[role]}</span>
      </header>
      <h3>
        <Link href={seriesPath(locale, r.id)}>{name}</Link>
      </h3>
      <p className="signal-value">
        <b className="num">{fmt(r.value, r.unit, locale)}</b>
        <span className="signal-unit">{unitOf(r.unit, locale)}</span>
      </p>
      {r.stale && <p className="signal-stale">{o.staleBadge(r.age_days ?? 0)}</p>}
      <ul className="signal-facts">
        {trend && (
          <li className={trend.dir ? `dir-${trend.dir}` : undefined}>
            <span aria-hidden="true">{arrow(trend.dir)}</span> {trend.text}
            {r.streak && r.yoy != null && <span className="muted"> · {o.yoy(r.yoy)}</span>}
          </li>
        )}
        {context && <li className="muted">{context}</li>}
        {r.next_release && <NextRelease reading={r} locale={locale} />}
        {outlook && (
          <li className="signal-outlook">
            <Link href={seriesPath(locale, outlook.id)}>
              {o.outlook(
                "USDA",
                outlook.obs_date.slice(0, 4),
                fmt(outlook.value, outlook.unit, locale),
                unitOf(outlook.unit, locale),
                outlook.published_on ? shortDate(outlook.published_on) : null
              )}
            </Link>
          </li>
        )}
      </ul>
      <Sparkline panel={panel} end={end} label={t.chart.panelLabel(name, r.unit, panel.points.length)} />
      <footer>
        <span>{periodLabel(r.obs_date, g, locale)}</span>
        <span className="muted">
          {r.published_on
            ? o.released(shortDate(r.published_on), lagDays(r.obs_date, r.published_on))
            : o.releaseUnknown}
        </span>
      </footer>
    </article>
  );
}
