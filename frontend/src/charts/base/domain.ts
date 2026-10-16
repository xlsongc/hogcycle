/**
 * A y-range snapped to round numbers around the data.
 *
 * ECharts' own `scale: true` still reaches for a tick interval that often
 * lands on zero, which on a 104px panel spends half the height on empty
 * space below the series. These panels compare a series against *its own*
 * history, not against zero, so the baseline carries no meaning worth that
 * much room. A threshold line is folded in so it can never fall outside.
 */

import type { Panel } from "@/types/generated/wall";

export function domain(
  panel: Panel,
  from: string,
  to: string
): { min: number; max: number } | { scale: true } {
  const all = panel.points.map((p) => p.v).filter((v): v is number => v != null);
  // Fitted to what the window shows. Scaled to the whole history, a five-year
  // view of 能繁母猪 drew 3,780-4,300 on a 2,900-4,800 axis and read as flat.
  // Segments that cross the window's edge are clipped by the chart.
  const shown = panel.points
    .filter((p) => p.d >= from && p.d <= to)
    .map((p) => p.v)
    .filter((v): v is number => v != null);
  const values = shown.length ? shown : all;
  if (!values.length) return { scale: true };

  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (panel.threshold) {
    lo = Math.min(lo, panel.threshold.value);
    hi = Math.max(hi, panel.threshold.value);
  }
  // Round to a unit scaled to the *padding*, not to the range. Sizing the
  // unit off the range makes it coarse enough that flooring drops a series
  // whose floor is well above zero — 仔猪价格 spans 20-110 and would snap to
  // 0-150, spending a fifth of a 104px panel on space the data never visits.
  const pad = (hi - lo) * 0.06 || Math.abs(hi) * 0.05 || 1;
  const unit = niceUnit(pad);
  return {
    min: Math.floor((lo - pad) / unit) * unit,
    max: Math.ceil((hi + pad) / unit) * unit,
  };
}

/** Smallest of 1/2/5/10 × 10^n that is at least `x`. 2.5 is excluded: it
 *  produces axis labels like 22.50 that read as data rather than as ticks. */
function niceUnit(x: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(x)));
  return (
    [1, 2, 5, 10].map((m) => m * magnitude).find((u) => u >= x) ?? magnitude * 10
  );
}
