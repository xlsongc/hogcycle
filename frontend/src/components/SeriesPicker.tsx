"use client";

/**
 * Series selection for the overlay, grouped by tier.
 *
 * The colour swatch on a selected chip is the same hue the line carries, and
 * it is bound to the indicator rather than to its position in the selection —
 * removing one chip never repaints the rest. Anyone who learned "牧原 is the
 * violet line" keeps that.
 *
 * Selection is capped at the palette's eight validated slots. A ninth hue
 * would have to be generated, and a generated hue is indistinguishable from
 * an existing one under colour-vision deficiency.
 */

import type { Panel } from "@/types/generated/wall";
import { MAX_OVERLAY_SERIES, slotColor } from "@/charts/base/theme";
import { nameOf, unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

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

  return (
    <div className="picker">
      {TIER_ORDER.map((tier) => {
        const group = panels.filter((p) => p.tier === tier);
        if (!group.length) return null;
        return (
          <div className="picker-group" key={tier}>
            <span className="picker-tier">{t.tier[tier]}</span>
            {group.map((panel) => {
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
            })}
          </div>
        );
      })}
      <span className="hint">
        {t.picker.selected(selected.length, MAX_OVERLAY_SERIES)}
        {atCap ? t.picker.atCap : ""}
      </span>
    </div>
  );
}
