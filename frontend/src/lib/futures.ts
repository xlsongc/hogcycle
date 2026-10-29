/**
 * One futures contract's life, read off the weekly settles gold keeps
 * (gold/market.py, docs/adr/0041): where it stands, its week, and each
 * week's distance from where it listed or, once delivered, from where it
 * finished. Differences between settles the page already shows.
 */

export type Settle = { d: string; v: number };
export type Life = { delivery: string; delivered: boolean; settles: Settle[] };

/** Percent change from `base`, to one decimal. */
export const pct = (v: number, base: number) => Math.round(1000 * (v / base - 1)) / 10;

/** The settle in force on `day`: the last one on or before it. A settle is
 *  written only when it moves, so the one before a quiet stretch stands. */
export function settleAt(settles: Settle[], day: string): Settle | undefined {
  let held: Settle | undefined;
  for (const s of settles) {
    if (s.d > day) break;
    held = s;
  }
  return held;
}

/** The Sunday that ends the ISO week before the one `day` falls in. */
export function lastWeekEnd(day: string): string {
  const t = new Date(`${day}T00:00:00Z`);
  const fromMonday = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - fromMonday - 1);
  return t.toISOString().slice(0, 10);
}

export type Standing = {
  first: Settle;
  last: Settle;
  /** The settle that closed the week before the last one's. */
  week?: Settle;
  weekPct?: number;
  sinceFirst: number;
};

export function standing(life: Life): Standing | undefined {
  const s = life.settles;
  const first = s[0];
  const last = s[s.length - 1];
  if (!first || !last) return undefined;
  const week = settleAt(s, lastWeekEnd(last.d));
  return {
    first,
    last,
    week,
    weekPct: week ? pct(last.v, week.v) : undefined,
    sinceFirst: pct(last.v, first.v),
  };
}

export type WeekRow = { d: string; v: number; week: number | null; against: number };

/** Every week, newest first, with its change on the week before and its
 *  distance from `ref`. */
export function weeks(settles: Settle[], ref: number): WeekRow[] {
  return settles
    .map((s, i) => {
      const before = settles[i - 1];
      return { d: s.d, v: s.v, week: before ? pct(s.v, before.v) : null, against: pct(s.v, ref) };
    })
    .reverse();
}

/** The contract to open on: the live one whose latest settle is the main
 *  continuous price that day, which is the one most traded; else the
 *  nearest live one; else the last delivered. */
export function opening(lives: Life[], main?: Settle): string | undefined {
  const live = lives.filter((l) => !l.delivered && l.settles.length);
  const traded = main ? live.find((l) => settleAt(l.settles, main.d)?.v === main.v) : undefined;
  return (traded ?? live[0] ?? lives[lives.length - 1])?.delivery;
}
