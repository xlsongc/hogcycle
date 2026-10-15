"use client";

/**
 * Choose the day a page stands on. Empty is today.
 *
 * A native date input: it is keyboard-operable and localised by the browser,
 * and a pixel-styled calendar would be more code than the choice is worth.
 * Only a complete date is taken, so typing a year does not reflow the page
 * on every keystroke.
 */

import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { isDay } from "@/lib/asOf";

type Props = {
  day: string | null;
  onDay: (day: string | null) => void;
  /** The earliest day worth asking about, and today. */
  min: string;
  max: string;
  locale: Locale;
};

export function AsOfControl({ day, onDay, min, max, locale }: Props) {
  const a = dict(locale).asOf;
  return (
    <div className="bar as-of">
      <label className="filter-label" htmlFor="asof">
        {a.label}
      </label>
      <input
        id="asof"
        type="date"
        min={min}
        max={max}
        value={day ?? ""}
        aria-describedby="asof-hint"
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") onDay(null);
          else if (isDay(v) && v >= min && v <= max) onDay(v);
        }}
      />
      {day && <button onClick={() => onDay(null)}>{a.clear}</button>}
      <span className="hint" id="asof-hint">
        {day ? a.banner(day) : a.hint}
      </span>
    </div>
  );
}
