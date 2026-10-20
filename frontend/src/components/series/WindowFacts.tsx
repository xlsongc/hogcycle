"use client";

/**
 * What happened inside the window the reader chose: start and end, the
 * change between them, the high and the low, and where the end sits among
 * the rest (A8).
 *
 * Shown only for a window the reader picked. The whole history already has
 * its facts, computed by gold and printed above; repeating them here as the
 * browser's would be two sources for one number.
 */

import type { WindowStats } from "@/lib/windowStats";
import { fmt } from "@/charts/base/theme";
import { unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { periodLabel } from "@/lib/period";

type Props = { stats: WindowStats | null; unit: string; locale: Locale };

export function WindowFacts({ stats: s, unit, locale }: Props) {
  const t = dict(locale).span;
  if (!s) return null;
  const u = unitOf(unit, locale);
  const value = (v: number) => <b className="num">{fmt(v, unit, locale)}</b>;
  const when = (d: string, g: string) => (
    <span className="muted">{periodLabel(d, g, locale)}</span>
  );
  const sign = s.change > 0 ? "+" : s.change < 0 ? "-" : "";

  return (
    <section className="window-facts" aria-label={t.heading} aria-live="polite">
      <p className="window-head">
        {t.heading} <span className="muted">· {t.note(s.n)}</span>
      </p>
      <dl>
        <div>
          <dt>{t.first}</dt>
          <dd>
            {value(s.first.v)} {when(s.first.d, s.first.g)}
          </dd>
        </div>
        <div>
          <dt>{t.last}</dt>
          <dd>
            {value(s.last.v)} {when(s.last.d, s.last.g)}
          </dd>
        </div>
        <div>
          <dt>{t.change}</dt>
          <dd>
            <b className="num">
              {sign}
              {fmt(Math.abs(s.change), unit, locale)}
            </b>{" "}
            <span className="muted">{u}</span>
            {s.pct != null ? (
              <span className="num">
                {" "}
                ({sign}
                {Math.abs(s.pct).toFixed(1)}%)
              </span>
            ) : (
              <span className="muted"> · {t.noPct}</span>
            )}
          </dd>
        </div>
        <div>
          <dt>{t.high}</dt>
          <dd>
            {value(s.high.v)} {when(s.high.d, s.high.g)}
          </dd>
        </div>
        <div>
          <dt>{t.low}</dt>
          <dd>
            {value(s.low.v)} {when(s.low.d, s.low.g)}
          </dd>
        </div>
      </dl>
      <p className="muted">{t.rank(s.below, s.n - 1)}</p>
    </section>
  );
}
