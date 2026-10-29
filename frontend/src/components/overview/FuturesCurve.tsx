/**
 * What the futures market prices each coming month at (docs/adr/0035): the
 * latest settle of every listed 大商所 live-hog contract, its move on the
 * week, and one line on the curve's shape. Bars start at zero, so their
 * lengths compare honestly. Server-rendered.
 */

import Link from "next/link";
import type { History, Panel, TrackRecord } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { seriesPath, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { tierVars } from "@/lib/tier";
import { pct, standing } from "@/lib/futures";
import { signedPct } from "@/lib/week";
import { SectionHead } from "@/components/shell/SectionHead";

type Props = {
  curve: Panel;
  history?: History[];
  track?: TrackRecord;
  today: string;
  locale: Locale;
  index?: string;
};

export function FuturesCurve({ curve, history, track, today, locale, index }: Props) {
  const o = dict(locale).overview;
  // Contracts not yet delivered; an expired one keeps its last settle in
  // the series, but it is history, not an expectation.
  const ahead = curve.points.filter(
    (p): p is typeof p & { v: number } => p.v != null && p.d >= today.slice(0, 8) + "01"
  );
  const near = ahead[0];
  const far = ahead[ahead.length - 1];
  if (!near || !far) return null;
  const top = Math.max(...ahead.map((p) => p.v));
  const settled = ahead.map((p) => p.p).filter((p): p is string => !!p).sort().pop();
  const six = track?.horizons.find((h) => h.months === 6);
  const n = (v: number) => fmt(v, curve.unit, locale);
  const week = (delivery: string) => {
    const life = history?.find((h) => h.delivery === delivery);
    return life ? standing(life)?.weekPct : undefined;
  };

  return (
    <section aria-labelledby="futures-h" style={tierVars("market")}>
      <SectionHead
        id="futures-h"
        index={index}
        title={o.futuresHeading}
        note={o.futuresNote(settled ?? "")}
        locale={locale}
      />
      <div className="futures-card">
        <p className="futures-answer">
          {o.futuresSpread(
            near.d.slice(0, 7),
            n(near.v),
            far.d.slice(0, 7),
            n(far.v),
            pct(far.v, near.v)
          )}
        </p>
        <table className="futures-curve">
          <caption className="sr-only">{o.futuresCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{o.futuresMonth}</th>
              <th scope="col" aria-hidden="true" />
              <th scope="col" className="num">
                {o.futuresSettle}
              </th>
              <th scope="col" className="num">
                {o.futuresWeek}
              </th>
            </tr>
          </thead>
          <tbody>
            {ahead.map((p) => {
              const w = week(p.d);
              return (
                <tr key={p.d}>
                  <th scope="row" className="num">
                    {p.d.slice(0, 7)}
                  </th>
                  <td className="futures-bar" aria-hidden="true">
                    <span style={{ width: `${(100 * p.v) / top}%` }} />
                  </td>
                  <td className="num">{n(p.v)}</td>
                  <td className="num muted">{w == null ? "—" : signedPct(w)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {six && <p className="section-note">{o.futuresTrack(six.mean_abs_pct, six.mean_pct, six.n)}</p>}
        <p className="hint">
          {unitOf(curve.unit, locale)} · <Link href={seriesPath(locale, curve.id)}>{o.futuresMore}</Link>
        </p>
      </div>
    </section>
  );
}
