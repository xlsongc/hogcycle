/**
 * "Worth noting": the facts gold computed, as sentences.
 *
 * Every item is a fact with a fixed definition — a run against a domain
 * threshold, a multi-year extreme, a series that stopped. What is new lives
 * beside it in ReleaseFeed, ordered by publication rather than collection.
 * The page phrases them; it does not select by importance or say what they
 * mean together, because that would be the phase call this project refuses
 * to make (gold/facts.py).
 */

import Link from "next/link";
import type { Panel, Reading } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { labelOf, nameOf, seriesPath, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { granularityLetter, periodLabel } from "@/lib/period";
import { SectionHead } from "@/components/shell/SectionHead";

type Props = { readings: Reading[]; panels: Panel[]; locale: Locale; index?: string };

export function Highlights({ readings, panels, locale, index }: Props) {
  const t = dict(locale);
  const o = t.overview;
  const runs = readings.filter((r) => r.threshold_run);
  const extremes = readings.filter((r) => r.extreme);
  const stale = readings.filter((r) => r.stale);
  // Overdue but not yet stale: a stale series is already listed above.
  const overdue = readings.filter((r) => r.next_release?.overdue && !r.stale);

  const lead = (r: Reading) => (
    <>
      <Link href={seriesPath(locale, r.id)}>{nameOf(r, locale)}</Link>{" "}
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
          <Link href={seriesPath(locale, r.id)}>{nameOf(r, locale)}</Link> ·{" "}
          {o.staleFor(r.age_days ?? 0, r.obs_date)}
        </li>
      )),
    },
    {
      key: "overdue",
      items: overdue.map((r) => {
        const n = r.next_release!;
        const g = granularityLetter(r.granularity ?? "");
        return (
          <li key={r.id}>
            <Link href={seriesPath(locale, r.id)}>{nameOf(r, locale)}</Link> ·{" "}
            {o.overdueFor(periodLabel(n.period, g, locale), n.by)}
          </li>
        );
      }),
    },
  ];
  const shown = groups.filter((g) => g.items.length);

  return (
    <section className="highlights" aria-labelledby="highlights-h">
      <SectionHead id="highlights-h" index={index} title={o.factsHeading} locale={locale} />
      {shown.length ? (
        <div className="fact-groups">
          {shown.map((g) => (
            <div key={g.key} className="fact-group">
              <h3>{o.groups[g.key]}</h3>
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
