/**
 * What the futures market prices each coming month at (docs/adr/0035).
 *
 * The one forward-looking number on the site, and it is not ours: the
 * latest settle of every listed 大商所 live-hog contract, by delivery
 * month. Bars start at zero, so their lengths compare honestly; the
 * numbers carry the detail. Server-rendered: there is nothing to hover.
 */

import Link from "next/link";
import type { Panel, TrackRecord } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { seriesPath, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { tierVars } from "@/lib/tier";
import { SectionHead } from "@/components/shell/SectionHead";

type Props = { curve: Panel; track?: TrackRecord; today: string; locale: Locale; index?: string };

export function FuturesCurve({ curve, track, today, locale, index }: Props) {
  const o = dict(locale).overview;
  // Contracts not yet delivered; an expired one keeps its last settle in
  // the series, but it is history, not an expectation.
  const ahead = curve.points.filter((p) => p.v != null && p.d >= today.slice(0, 8) + "01");
  if (!ahead.length) return null;
  const top = Math.max(...ahead.map((p) => p.v as number));
  const settled = ahead.map((p) => p.p).filter((p): p is string => !!p).sort().pop();
  // How far off such prices have been, so the bars are read with that in
  // mind (docs/adr/0036). The six-month count is the smaller one: fewer
  // contracts were listed that far ahead.
  const three = track?.horizons.find((h) => h.months === 3);
  const six = track?.horizons.find((h) => h.months === 6);

  return (
    <section aria-labelledby="futures-h" style={tierVars("market")}>
      <SectionHead
        id="futures-h"
        index={index}
        title={o.futuresHeading}
        note={o.futuresNote(settled ?? "")}
        method={<p>{o.futuresMethod}</p>}
        locale={locale}
      />
      <div className="futures-card">
        <table className="futures-curve">
          <caption className="sr-only">{o.futuresCaption}</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">{o.futuresMonth}</th>
              <th scope="col">{o.futuresSettle}</th>
            </tr>
          </thead>
          <tbody>
            {ahead.map((p) => (
              <tr key={p.d}>
                <th scope="row" className="num">
                  {p.d.slice(0, 7)}
                </th>
                <td className="futures-bar" aria-hidden="true">
                  <span style={{ width: `${(100 * (p.v as number)) / top}%` }} />
                </td>
                <td className="num">{fmt(p.v, curve.unit, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {three && six && (
          <p className="section-note">
            {o.futuresTrack(three.mean_abs_pct, six.mean_abs_pct, six.mean_pct, six.n)}
          </p>
        )}
        <p className="hint">
          {unitOf(curve.unit, locale)} · <Link href={seriesPath(locale, curve.id)}>{o.futuresMore}</Link>
        </p>
      </div>
    </section>
  );
}
