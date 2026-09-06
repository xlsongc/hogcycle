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
import { MAX_OVERLAY_SERIES, TIER_LABEL, slotColor } from "@/charts/base/theme";

const TIER_ORDER: Panel["tier"][] = ["capacity", "margin", "price", "noise", "equity"];

type Props = {
  panels: Panel[];
  selected: string[];
  slots: Map<string, number>;
  onToggle: (id: string) => void;
};

export function SeriesPicker({ panels, selected, slots, onToggle }: Props) {
  const atCap = selected.length >= MAX_OVERLAY_SERIES;

  return (
    <div className="picker">
      {TIER_ORDER.map((tier) => {
        const group = panels.filter((p) => p.tier === tier);
        if (!group.length) return null;
        return (
          <div className="picker-group" key={tier}>
            <span className="picker-tier">{TIER_LABEL[tier]}</span>
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
                      ? `最多同时叠放 ${MAX_OVERLAY_SERIES} 条 —— 再多就得生成新色相，而生成的色相在色觉缺陷下与已有色无法区分`
                      : panel.unit
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
                  {panel.name}
                </button>
              );
            })}
          </div>
        );
      })}
      <span className="hint">
        已选 {selected.length}/{MAX_OVERLAY_SERIES}
        {atCap ? " · 已达上限" : ""}
      </span>
    </div>
  );
}
