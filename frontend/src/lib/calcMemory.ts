/**
 * The calculator's numbers a reader keeps between visits, in their own
 * browser (docs/adr/0038). Nothing leaves the device.
 *
 * Only the farm's own numbers are kept: weight, cost, basis and batch size
 * hold from one week to the next. Today's price does not, so it starts from
 * the latest figure every time, as a stale price kept for a reader would
 * quietly answer last month's question.
 */

export const KEPT = ["weight", "cost", "basis", "heads"] as const;
export type Kept = (typeof KEPT)[number];
export type KeptValues = Partial<Record<Kept, string>>;

const KEY = "hogcycle.calc.v1";

/** What a stored value holds, keeping only numbers under the kept names: a
 *  value written by another version, or by hand, is ignored, not trusted. */
export function fromStore(raw: string | null): KeptValues {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null) return {};
  const out: KeptValues = {};
  for (const k of KEPT) {
    const v = (parsed as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v.replace(/,/g, "")))) {
      out[k] = v;
    }
  }
  return out;
}

// Storage can be missing or refuse (a private window, blocked site data);
// the calculator then simply starts from the site's figures each time.
export function load(): KeptValues {
  try {
    return fromStore(window.localStorage.getItem(KEY));
  } catch {
    return {};
  }
}

export function save(values: KeptValues): void {
  try {
    if (Object.keys(values).length) window.localStorage.setItem(KEY, JSON.stringify(values));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Not kept; nothing else changes.
  }
}
