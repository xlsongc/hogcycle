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

export function TableView({ panels }: { panels: Panel[] }) {
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
          {open ? "隐藏表格" : "表格视图"}
        </button>
        <span className="hint">按月重采样 · 每月取最后一个观测值 · 共 {rows.length} 行</span>
      </div>
      {open && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">月份</th>
                {panels.map((p) => (
                  <th key={p.id} scope="col">
                    {p.name}
                    <br />
                    <span style={{ color: "var(--muted)" }}>{p.unit}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([month, values]) => (
                <tr key={month}>
                  <td>{month}</td>
                  {panels.map((p) => (
                    <td key={p.id}>{fmt(values[p.id] ?? null, p.unit)}</td>
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
