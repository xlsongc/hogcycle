import { test } from "node:test";
import assert from "node:assert/strict";
import { forwards, grid, LOT_KG, parsed, perHead, toBreakeven } from "../src/lib/margin.ts";

const x = { weight: 128, cost: 13.7, price: 10.89, basis: 0, heads: 100 };

test("a hog sold below cost loses weight × the gap", () => {
  assert.equal(Math.round(perHead(128, 10.89, 13.7) * 100) / 100, -359.68);
  assert.equal(perHead(120, 15, 14), 120);
});

test("breakeven is the gap to cost, as CNY per kg and a share of today's price", () => {
  const b = toBreakeven(10, 13);
  assert.equal(b.kg, 3);
  assert.equal(b.pct, 30);
  assert.equal(toBreakeven(0, 13).pct, null);
});

test("a futures settle per tonne becomes a local price per kg through the basis", () => {
  const curve = [
    { d: "2026-09-01", v: 15000 }, // delivered: history, not a price ahead
    { d: "2026-11-01", v: 9750 },
    { d: "2027-01-01", v: null },
    { d: "2027-09-01", v: 12965 },
  ];
  const rows = forwards(curve, "2026-10-21", { ...x, basis: 1 });
  assert.deepEqual(rows.map((r) => r.month), ["2026-11", "2027-09"]);
  assert.equal(rows[0]?.local, 10.75);
  assert.equal(Math.round(rows[1]?.perHead ?? 0), Math.round(128 * (13.965 - 13.7)));
  assert.equal(rows[0]?.batch, (rows[0]?.perHead ?? 0) * 100);
});

test("the contract for the current month still counts as ahead", () => {
  const rows = forwards([{ d: "2026-10-01", v: 10000 }], "2026-10-21", x);
  assert.equal(rows.length, 1);
});

test("lots cover the batch's live weight at 16 tonnes a lot", () => {
  const rows = forwards([{ d: "2026-11-01", v: 10000 }], "2026-10-21", { ...x, heads: 125 });
  assert.equal(rows[0]?.lots, (125 * 128) / LOT_KG);
  assert.equal(rows[0]?.lots, 1);
});

test("the grid steps price down the rows and cost across the columns", () => {
  const g = grid({ weight: 100, price: 10, cost: 12 }, [-1, 0, 1]);
  assert.deepEqual(g.map((r) => r.price), [9, 10, 11]);
  assert.deepEqual(g[1]?.cells.map((c) => c.cost), [11, 12, 13]);
  assert.equal(g[2]?.cells[0]?.perHead, 0);
  assert.equal(g[0]?.cells[2]?.perHead, -400);
});

test("an empty or unreadable field keeps the last good number, never zero", () => {
  assert.equal(parsed("", 128), 128);
  assert.equal(parsed("abc", 128), 128);
  assert.equal(parsed("1,200", 0), 1200);
  assert.equal(parsed(" 12.5 ", 0), 12.5);
  assert.equal(parsed("-0.8", 0), -0.8);
});
