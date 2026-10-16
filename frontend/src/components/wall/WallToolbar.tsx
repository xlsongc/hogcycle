"use client";

/**
 * The strip that stays pinned above the wall while it scrolls: the time
 * window, and a time axis that carries the hovered date.
 */

import { PRESETS, type Range } from "@/lib/range";
import type { Align } from "@/lib/useAlign";
import { TimeRuler } from "@/charts/TimeRuler";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

type Props = {
  range: Range;
  min: string;
  max: string;
  group: string;
  onRange: (r: Range) => void;
  onReset: () => void;
  align: Align;
  onAlign: (a: Align) => void;
  locale: Locale;
};

export function WallToolbar({
  range,
  min,
  max,
  group,
  onRange,
  onReset,
  align,
  onAlign,
  locale,
}: Props) {
  const t = dict(locale);
  const custom = range.kind === "custom";

  return (
    <div className="wall-toolbar">
      <div className="bar">
        <span className="filter-label">{t.window.label}</span>
        {PRESETS.map((p) => (
          <button
            key={p}
            aria-pressed={range.kind === "preset" && range.preset === p}
            onClick={() => onRange({ kind: "preset", preset: p })}
          >
            {t.window.ranges[p]}
          </button>
        ))}
        {custom && (
          <button onClick={onReset}>
            {t.wall.reset}
          </button>
        )}
        <span className="hint num">
          {min} → {max}
          {custom ? ` · ${t.wall.zoomed}` : ""}
        </span>
      </div>
      <div className="bar">
        <span className="filter-label">{t.overview.align}</span>
        <button aria-pressed={align === "period"} onClick={() => onAlign("period")}>
          {t.overview.alignPeriod}
        </button>
        <button aria-pressed={align === "release"} onClick={() => onAlign("release")}>
          {t.overview.alignRelease}
        </button>
      </div>
      <TimeRuler group={group} min={min} max={max} />
    </div>
  );
}
