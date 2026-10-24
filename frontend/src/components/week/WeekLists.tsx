/**
 * The week's three short lists (docs/adr/0039): the futures curve against a
 * week earlier, what came out, and what the release calendar expects next.
 * Each item is a field gold computed; these only lay them out.
 */

import Link from "next/link";
import type { Curve, Panel, Released, Upcoming } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { nameOf, seriesPath, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { arrow } from "@/lib/readingFacts";
import { periodLabel } from "@/lib/period";
import { dayLabel, signedPct } from "@/lib/week";
import { signed } from "@/lib/weekHeadline";

const CURVE_UNIT = "CNY/tonne";

export function WeekCurve({ curve, locale }: { curve: Curve[]; locale: Locale }) {
  const t = dict(locale);
  const c = t.week.curve;
  return (
    <div className="wk-card">
      <table className="wk-curve">
        <thead>
          <tr>
            <th scope="col">{c.contract}</th>
            <th scope="col">{c.settle}</th>
            <th scope="col">{c.change}</th>
          </tr>
        </thead>
        <tbody>
          {curve.map((k) => (
            <tr key={k.delivery}>
              <th scope="row" className="num">
                {t.futures.contract(k.delivery)}
                <small className="wk-date">{k.delivery.slice(0, 7)}</small>
              </th>
              <td className="num">
                <b>{fmt(k.v, CURVE_UNIT, locale)}</b>
              </td>
              <td className="num wk-change">
                {k.delta == null ? (
                  <span className="muted">—</span>
                ) : (
                  <>
                    <span className="wk-arrow" aria-hidden="true">
                      {arrow(k.delta < 0 ? "down" : k.delta > 0 ? "up" : null)}
                    </span>{" "}
                    {signed(k.delta, CURVE_UNIT, locale)}
                    {k.pct != null && <small> {signedPct(k.pct)}</small>}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ReleasedProps = { released: Released[]; panels: Map<string, Panel>; locale: Locale };

export function WeekReleased({ released, panels, locale }: ReleasedProps) {
  const t = dict(locale).week;
  const r = t.released;
  const items = released.filter((x) => panels.has(x.id));
  if (!items.length) return <p className="wk-empty">{r.none}</p>;
  return (
    <ol className="wk-list">
      {items.map((x) => {
        const p = panels.get(x.id) as Panel;
        const facts = [
          x.pct != null && x.prior_d != null
            ? `${r.prior(periodLabel(x.prior_d, x.granularity, locale))} ${signedPct(x.pct)}`
            : null,
          x.yoy != null ? `${r.yoy} ${signedPct(x.yoy)}` : null,
          x.revised_from != null ? r.revisedFrom(fmt(x.revised_from, p.unit, locale)) : null,
        ].filter((f): f is string => f != null);
        return (
          <li key={`${x.id}-${x.d}`}>
            <div className="wk-item-name">
              <Link href={seriesPath(locale, x.id)}>{nameOf(p, locale)}</Link>
              {p.forecast && <em className="wk-tag">{r.forecast}</em>}
              {x.revised_from != null && <em className="wk-tag">{t.revised}</em>}
              <small>{periodLabel(x.d, x.granularity, locale)}</small>
            </div>
            <div className="wk-item-value num">
              <b>{fmt(x.v, p.unit, locale)}</b> <small>{unitOf(p.unit, locale)}</small>
            </div>
            <div className="wk-item-facts num">{facts.join(" · ")}</div>
            <div className="wk-item-when">
              {x.basis === "published"
                ? r.published(dayLabel(x.on, locale))
                : r.learned(dayLabel(x.on, locale))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

type UpcomingProps = { upcoming: Upcoming[]; panels: Map<string, Panel>; locale: Locale };

/** Releases that are due together, as the calendar expects them: most of a
 *  month's figures come out in the same joint release, so one date heads
 *  several names rather than repeating beside each. */
function byDay(items: Upcoming[]): { key: string; first: Upcoming; items: Upcoming[] }[] {
  const groups: { key: string; first: Upcoming; items: Upcoming[] }[] = [];
  for (const x of items) {
    const key = x.overdue ? `overdue ${x.by}` : `${x.usual} ${x.by}`;
    const g = groups.find((y) => y.key === key);
    if (g) g.items.push(x);
    else groups.push({ key, first: x, items: [x] });
  }
  return groups;
}

export function WeekUpcoming({ upcoming, panels, locale }: UpcomingProps) {
  const u = dict(locale).week.upcoming;
  const items = upcoming.filter((x) => panels.has(x.id));
  if (!items.length) return <p className="wk-empty">{u.none}</p>;
  return (
    <ol className="wk-due">
      {byDay(items).map(({ key, first, items: due }) => (
        <li key={key}>
          <div className="wk-due-when num">
            {first.overdue ? (
              <em className="overdue-tag">{u.overdue}</em>
            ) : (
              <b>{u.usual(dayLabel(first.usual, locale))}</b>
            )}
            <small>{u.by(dayLabel(first.by, locale))}</small>
          </div>
          <ul>
            {due.map((x) => (
              <li key={x.id}>
                <Link href={seriesPath(locale, x.id)}>
                  {nameOf(panels.get(x.id) as Panel, locale)}
                </Link>
                <small>{periodLabel(x.period, x.granularity, locale)}</small>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
