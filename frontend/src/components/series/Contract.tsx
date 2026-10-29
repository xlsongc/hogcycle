"use client";

/**
 * One futures contract at a time (docs/adr/0041): where it stands, its line
 * among the others, and its settle week by week. A live contract is read
 * against its first week; a delivered one against its last settle, which is
 * the question the track record below asks of every contract.
 *
 * Opens on the contract the main continuous price is, and keeps the choice
 * in the address (?c=LH2709) so a link can name one.
 */

import { useEffect, useMemo, useState } from "react";
import type { Market } from "@/types/generated/wall";
import { CurveHistoryChart } from "@/charts/CurveHistoryChart";
import { fmt } from "@/charts/base/theme";
import { staticPath, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { opening, standing, weeks, type Settle } from "@/lib/futures";
import { signedPct } from "@/lib/week";
import { readParams, writeParams } from "@/lib/urlState";

type Props = {
  market: Market;
  unit: string;
  /** The main continuous price's latest settle, to open on its contract. */
  main?: Settle;
  /** The day the page stands on, if not today. */
  day: string | null;
  locale: Locale;
};

const RECENT = 12;

export function Contract({ market, unit, main, day, locale }: Props) {
  const t = dict(locale).futures;
  const s = dict(locale).series;
  const history = useMemo(
    () =>
      day
        ? market.history
            .map((h) => ({ ...h, settles: h.settles.filter((x) => x.d <= day) }))
            .filter((h) => h.settles.length > 0)
        : market.history,
    [market.history, day]
  );
  const [focus, setFocus] = useState(() => opening(history, main));
  const [whole, setWhole] = useState(false);
  const [all, setAll] = useState(false);

  useEffect(() => {
    const code = readParams().get("c");
    const named = history.find((h) => t.contract(h.delivery) === code?.toUpperCase());
    if (named) setFocus(named.delivery);
  }, [history, t]);

  const pick = (delivery: string) => {
    setFocus(delivery);
    setAll(false);
    writeParams({ c: t.contract(delivery) });
  };

  const life = history.find((h) => h.delivery === focus);
  const at = life && standing(life);
  if (!life || !at) return null;
  const record = market.track_record.deliveries.find((d) => d.delivery === life.delivery);
  const code = t.contract(life.delivery);
  const n = (v: number) => fmt(v, unit, locale);
  const ref = life.delivered ? (record?.final ?? at.last.v) : at.first.v;
  const rows = weeks(life.settles, ref);
  const live = history.filter((h) => !h.delivered);
  const done = history.filter((h) => h.delivered).reverse();
  const far = record?.ahead.reduce<(typeof record.ahead)[number] | undefined>(
    (m, a) => (!m || a.months > m.months ? a : m),
    undefined
  );

  return (
    <section aria-labelledby="contract-h">
      <h2 className="section" id="contract-h">
        {t.contractHeading}
      </h2>
      <div className="bar contract-pick">
        {live.map((h) => (
          <button key={h.delivery} aria-pressed={h.delivery === focus} onClick={() => pick(h.delivery)}>
            {t.contract(h.delivery)}
          </button>
        ))}
        {done.length > 0 && (
          <select
            className={life.delivered ? "on" : undefined}
            value={life.delivered ? life.delivery : ""}
            onChange={(e) => e.target.value && pick(e.target.value)}
            aria-label={t.deliveredPick}
          >
            <option value="">{t.deliveredPick}</option>
            {done.map((h) => (
              <option key={h.delivery} value={h.delivery}>
                {t.contract(h.delivery)}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="contract-sum" aria-live="polite">
        {life.delivered
          ? t.doneSum(code, n(ref), record?.final_on ?? at.last.d, far && { months: far.months, v: n(far.v), pct: signedPct(far.err_pct) })
          : t.liveSum(
              code,
              n(at.last.v),
              at.last.d,
              at.weekPct == null ? null : signedPct(at.weekPct),
              signedPct(at.sinceFirst)
            )}
      </p>

      <div className="overlay-card">
        <div className="overlay-head">
          <span className="panel-unit">{unitOf(unit, locale)}</span>
          <button className="link-button" aria-pressed={whole} onClick={() => setWhole((v) => !v)}>
            {whole ? t.closeIn(code) : t.whole}
          </button>
        </div>
        <CurveHistoryChart
          history={history}
          unit={unit}
          locale={locale}
          focus={life.delivery}
          whole={whole}
          onPick={pick}
        />
      </div>

      <div className="table-scroll contract-weeks">
        <table className="series-table">
          <caption className="sr-only">{t.weeksCaption(code)}</caption>
          <thead>
            <tr>
              <th>{t.cols.week}</th>
              <th>{t.cols.settle}</th>
              <th>{t.cols.onWeek}</th>
              <th>{life.delivered ? t.cols.vsFinal : t.cols.vsFirst}</th>
            </tr>
          </thead>
          <tbody>
            {(all ? rows : rows.slice(0, RECENT)).map((r) => (
              <tr key={r.d}>
                <td className="num">{r.d}</td>
                <td className="num">{n(r.v)}</td>
                <td className="num">{r.week == null ? "—" : signedPct(r.week)}</td>
                <td className="num">{signedPct(r.against)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bar">
        {rows.length > RECENT && (
          <button aria-pressed={all} onClick={() => setAll((v) => !v)}>
            {all ? s.showRecent : t.allWeeks(rows.length)}
          </button>
        )}
        <a className="hint" href={staticPath("/data/futures/lh_contracts.csv")} download>
          {t.download}
        </a>
      </div>
    </section>
  );
}
