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
  name: string;
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
  label: string;
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
  name: string;
  tier: "capacity" | "margin" | "price" | "noise" | "equity";
  unit: string;
  value: number | null;
  obs_date: string;
  granularity?: string;
  percentile?: number | null;
  n?: number;
}
