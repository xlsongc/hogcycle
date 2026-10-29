"use client";

/**
 * How far off the market has been (docs/adr/0036): every delivered
 * contract's settle months ahead against its last, computed by gold.
 *
 * It describes today's history, so like the other computed facts it is
 * hidden when the page stands on a past day.
 */

import { useState } from "react";
import type { Market } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

type Props = { market: Market; unit: string; day: string | null; locale: Locale };

const pct = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`;

export function MarketHistory({ market, unit, day, locale }: Props) {
  const t = dict(locale).futures;
  const [all, setAll] = useState(false);
  const { horizons, deliveries } = market.track_record;
  const months = horizons.map((h) => h.months);

  return (
    <>
      {horizons.length > 0 && (
        <section aria-labelledby="track-h">
          <h2 className="section" id="track-h">
            {t.trackHeading}
          </h2>
          {day ? (
            <p className="section-note">{t.asOfHidden}</p>
          ) : (
            <>
              <p className="section-note">
                {t.trackNote(deliveries.length, deliveries[0]?.delivery.slice(0, 7) ?? "")}
              </p>
              <div className="table-wrap">
                <table className="series-table">
                  <thead>
                    <tr>
                      <th>{t.cols.ahead}</th>
                      <th>{t.cols.n}</th>
                      <th>{t.cols.meanAbs}</th>
                      <th>{t.cols.mean}</th>
                      <th>{t.cols.worst}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {horizons.map((h) => (
                      <tr key={h.months}>
                        <td className="num">{t.months(h.months)}</td>
                        <td className="num">{h.n}</td>
                        <td className="num">{h.mean_abs_pct.toFixed(1)}%</td>
                        <td className="num">{pct(h.mean_pct)}</td>
                        <td className="num">
                          {pct(h.worst_pct)}{" "}
                          <span className="muted">{t.contract(h.worst_delivery)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="hint">{t.signedNote}</p>
              <div className="bar">
                <button aria-pressed={all} onClick={() => setAll((v) => !v)}>
                  {all ? t.hideContracts : t.showContracts}
                </button>
              </div>
              {all && (
                <div className="readings-wrap table-wrap">
                  <table className="series-table">
                    <caption className="sr-only">{t.caption}</caption>
                    <thead>
                      <tr>
                        <th>{t.deliveryCol}</th>
                        <th>
                          {t.finalCol} <span className="muted">{unitOf(unit, locale)}</span>
                        </th>
                        {months.map((m) => (
                          <th key={m}>{t.months(m)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deliveries
                        .slice()
                        .reverse()
                        .map((c) => (
                          <tr key={c.delivery}>
                            <td className="num">{t.contract(c.delivery)}</td>
                            <td className="num">{fmt(c.final, unit, locale)}</td>
                            {months.map((m) => {
                              const a = c.ahead.find((x) => x.months === m);
                              return (
                                <td key={m} className="num">
                                  {a ? (
                                    <>
                                      {fmt(a.v, unit, locale)}{" "}
                                      <span className="muted">{pct(a.err_pct)}</span>
                                    </>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}
