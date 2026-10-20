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

import { useMemo, useState, type ReactNode } from "react";
import type { Panel } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { shiftMonths } from "@/lib/dates";
import { nameOf, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

type Props = {
  panels: Panel[];
  locale: Locale;
  /** Rows inside the chart's window only, so the table is the view's twin. */
  min?: string;
  max?: string;
  /** A series the chart draws later than it happened: its values move down
   *  the rows by as many months, and its header says so. */
  shift?: { id: string; months: number } | null;
  caption?: string;
  note?: (rows: number) => ReactNode;
};

export function TableView({ panels, locale, min, max, shift = null, caption, note }: Props) {
  const t = dict(locale);
  const [open, setOpen] = useState(false);
  const monthsFor = (id: string) => (shift?.id === id ? shift.months : 0);

  const rows = useMemo(() => {
    const byMonth = new Map<string, Record<string, number | null>>();
    const from = min?.slice(0, 7);
    const to = max?.slice(0, 7);
    for (const panel of panels) {
      const months = shift?.id === panel.id ? shift.months : 0;
      for (const p of panel.points) {
        const month = shiftMonths(p.d, months).slice(0, 7);
        if ((from && month < from) || (to && month > to)) continue;
        const row = byMonth.get(month) ?? {};
        row[panel.id] = p.v; // last observation in the month wins
        byMonth.set(month, row);
      }
    }
    return [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [panels, min, max, shift]);

  return (
    <>
      <div className="bar">
        <button aria-pressed={open} onClick={() => setOpen((v) => !v)}>
          {open ? t.table.hide : t.table.show}
        </button>
        <span className="hint">{(note ?? t.table.note)(rows.length)}</span>
      </div>
      {open && (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">{caption ?? t.table.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{t.table.month}</th>
                {panels.map((p) => (
                  <th key={p.id} scope="col">
                    {nameOf(p, locale)}
                    {monthsFor(p.id) ? t.overlay.shifted(monthsFor(p.id)) : ""}
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
                  <th scope="row" className="num">
                    {month}
                  </th>
                  {panels.map((p) => (
                    <td key={p.id} className="num">
                      {fmt(values[p.id] ?? null, p.unit, locale)}
                    </td>
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
