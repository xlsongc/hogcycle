"use client";

/**
 * The chart's WCAG-clean twin. Every value the wall draws is reachable here
 * without hovering, which is also the relief the palette validator requires
 * for the hues that sit below 3:1 against the light surface.
 *
 * Resampled to month end — the panels run at four different frequencies, and
 * a row per raw observation would be a union of misaligned dates rather than
 * a table anyone can read across.
 */

import { useMemo, useState } from "react";
import type { Panel } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { nameOf, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

export function TableView({ panels, locale }: { panels: Panel[]; locale: Locale }) {
  const t = dict(locale);
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    const byMonth = new Map<string, Record<string, number | null>>();
    for (const panel of panels) {
      for (const p of panel.points) {
        const month = p.d.slice(0, 7);
        const row = byMonth.get(month) ?? {};
        row[panel.id] = p.v; // last observation in the month wins
        byMonth.set(month, row);
      }
    }
    return [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [panels]);

  return (
    <>
      <div className="bar">
        <button aria-pressed={open} onClick={() => setOpen((v) => !v)}>
          {open ? t.table.hide : t.table.show}
        </button>
        <span className="hint">{t.table.note(rows.length)}</span>
      </div>
      {open && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{t.table.month}</th>
                {panels.map((p) => (
                  <th key={p.id} scope="col">
                    {nameOf(p, locale)}
                    <br />
                    <span style={{ color: "var(--muted)" }}>
                      {unitOf(p.unit, locale)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([month, values]) => (
                <tr key={month}>
                  <td>{month}</td>
                  {panels.map((p) => (
                    <td key={p.id}>{fmt(values[p.id] ?? null, p.unit, locale)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
