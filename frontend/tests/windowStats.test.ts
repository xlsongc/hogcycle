import { test } from "node:test";
import assert from "node:assert/strict";
import { windowStats } from "../src/lib/windowStats.ts";
import type { Point } from "../src/types/generated/wall.ts";

const at = (d: string, v: number | null, p?: string): Point => ({ d, v, g: "M", ...(p ? { p } : {}) });

const SERIES = [
  at("2026-01-31", 10, "2026-02-20"),
  at("2026-02-28", 14, "2026-03-20"),
  at("2026-03-31", null),
  at("2026-04-30", 8, "2026-05-20"),
  at("2026-05-31", 12, "2026-06-20"),
  at("2026-06-30", 14),
];

test("first, last, change, high and low over the readings inside the window", () => {
  const s = windowStats(SERIES, "2026-01-01", "2026-05-31");
  assert.ok(s);
  assert.equal(s.n, 4);
  assert.deepEqual(s.first, { d: "2026-01-31", v: 10, g: "M" });
  assert.deepEqual(s.last, { d: "2026-05-31", v: 12, g: "M" });
  assert.equal(s.change, 2);
  assert.equal(s.pct, 20);
  assert.deepEqual(s.high, { d: "2026-02-28", v: 14, g: "M" });
  assert.deepEqual(s.low, { d: "2026-04-30", v: 8, g: "M" });
  assert.equal(s.below, 2);
});

test("a tie for the high names its earliest date", () => {
  const s = windowStats(SERIES, "2026-01-01", "2026-12-31");
  assert.deepEqual(s?.high, { d: "2026-02-28", v: 14, g: "M" });
  assert.equal(s?.below, 3);
});

test("no percentage across zero: a loss has no base to be a share of", () => {
  const profit = [at("2026-01-31", 120), at("2026-02-28", -40), at("2026-03-31", 60)];
  const s = windowStats(profit, "2026-01-01", "2026-12-31");
  assert.equal(s?.change, -60);
  assert.equal(s?.pct, null);
});

test("placed by release, an undated reading is not in the window", () => {
  const s = windowStats(SERIES, "2026-03-01", "2026-06-10", "release");
  assert.equal(s?.n, 2);
  assert.deepEqual(s?.first, { d: "2026-02-28", v: 14, g: "M" });
  assert.deepEqual(s?.last, { d: "2026-04-30", v: 8, g: "M" });
});

test("one reading is not a window", () => {
  assert.equal(windowStats(SERIES, "2026-06-01", "2026-06-30"), null);
});
