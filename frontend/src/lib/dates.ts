/**
 * Date arithmetic on ISO date strings, shared by the charts that shift or
 * window a series. Plain functions in a module with no "use client", so a
 * server component can call them while prerendering.
 */

/** Shifts a date forward by whole months, clamping to the month's length:
 *  2026-01-31 plus one month is 2026-02-28, not 2026-03-03. */
export function shiftMonths(iso: string, months: number): string {
  if (!months) return iso;
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/** Midnight UTC of a date, as a timestamp. ECharts reports pointer positions
 *  as timestamps, and the contract's dates are calendar days. */
export function toTime(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export function toIso(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** 2026-08-31 → 2026-08, for prose where the day carries nothing. */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}
