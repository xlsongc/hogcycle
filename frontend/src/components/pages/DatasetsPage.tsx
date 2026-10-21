/**
 * Data and API: every series as a file, the addresses that stay put, what
 * the columns mean, and how to cite it. The files are written by the
 * export (backend export/feeds.py, series_csv.py); this page only lists
 * them, so a series with a page here has a file there.
 */

import Link from "next/link";
import type { Panel, Reading, WallContract } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { nameOf, seriesPath, staticPath, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { tierVars } from "@/lib/tier";
import { SectionHead } from "@/components/shell/SectionHead";

// The chain's order, then what sits beside it.
const TIERS: Panel["tier"][] = ["capacity", "price", "margin", "noise", "market", "equity"];
const SITE = "https://xlsongc.github.io/hogcycle";

export function DatasetsPage({ data, locale }: { data: WallContract; locale: Locale }) {
  const t = dict(locale);
  const d = t.datasets;
  const today = data.generated_at.slice(0, 10);
  const readingOf = new Map(data.readings.map((r) => [r.id, r] as [string, Reading]));
  const example = data.panels.find((p) => p.id === "sow_inventory") ?? data.panels[0];

  return (
    <main className="wrap datasets">
      <header className="page-head">
        <h1>{d.heading}</h1>
        <p className="sub">{d.sub}</p>
      </header>

      <section aria-labelledby="endpoints-h">
        <SectionHead id="endpoints-h" index="01" title={d.endpointsHeading} note={d.endpointsNote} locale={locale} />
        <dl className="endpoints">
          {d.endpoints.map(([path, what]) => (
            <div key={path}>
              <dt>
                <code>{`${SITE}/${path}`}</code>
              </dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
        {example && (
          <>
            <p className="hint">{d.example}</p>
            <pre className="code">
              <code>{`curl ${SITE}/data/series/${example.id}.csv\n\nimport pandas as pd\ndf = pd.read_csv("${SITE}/data/series/${example.id}.csv", parse_dates=["obs_date"])`}</code>
            </pre>
          </>
        )}
      </section>

      <section aria-labelledby="columns-h">
        <SectionHead id="columns-h" index="02" title={d.columnsHeading} locale={locale} />
        <dl className="endpoints columns">
          {d.columns.map(([col, what]) => (
            <div key={col}>
              <dt>
                <code>{col}</code>
              </dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="series-h">
        <SectionHead id="series-h" index="03" title={d.seriesHeading} note={d.seriesNote} locale={locale} />
        <div className="table-scroll">
          <table className="datasets-table">
            <thead>
              <tr>
                <th>{d.cols.name}</th>
                <th>{d.cols.unit}</th>
                <th>{d.cols.freq}</th>
                <th>{d.cols.latest}</th>
                <th>{d.cols.files}</th>
              </tr>
            </thead>
            {TIERS.map((tier) => {
              const panels = data.panels.filter((p) => p.tier === tier);
              if (!panels.length) return null;
              return (
                <tbody key={tier} style={tierVars(tier)}>
                  <tr className="tier-row">
                    <th colSpan={5}>{t.chart.tierNote[tier]}</th>
                  </tr>
                  {panels.map((p) => {
                    const r = readingOf.get(p.id);
                    return (
                      <tr key={p.id}>
                        <td>
                          <Link href={seriesPath(locale, p.id)}>{nameOf(p, locale)}</Link>
                          <span className="row-note">
                            <code>{p.id}</code>
                            {p.in_wall === false && ` · ${d.offWall}`}
                          </span>
                        </td>
                        <td>{unitOf(p.unit, locale)}</td>
                        <td>{(p.freq && d.freq[p.freq]) ?? p.freq ?? "—"}</td>
                        <td className="num">
                          {r ? (
                            <>
                              <b>{fmt(r.value, r.unit, locale)}</b> <span className="muted">{r.obs_date}</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="files">
                          <a href={staticPath(`/data/series/${p.id}.csv`)} download>
                            CSV
                          </a>
                          <a href={staticPath(`/data/series/${p.id}.json`)}>JSON</a>
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

      <section aria-labelledby="cite-h">
        <SectionHead id="cite-h" index="04" title={d.citeHeading} locale={locale} />
        <p className="cite">{d.cite(example ? nameOf(example, locale) : "", today)}</p>
        <p className="section-note">{d.rights}</p>
      </section>
    </main>
  );
}
