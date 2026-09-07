// GENERATED — do not edit.
// Source: contracts/wall.schema.json
// Regenerate: npm run types

export interface WallContract {
  /** The knowledge moment this payload reconstructs. Not merely a build timestamp: the store is bitemporal, so a wall can be rebuilt as it stood on any past date. */
  generated_at: string;
  window: Window;
  /** Ordered by the causal chain: capacity leads price by 10-12 months, margin decides whether a capacity move persists. */
  panels: Panel[];
  /** Latest value per series with its position in its own history. Context for a human judgement, never a verdict. */
  readings: Reading[];
}

export interface Window {
  start: string | null;
  end: string | null;
}

export interface Panel {
  id: string;
  /** The indicator's name in Chinese, as the registry defines it. Both names are carried because the caliber lives in the name — 定点屠宰量（全口径） and 定点屠宰量（规模以上） are two different measurements, and a frontend-side lookup table would be free to drift from that distinction. */
  name_zh: string;
  name_en: string;
  tier: "capacity" | "margin" | "price" | "noise" | "equity";
  unit: string;
  freq?: string;
  /** Whether this series belongs in the causal-chain wall. False for equities: a share price is a claim on the cycle, not a link in it, so it lives in the overlay instead. */
  in_wall?: boolean;
  /** Whether upstream restates this series after the fact. True only for 能繁母猪存栏, which is also the only real leading indicator — the coincidence that justifies bitemporal storage. */
  revises?: boolean;
  /** A reference line that means something in the domain, not chart decoration. */
  threshold?: Threshold | null;
  /** Ascending by date. Each point keeps its own granularity: this series genuinely mixes annual, quarterly and monthly readings, and flattening them would claim they are equivalent measurements. */
  points: Point[];
}

export interface Threshold {
  value: number;
  label_zh: string;
  label_en: string;
}

export interface Point {
  /** Period END, ISO date. */
  d: string;
  v: number | null;
  /** daily / weekly / monthly / quarterly / annual */
  g: "D" | "W" | "M" | "Q" | "A";
}

export interface Reading {
  id: string;
  name_zh: string;
  name_en: string;
  tier: "capacity" | "margin" | "price" | "noise" | "equity";
  /** Whether this reading describes the current state of the physical cycle. False for equities (a claim on the cycle, not a measurement of it) and for retired calibers (history, whose last value is not a reading of today). */
  in_wall?: boolean;
  unit: string;
  value: number | null;
  obs_date: string;
  granularity?: string;
  percentile?: number | null;
  /** Percent change against the observation nearest one year earlier, or null when none sits near the anniversary. Null is a real answer: a series that began this year has no year-on-year. */
  yoy?: number | null;
  n?: number;
}
