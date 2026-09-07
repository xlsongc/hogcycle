"use client";

/**
 * Holds the state both views share: the time window, the overlay selection,
 * and the lag shift.
 *
 * The window lives here rather than inside either chart because a filter is
 * supposed to scope everything below it — if the wall and the overlay could
 * disagree about the date range, two numbers on one screen would silently be
 * measuring different periods.
 */

import { useCallback, useMemo, useState } from "react";
import type { WallContract } from "@/types/generated/wall";
import { ChartWall } from "@/charts/ChartWall";
import { Overlay, type LagSpec } from "@/charts/Overlay";
import { SeriesPicker } from "./SeriesPicker";
import { TableView } from "./TableView";
import { ThemeToggle } from "./ThemeToggle";
import { MAX_OVERLAY_SERIES } from "@/charts/base/theme";
import { nameOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

/** Keys, not labels: the label is copy and lives in the dictionary. */
const RANGES = [
  { key: "all", years: null },
  { key: "8y", years: 8 },
  { key: "3y", years: 3 },
  { key: "1y", years: 1 },
] as const;

// Opens on the project's own thesis rather than an empty chart: capacity
// against the price it is supposed to lead.
const DEFAULT_SELECTION = ["sow_inventory", "hog_price_index", "eq_muyuan"];

export function Dashboard({ data, locale }: { data: WallContract; locale: Locale }) {
  const t = dict(locale).dashboard;
  const [rangeKey, setRangeKey] = useState<string>("all");
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTION);
  const [slots, setSlots] = useState<Map<string, number>>(
    () => new Map(DEFAULT_SELECTION.map((id, i) => [id, i]))
  );
  const [lagId, setLagId] = useState<string>("");
  const [lagMonths, setLagMonths] = useState<number>(0);

  const dataEnd = data.window.end ?? new Date().toISOString().slice(0, 10);
  const dataStart = data.window.start ?? "2015-01-01";

  const [min, max] = useMemo(() => {
    const years = RANGES.find((r) => r.key === rangeKey)?.years;
    if (!years) return [dataStart, dataEnd];
    const d = new Date(dataEnd);
    d.setUTCFullYear(d.getUTCFullYear() - years);
    return [d.toISOString().slice(0, 10), dataEnd];
  }, [rangeKey, dataStart, dataEnd]);

  /** Allocating the lowest free slot on add, and freeing it on remove, is what
   *  keeps a de-selection from repainting the survivors. */
  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const has = prev.includes(id);
      if (!has && prev.length >= MAX_OVERLAY_SERIES) return prev;
      const next = has ? prev.filter((x) => x !== id) : [...prev, id];
      setSlots((old) => {
        const m = new Map(old);
        if (has) {
          m.delete(id);
        } else {
          const taken = new Set(m.values());
          let free = 0;
          while (taken.has(free)) free += 1;
          m.set(id, free);
        }
        return m;
      });
      return next;
    });
  }, []);

  const wallPanels = data.panels.filter((p) => p.in_wall !== false);
  const lag: LagSpec | null =
    lagId && lagMonths ? { id: lagId, months: lagMonths } : null;
  const full = rangeKey === "all";

  return (
    <>
      <div className="bar filters">
        <span className="filter-label">{t.window}</span>
        {RANGES.map((r) => (
          <button
            key={r.key}
            aria-pressed={rangeKey === r.key}
            onClick={() => setRangeKey(r.key)}
          >
            {t.ranges[r.key]}
          </button>
        ))}
        <span className="hint">
          {min} → {max}
          {full ? "" : t.appliesBelow}
        </span>
      </div>

      <h2 className="section">{t.wallHeading}</h2>
      <p className="section-note">{t.wallNote}</p>
      <ChartWall panels={wallPanels} min={min} max={max} locale={locale} />

      <h2 className="section">{t.overlayHeading}</h2>
      <p className="section-note">{t.overlayNote}</p>

      <SeriesPicker
        panels={data.panels}
        selected={selected}
        slots={slots}
        onToggle={toggle}
        locale={locale}
      />

      <div className="bar">
        <span className="filter-label">{t.lag}</span>
        <button aria-pressed={!lagId} onClick={() => setLagId("")}>
          {t.noLag}
        </button>
        {selected.map((id) => (
          <button
            key={id}
            aria-pressed={lagId === id}
            onClick={() => {
              setLagId(id);
              if (!lagMonths) setLagMonths(12);
            }}
          >
            {(() => {
              const p = data.panels.find((x) => x.id === id);
              return p ? nameOf(p, locale) : id;
            })()}
          </button>
        ))}
        {lagId && (
          <>
            <span className="filter-label">{t.shiftForward}</span>
            {[6, 10, 12, 18].map((m) => (
              <button
                key={m}
                aria-pressed={lagMonths === m}
                onClick={() => setLagMonths(m)}
              >
                {t.months(m)}
              </button>
            ))}
          </>
        )}
      </div>
      <p className="section-note">{t.lagNote}</p>

      <Overlay
        panels={data.panels}
        selected={selected}
        slots={slots}
        min={min}
        max={max}
        lag={lag}
        locale={locale}
      />

      <TableView panels={wallPanels} locale={locale} />

      <div className="bar">
        <ThemeToggle locale={locale} />
        <span className="hint">
          {t.stamp(data.generated_at.slice(0, 10), dataStart, dataEnd)}
        </span>
      </div>
    </>
  );
}
