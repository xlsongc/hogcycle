/**
 * A farm's margin per hog, from numbers the reader gives (docs/adr/0038).
 *
 * Arithmetic only: revenue is weight × price, cost is weight × the reader's
 * full cost per kg, and a futures settle in CNY per tonne of the delivery
 * grade becomes CNY per kg by dividing by 1,000 and adding the reader's own
 * basis — the gap between their local price and the exchange's. Nothing
 * here guesses a basis or a cost; the page offers the site's figures as
 * starting values and says which they are.
 */

/** 大商所 live hog: 16 tonnes a lot. */
export const LOT_KG = 16_000;

export type Inputs = {
  /** Live weight at sale, kg. */
  weight: number;
  /** Full cost per kg of live weight sold, CNY: feed, piglet, everything. */
  cost: number;
  /** The price the reader can sell at today, CNY per kg. */
  price: number;
  /** Local price minus the futures price, CNY per kg. */
  basis: number;
  /** Hogs in the batch. */
  heads: number;
};

export function perHead(weight: number, price: number, cost: number): number {
  return weight * (price - cost);
}

/** How far the price has to move to reach the reader's cost: in CNY per kg,
 *  and as a share of today's price. Null share when there is no price. */
export function toBreakeven(price: number, cost: number): { kg: number; pct: number | null } {
  return { kg: cost - price, pct: price > 0 ? (100 * (cost - price)) / price : null };
}

export type Forward = {
  /** The delivery month, YYYY-MM. */
  month: string;
  /** The contract's settle, CNY per tonne. */
  settle: number;
  /** The settle as CNY per kg with the reader's basis added. */
  local: number;
  perHead: number;
  batch: number;
  /** Lots that cover the batch's live weight, unrounded. */
  lots: number;
};

/** One row per contract not yet delivered: what a hog sold at that
 *  contract's price, moved by the basis, would earn. */
export function forwards(
  curve: { d: string; v: number | null }[],
  today: string,
  x: Inputs
): Forward[] {
  const first = `${today.slice(0, 7)}-01`;
  return curve
    .filter((p): p is { d: string; v: number } => p.v != null && p.d >= first)
    .map((p) => {
      const local = p.v / 1000 + x.basis;
      const head = perHead(x.weight, local, x.cost);
      return {
        month: p.d.slice(0, 7),
        settle: p.v,
        local,
        perHead: head,
        batch: head * x.heads,
        lots: (x.heads * x.weight) / LOT_KG,
      };
    });
}

/** Profit per head over a grid of prices (rows) and costs (columns), each
 *  stepped around the reader's own: what moves the answer, and how much. */
export function grid(
  x: Pick<Inputs, "weight" | "price" | "cost">,
  steps: number[]
): { price: number; cells: { cost: number; perHead: number }[] }[] {
  return steps.map((dp) => {
    const price = x.price + dp;
    return {
      price,
      cells: steps.map((dc) => {
        const cost = x.cost + dc;
        return { cost, perHead: perHead(x.weight, price, cost) };
      }),
    };
  });
}

/** A reader's number from a text field: a finite number, or the fallback.
 *  An empty field is not zero — zero weight would read as no loss at all. */
export function parsed(text: string, fallback: number): number {
  const v = Number(text.replace(/,/g, "").trim());
  return text.trim() !== "" && Number.isFinite(v) ? v : fallback;
}

/** How many contracts, at the reader's basis, sell at or above their cost,
 *  and the first of them by delivery: the line the curve has to clear. */
export function clearing(rows: Forward[], cost: number): { above: number; first: string | null } {
  const above = rows.filter((r) => r.local >= cost);
  return { above: above.length, first: above[0]?.month ?? null };
}
