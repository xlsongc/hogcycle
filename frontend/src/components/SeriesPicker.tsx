"use client";

/**
 * Series selection for the overlay, grouped by tier.
 *
 * The colour swatch on a selected chip is the same hue the line carries, and
 * it is bound to the indicator rather than to its position in the selection —
 * removing one chip never repaints the rest. Anyone who learned "牧原 is the
 * violet line" keeps that.
 *
 * The chosen series come first and the chart right after; the full list of
 * forty is behind a filter and a toggle, because on a phone it pushed the
 * chart a thousand pixels down (phase-2 audit, B3).
 *
 * Selection is capped at the palette's eight validated slots. A ninth hue
 * would have to be generated, and a generated hue is indistinguishable from
 * an existing one under colour-vision deficiency.
 */

import { useId, useState } from "react";
import type { Panel } from "@/types/generated/wall";
import { MAX_OVERLAY_SERIES, slotColor } from "@/charts/base/theme";
import { nameOf, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { find } from "@/lib/search";

const TIER_ORDER: Panel["tier"][] = ["capacity", "margin", "price", "noise", "equity"];

type Props = {
  panels: Panel[];
  selected: string[];
  slots: Map<string, number>;
  onToggle: (id: string) => void;
  locale: Locale;
};

export function SeriesPicker({ panels, selected, slots, onToggle, locale }: Props) {
  const t = dict(locale);
  const atCap = selected.length >= MAX_OVERLAY_SERIES;
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const list = useId();
  const hits = query ? new Set(find(panels, query).map((p) => p.id)) : null;
  const open = all || hits != null;

  const chip = (panel: Panel) => {
    const on = selected.includes(panel.id);
    const slot = slots.get(panel.id);
    return (
      <button
        key={panel.id}
        className="pick"
        aria-pressed={on}
        disabled={!on && atCap}
        title={
          !on && atCap
            ? t.picker.atCapTitle(MAX_OVERLAY_SERIES)
            : unitOf(panel.unit, locale)
        }
        onClick={() => onToggle(panel.id)}
      >
        <i
          className="pick-dot"
          style={{
            background: on && slot != null ? slotColor(slot) : "transparent",
            borderColor: on && slot != null ? slotColor(slot) : "var(--axis)",
          }}
        />
        {nameOf(panel, locale)}
      </button>
    );
  };

  return (
    <div className="picker">
      <div className="picker-group">
        <span className="picker-tier">{t.picker.chosen}</span>
        {selected.flatMap((id) => {
          const panel = panels.find((p) => p.id === id);
          return panel ? [chip(panel)] : [];
        })}
        <span className="hint">
          {t.picker.selected(selected.length, MAX_OVERLAY_SERIES)}
          {atCap ? t.picker.atCap : ""}
        </span>
      </div>
      <div className="picker-find">
        <input
          type="search"
          value={query}
          placeholder={t.picker.find}
          aria-label={t.picker.find}
          aria-controls={list}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button aria-expanded={all} aria-controls={list} onClick={() => setAll(!all)}>
          {all ? t.picker.hideAll : t.picker.showAll(panels.length)}
        </button>
      </div>
      <div id={list} className="picker-list" hidden={!open}>
        {TIER_ORDER.map((tier) => {
          const group = panels.filter(
            (p) => p.tier === tier && (hits == null || hits.has(p.id))
          );
          if (!group.length) return null;
          return (
            <div className="picker-group" key={tier}>
              <span className="picker-tier">{t.tier[tier]}</span>
              {group.map(chip)}
            </div>
          );
        })}
        {hits != null && hits.size === 0 && <p className="hint">{t.picker.none}</p>}
      </div>
    </div>
  );
}
