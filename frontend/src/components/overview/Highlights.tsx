/**
 * "What the numbers say": the facts gold computed, as sentences.
 *
 * Every item is a fact with a fixed definition — first collected recently, a
 * run against a domain threshold, a multi-year extreme, a series that stopped.
 * The page phrases them; it does not select by importance or say what they
 * mean together, because that would be the phase call this project refuses
 * to make (gold/facts.py).
 */

import Link from "next/link";
import type { Panel, Reading } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { labelOf, nameOf, pathOf, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

/** "New" means first collected within this many days of the wall's moment. */
const FRESH_DAYS = 30;
/** Daily and weekly prices arrive every run, so "new" would always list them;
 *  a release is the monthly or quarterly print. */
const RELEASES = new Set(["monthly", "quarterly", "annual"]);

const DAY = 86_400_000;

type Props = { readings: Reading[]; panels: Panel[]; generatedAt: string; locale: Locale };

export function Highlights({ readings, panels, generatedAt, locale }: Props) {
  const t = dict(locale);
  const o = t.overview;
  const asOf = Date.parse(generatedAt.slice(0, 10));
  const daysSince = (iso: string) => Math.round((asOf - Date.parse(iso)) / DAY);

  const fresh = readings.filter(
    (r) =>
      r.first_seen &&
      daysSince(r.first_seen) <= FRESH_DAYS &&
      RELEASES.has(r.granularity ?? "")
  );
  const runs = readings.filter((r) => r.threshold_run);
  const extremes = readings.filter((r) => r.extreme);
  const stale = readings.filter((r) => r.stale);

  const lead = (r: Reading) => (
    <>
      <Link href={`${pathOf(locale, "wall")}#${r.id}`}>{nameOf(r, locale)}</Link>{" "}
      <b className="num">{fmt(r.value, r.unit, locale)}</b>{" "}
      <span className="muted">{unitOf(r.unit, locale)}</span>
      {r.stale && (
        <em className="stale-tag" title={t.gauge.staleSince(r.obs_date, r.age_days ?? 0)}>
          {t.gauge.stale}
        </em>
      )}
    </>
  );
  const lineOf = (id: string) => {
    const th = panels.find((p) => p.id === id)?.threshold;
    return th ? labelOf(th, locale) : "";
  };

  const groups: { key: keyof typeof o.groups; items: React.ReactNode[] }[] = [
    {
      key: "fresh",
      items: fresh.map((r) => (
        <li key={r.id}>
          {lead(r)} · <span className="num">{r.obs_date}</span>
          {r.yoy != null && (
            <span className="num">
              {" "}
              · {t.hud.yoy} {r.yoy > 0 ? "+" : ""}
              {r.yoy}%
            </span>
          )}
          <span className="muted"> · {o.collected(r.first_seen as string)}</span>
        </li>
      )),
    },
    {
      key: "runs",
      items: runs.map((r) => {
        const run = r.threshold_run!;
        return (
          <li key={r.id}>
            {lead(r)} · {o.run(run.side === "below", lineOf(r.id), run.n, run.since)}
          </li>
        );
      }),
    },
    {
      key: "extremes",
      items: extremes.map((r) => {
        const x = r.extreme!;
        return (
          <li key={r.id}>
            {lead(r)} · {o.extreme(x.kind, x.since, x.all)}
          </li>
        );
      }),
    },
    {
      key: "stale",
      items: stale.map((r) => (
        <li key={r.id}>
          <Link href={`${pathOf(locale, "wall")}#${r.id}`}>{nameOf(r, locale)}</Link> ·{" "}
          {o.staleFor(r.age_days ?? 0, r.obs_date)}
        </li>
      )),
    },
  ];
  const shown = groups.filter((g) => g.items.length);

  return (
    <section className="highlights" aria-labelledby="highlights-h">
      <h2 className="section" id="highlights-h">
        {o.changesHeading}
      </h2>
      <p className="section-note">{o.changesNote}</p>
      {shown.length ? (
        <div className="fact-groups">
          {shown.map((g) => (
            <div key={g.key} className="fact-group">
              <h3>
                {o.groups[g.key]}
                {g.key === "fresh" && <span className="muted"> · {o.freshNote}</span>}
              </h3>
              <ul>{g.items}</ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="hint">{o.nothing}</p>
      )}
    </section>
  );
}
