"use client";

/**
 * The compare page: any series on one time axis, with one of them shiftable
 * to test a lead.
 *
 * Everything that defines the view — selection, shift, window — is in the
 * URL, so "sow inventory shifted 11 months against the hog price since 2018"
 * is a link rather than a description of clicks.
 */

import { useCallback, useEffect, useState } from "react";
import type { Panel } from "@/types/generated/wall";
import { Overlay, type LagSpec } from "@/charts/Overlay";
import { MAX_OVERLAY_SERIES } from "@/charts/base/theme";
import { SeriesPicker } from "@/components/SeriesPicker";
import { PRESETS, DEFAULT_RANGE, bounds, parseRange, rangeParams, type Range } from "@/lib/range";
import { readParams, writeParams } from "@/lib/urlState";
import { useAlign } from "@/lib/useAlign";
import { nameOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { Term } from "@/components/Term";
import { TableView } from "@/components/TableView";
import { LagScan } from "./LagScan";

// Opens on the project's own thesis: capacity, shifted by the biological lag,
// against the price it is supposed to lead.
const DEFAULT_SELECTION = ["sow_inventory", "hog_price_index"];
const DEFAULT_LAG: LagSpec = { id: "sow_inventory", months: 10 };
const MAX_LAG = 24;

type Props = { panels: Panel[]; start: string; end: string; locale: Locale };

function slotsFor(ids: string[]): Map<string, number> {
  return new Map(ids.map((id, i) => [id, i]));
}

export function CompareView({ panels, start, end, locale }: Props) {
  const t = dict(locale);
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTION);
  const [slots, setSlots] = useState(() => slotsFor(DEFAULT_SELECTION));
  const [lag, setLag] = useState<LagSpec | null>(DEFAULT_LAG);
  const [range, setRange] = useState<Range>(DEFAULT_RANGE);
  const [align, setAlign] = useAlign();
  const [ready, setReady] = useState(false);

  // Read the view from the URL once mounted. Unknown ids are dropped rather
  // than failing: a link made before a series was renamed should still open.
  useEffect(() => {
    const q = readParams();
    const known = new Set(panels.map((p) => p.id));
    const s = (q.get("s") ?? "").split(",").filter((id) => known.has(id));
    const ids = s.length ? s.slice(0, MAX_OVERLAY_SERIES) : DEFAULT_SELECTION;
    setSelected(ids);
    setSlots(slotsFor(ids));
    const [lagId, lagMonths] = (q.get("lag") ?? "").split(":");
    const months = Number(lagMonths);
    if (q.has("lag")) {
      setLag(
        lagId && ids.includes(lagId) && Number.isInteger(months) && months > 0 && months <= MAX_LAG
          ? { id: lagId, months }
          : null
      );
    } else if (s.length) {
      setLag(null);
    }
    setRange(parseRange(q));
    setReady(true);
  }, [panels]);

  useEffect(() => {
    if (!ready) return;
    writeParams({
      s: selected.join(","),
      lag: lag ? `${lag.id}:${lag.months}` : "",
      ...rangeParams(range),
    });
  }, [selected, lag, range, ready]);

  /** Allocating the lowest free slot on add, and freeing it on remove, is what
   *  keeps a de-selection from repainting the survivors. Both updaters are
   *  idempotent, because React may run an updater twice. */
  const toggle = useCallback(
    (id: string) => {
      const has = selected.includes(id);
      if (!has && selected.length >= MAX_OVERLAY_SERIES) return;
      setSelected(has ? selected.filter((x) => x !== id) : [...selected, id]);
      setSlots((old) => {
        if (has ? !old.has(id) : old.has(id)) return old;
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
      if (has) setLag((l) => (l?.id === id ? null : l));
    },
    [selected]
  );

  const [min, max] = bounds(range, start, end);
  const nameFor = (id: string) => {
    const p = panels.find((x) => x.id === id);
    return p ? nameOf(p, locale) : id;
  };

  return (
    <>
      <SeriesPicker
        panels={panels}
        selected={selected}
        slots={slots}
        onToggle={toggle}
        locale={locale}
      />

      <div className="bar">
        <span className="filter-label">{t.compare.lag}</span>
        <button aria-pressed={!lag} onClick={() => setLag(null)}>
          {t.compare.noLag}
        </button>
        {selected.map((id) => (
          <button
            key={id}
            aria-pressed={lag?.id === id}
            onClick={() => setLag({ id, months: lag?.months || DEFAULT_LAG.months })}
          >
            {nameFor(id)}
          </button>
        ))}
      </div>
      {lag && (
        <div className="bar lag-slider">
          <label className="filter-label" htmlFor="lag-months">
            {t.compare.forward}
          </label>
          <input
            id="lag-months"
            type="range"
            min={1}
            max={MAX_LAG}
            step={1}
            value={lag.months}
            onChange={(e) => setLag({ id: lag.id, months: Number(e.target.value) })}
          />
          <output htmlFor="lag-months">
            {t.compare.months(lag.months)}
          </output>
        </div>
      )}
      <p className="section-note">{t.compare.lagNote}</p>

      <div className="bar">
        <span className="filter-label">{t.window.label}</span>
        {PRESETS.map((p) => (
          <button
            key={p}
            aria-pressed={range.kind === "preset" && range.preset === p}
            onClick={() => setRange({ kind: "preset", preset: p })}
          >
            {t.window.ranges[p]}
          </button>
        ))}
        <span className="hint num">
          {min} → {max}
        </span>
      </div>
      <div className="bar">
        <span className="filter-label">
          <Term id="releaseVsPeriod" locale={locale}>
            {t.overview.align}
          </Term>
        </span>
        <button aria-pressed={align === "period"} onClick={() => setAlign("period")}>
          {t.overview.alignPeriod}
        </button>
        <button aria-pressed={align === "release"} onClick={() => setAlign("release")}>
          {t.overview.alignRelease}
        </button>
      </div>

      <Overlay
        panels={panels}
        selected={selected}
        slots={slots}
        min={min}
        max={max}
        lag={lag && selected.includes(lag.id) ? lag : null}
        align={align}
        locale={locale}
      />
      {lag && selected.includes(lag.id) && selected.length > 1 && (
        <LagScan
          lead={panels.find((p) => p.id === lag.id) as Panel}
          targets={selected
            .filter((id) => id !== lag.id)
            .map((id) => panels.find((p) => p.id === id))
            .filter((p): p is Panel => !!p)}
          months={lag.months}
          locale={locale}
        />
      )}
      <p className="hint">{t.compare.share}</p>
      <TableView
        panels={selected
          .map((id) => panels.find((p) => p.id === id))
          .filter((p): p is Panel => !!p)}
        min={min}
        max={max}
        shift={lag && selected.includes(lag.id) ? lag : null}
        caption={t.compare.tableCaption}
        note={t.compare.tableNote}
        locale={locale}
      />
    </>
  );
}
