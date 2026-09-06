/**
 * How many blocks of a segmented bar to light for a percentile.
 *
 * Lives here, in a module with no "use client", because both a client
 * component (the header's gauges) and a server component (the reading tiles)
 * need it. A function exported from a client module becomes a client
 * reference, and calling one while prerendering fails.
 *
 * A known reading always lights at least one segment. Several of these series
 * sit in their 1st-5th percentile right now, which rounds to zero — and a
 * wholly dark gauge reads as "no data" rather than "at the bottom of its
 * range", which is the opposite of what it means and the more alarming of the
 * two to get wrong. The exact figure is written out on the tile either way.
 */
export function litSegments(
  pct: number | null | undefined,
  of: number
): number {
  if (pct == null) return 0;
  return Math.max(1, Math.round((pct / 100) * of));
}
