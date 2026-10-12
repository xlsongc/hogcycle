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
  /** Whether this series is watched for restatement after the fact. Set for 能繁母猪存栏, the only real leading indicator. No period has been restated in the 55 primary-source editions held (2021-12 to 2026-07); its release lag is what a backtest has to respect today. */
  revises?: boolean;
  /** A reference line that means something in the domain, not chart decoration. */
  threshold?: Threshold | null;
  /** What the series is, for a reader, in both languages (config/about.yaml). Like the names, it travels in the contract because the caliber lives in it. The export fails if any series lacks one; null only in payloads built without config, such as tests. */
  about: About | null;
  /** Every period whose value changed, with each value in the order it was learned. Empty for most series: a restatement is rare, and this lists only real ones. */
  revisions: Revision[];
  /** Days from a period's end to its release, over the points that carry p. Null when the source does not date releases. The median is what to subtract from a lead read off the chart; the max is the oldest a reader acting on the latest release has had to work with. */
  release_lag?: ReleaseLag | null;
  /** Ascending by date. Each point keeps its own granularity: this series genuinely mixes annual, quarterly and monthly readings, and flattening them would claim they are equivalent measurements. */
  points: Point[];
}

export interface Threshold {
  value: number;
  label_zh: string;
  label_en: string;
}

export interface About {
  publisher_zh: string;
  publisher_en: string;
  /** A page a reader can check, or null when the only address is an API. Never a guessed page. */
  url: string | null;
  about_zh: string;
  about_en: string;
}

export interface Revision {
  d: string;
  prints: Print[];
}

export interface Print {
  v: number | null;
  /** Release date of this value, or null when the source did not say. */
  p: string | null;
  /** UTC date this warehouse learned the value (transaction time). */
  learned: string;
}

export interface ReleaseLag {
  median_days: number;
  max_days: number;
  n: number;
}

export interface Point {
  /** Period END, ISO date. */
  d: string;
  v: number | null;
  /** daily / weekly / monthly / quarterly / annual */
  g: "D" | "W" | "M" | "Q" | "A";
  /** The day the publisher released this value, ISO date. Absent when the source does not date its releases: unknown, never assumed to equal d. Present, it is when the value became usable, which for a monthly print is three to nine weeks after d. */
  p?: string;
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
  /** The day the publisher released the latest value, or null when the source does not say. */
  published_on: string | null;
  granularity?: string;
  percentile?: number | null;
  /** Percent change against the observation nearest one year earlier, or null when none sits near the anniversary. Null is a real answer: a series that began this year has no year-on-year. */
  yoy?: number | null;
  n?: number;
  /** The series has not advanced within its own cadence as of generated_at. A stale reading is still shown, because hiding it is the silent failure this project exists to avoid, but it must not read as a current level. An upstream_dark acknowledgement in config does not soften this: it quiets the collector's alarm, not the page. */
  stale: boolean;
  /** Days from obs_date to generated_at: how far the reader should discount a stale reading. */
  age_days?: number | null;
  /** UTC date this warehouse first learned the latest observation (transaction time). For a backfilled series it is the backfill date, not the publisher's release date. */
  first_seen: string | null;
  /** Set when the latest value is the lowest or highest the series has been for at least a year. since is the most recent earlier observation at least as extreme, or the window's first observation when all is true. A fact with a fixed definition, never a phase call. */
  extreme: Extreme | null;
  /** Percent change from the previous reading of the same granularity, and that reading's date. Null when there is no previous one. */
  change: Change | null;
  /** Consecutive moves in one direction ending at the latest reading, among readings of its granularity: n moves (at least 2) since the reading where the run began. Null when the latest move is flat or the run is shorter. A count of moves, not a trend call. */
  streak: Streak | null;
  /** For a series with a domain threshold: how many consecutive observations sit on the latest value's side of it, and since when. A value on the line counts as above. */
  threshold_run: ThresholdRun | null;
}

export interface Extreme {
  kind: "low" | "high";
  since: string;
  all: boolean;
}

export interface Change {
  pct: number;
  since: string;
}

export interface Streak {
  dir: "up" | "down";
  n: number;
  since: string;
}

export interface ThresholdRun {
  side: "below" | "above";
  since: string;
  n: number;
}
