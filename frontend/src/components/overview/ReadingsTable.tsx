/**
 * Every reading on the causal wall, one row each, grouped by tier.
 *
 * Replaces the grid of equal-sized tiles, where thirteen boxes of identical
 * weight left the eye nowhere to land. A table lets the reader scan one
 * column — value, change, position — down the whole chain, and puts the
 * series that stopped updating in a column of their own rather than in a
 * footnote.
 */

import Link from "next/link";
import type { Reading } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { nameOf, pathOf, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

const TIERS: Reading["tier"][] = ["capacity", "margin", "price", "noise"];

const GRAN: Record<string, "D" | "W" | "M" | "Q" | "A"> = {
  daily: "D",
  weekly: "W",
  monthly: "M",
  quarterly: "Q",
  annual: "A",
};

export function ReadingsTable({ readings, locale }: { readings: Reading[]; locale: Locale }) {
  const t = dict(locale);
  const copy = t.readings;

  return (
    <section aria-labelledby="readings-h">
      <h2 className="section" id="readings-h">
        {copy.heading}
      </h2>
      <p className="section-note">{copy.note}</p>
      <div className="readings-wrap">
        <table className="readings">
          <thead>
            <tr>
              <th>{copy.name}</th>
              <th>{copy.value}</th>
              <th>{copy.yoy}</th>
              <th>{copy.position}</th>
              <th>{copy.asOf}</th>
              <th>{copy.status}</th>
            </tr>
          </thead>
          {TIERS.map((tier) => {
            const rows = readings.filter((r) => r.tier === tier);
            if (!rows.length) return null;
            return (
              <tbody key={tier} style={{ ["--tier" as string]: `var(--${tier})` }}>
                <tr className="tier-row">
                  <th colSpan={6} title={t.chart.tierNote[tier]}>
                    {t.tier[tier]}
                  </th>
                </tr>
                {rows.map((r) => {
                  const g = GRAN[r.granularity ?? ""];
                  return (
                    <tr key={r.id} className={r.stale ? "stale" : undefined}>
                      <td>
                        <Link href={`${pathOf(locale, "wall")}#${r.id}`}>{nameOf(r, locale)}</Link>
                        {r.id === "sow_inventory" && (
                          <span className="row-note">{copy.movingBaseline}</span>
                        )}
                      </td>
                      <td>
                        <b>{fmt(r.value, r.unit, locale)}</b>{" "}
                        <span className="muted">{unitOf(r.unit, locale)}</span>
                      </td>
                      <td>{r.yoy == null ? "—" : `${r.yoy > 0 ? "+" : ""}${r.yoy}%`}</td>
                      <td>
                        {r.percentile == null ? (
                          <span className="muted" title={copy.noPositionTitle}>
                            —
                          </span>
                        ) : (
                          <span className="position" title={copy.positionTitle(r.percentile)}>
                            <span className="strip" aria-hidden="true">
                              <i style={{ left: `${r.percentile}%` }} />
                            </span>
                            {copy.ordinal(r.percentile)}
                          </span>
                        )}
                      </td>
                      <td title={g ? t.chart.granularityName[g] : undefined}>
                        {r.obs_date}
                        {g ? ` · ${t.granularity[g]}` : ""}
                      </td>
                      <td>
                        {r.stale ? (
                          <em
                            className="stale-tag"
                            title={t.gauge.staleSince(r.obs_date, r.age_days ?? 0)}
                          >
                            {t.gauge.stale}
                          </em>
                        ) : (
                          <span className="muted">{copy.live}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>
    </section>
  );
}
