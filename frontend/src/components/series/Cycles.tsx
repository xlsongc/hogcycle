"use client";

/**
 * Cycles side by side (A9): the reader names the month each cycle starts,
 * and the series is redrawn from each, by months since the start.
 *
 * The starts are the reader's, typed or picked as months, and kept in the
 * URL (`?cyc=2018-05,2022-04&ch=36`), so a comparison is a link. Nothing
 * proposes a start: the page computes, the reader reads (CLAUDE.md, "gold
 * computes, it does not judge").
 */

import { useEffect, useMemo, useState } from "react";
import type { Panel } from "@/types/generated/wall";
import { CycleChart } from "@/charts/CycleChart";
import { OVERLAY_SLOTS, fmt } from "@/charts/base/theme";
import {
  DEFAULT_HORIZON,
  HORIZONS,
  MAX_CYCLES,
  cycles as cyclesOf,
  indexable,
  parseAnchors,
  parseHorizon,
} from "@/lib/cycles";
import { readParams, writeParams } from "@/lib/urlState";
import { unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

type Props = { panel: Panel; locale: Locale };

export function Cycles({ panel, locale }: Props) {
  const t = dict(locale).cycles;
  const [anchors, setAnchors] = useState<string[]>([]);
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON);
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [table, setTable] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const q = readParams();
    setAnchors(parseAnchors(q.get("cyc")));
    setHorizon(parseHorizon(q.get("ch")));
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    writeParams({
      cyc: anchors.join(","),
      ch: horizon === DEFAULT_HORIZON ? null : String(horizon),
    });
  }, [anchors, horizon, ready]);

  const indexed = indexable(panel.points);
  const cycles = useMemo(
    () => cyclesOf(panel.points, anchors, horizon, indexed),
    [panel.points, anchors, horizon, indexed]
  );
  const missing = cycles.filter((c) => !c.base).map((c) => c.anchor);

  const add = () => {
    const [month] = parseAnchors(draft.trim());
    if (!month) return setProblem(t.bad);
    if (anchors.includes(month)) return setDraft("");
    if (anchors.length >= MAX_CYCLES) return setProblem(t.atCap(MAX_CYCLES));
    setAnchors(parseAnchors([...anchors, month].join(",")));
    setDraft("");
    setProblem(null);
  };

  const months = Array.from({ length: horizon + 1 }, (_, m) => m);
  // A table row per whole month: each cycle's reading nearest it, within
  // half a month, so a weekly series gives one row a month, not four.
  const nearest = (m: number, i: number) => {
    const pts = cycles[i]?.points ?? [];
    let best: (typeof pts)[number] | undefined;
    for (const p of pts) if (!best || Math.abs(p.x - m) < Math.abs(best.x - m)) best = p;
    return best && Math.abs(best.x - m) <= 0.5 ? best : null;
  };

  return (
    <section aria-labelledby="cycles-h">
      <h2 className="section" id="cycles-h">
        {t.heading}
      </h2>
      <p className="section-note">{t.intro}</p>
      {!indexed && <p className="hint">{t.signedNote}</p>}

      <form
        className="bar cycle-form"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label className="filter-label" htmlFor="cycle-start">
          {t.add}
        </label>
        <input
          id="cycle-start"
          type="month"
          placeholder="YYYY-MM"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit">{t.addButton}</button>
        <span className="filter-label bar-gap">{t.horizon}</span>
        {HORIZONS.map((h) => (
          <button
            type="button"
            key={h}
            aria-pressed={horizon === h}
            onClick={() => setHorizon(h)}
          >
            {t.tick(h)}
          </button>
        ))}
      </form>
      {problem && (
        <p className="hint" role="alert">
          {problem}
        </p>
      )}

      {anchors.length > 0 && (
        <ul className="cycle-chips">
          {anchors.map((a, i) => (
            <li key={a}>
              <span
                className="cycle-swatch"
                // The variable, not its resolved value, so a theme change
                // repaints the swatch as it does the line.
                style={{ background: `var(${OVERLAY_SLOTS[i] ?? "--slot-1"})` }}
                aria-hidden="true"
              />
              <span className="num">{a}</span>
              <button
                type="button"
                aria-label={t.remove(a)}
                onClick={() => setAnchors(anchors.filter((x) => x !== a))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {missing.length > 0 && <p className="hint">{t.none(missing)}</p>}

      {cycles.some((c) => c.points.length > 1) ? (
        <>
          <div className="overlay-card">
            <div className="overlay-head">
              <span className="panel-unit">
                {indexed ? t.indexAxis : unitOf(panel.unit, locale)}
              </span>
            </div>
            <CycleChart
              cycles={cycles}
              horizon={horizon}
              indexed={indexed}
              unit={panel.unit}
              locale={locale}
            />
          </div>
          <div className="bar">
            <button type="button" aria-pressed={table} onClick={() => setTable((v) => !v)}>
              {table ? t.hideTable : t.showTable}
            </button>
          </div>
          {table && (
            <div className="table-wrap">
              <table>
                <caption className="sr-only">{t.caption}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t.monthCol}</th>
                    {cycles.map((c) => (
                      <th key={c.anchor} scope="col">
                        {t.legend(c.anchor)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m}>
                      <th scope="row" className="num">
                        {t.tick(m)}
                      </th>
                      {cycles.map((c, i) => {
                        const p = nearest(m, i);
                        return (
                          <td key={c.anchor} className="num">
                            {p
                              ? indexed
                                ? `${fmt(p.y, "index", locale)} (${fmt(p.v, panel.unit, locale)})`
                                : fmt(p.v, panel.unit, locale)
                              : "—"}
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
      ) : (
        <p className="hint">{t.empty}</p>
      )}
    </section>
  );
}
