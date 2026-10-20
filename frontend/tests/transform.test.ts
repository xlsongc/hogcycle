import { test } from "node:test";
import assert from "node:assert/strict";
import { parseUnits, transform, unitAfter } from "../src/lib/transform.ts";
import type { Point } from "../src/types/generated/wall.ts";

const at = (d: string, v: number | null, g: Point["g"] = "M"): Point => ({ d, v, g });

test("change and percentage from a year ago, against the reading nearest it", () => {
  const s = [at("2025-06-30", 4043), at("2025-09-30", 4035), at("2026-06-30", 3780)];
  const yoy = transform(s, "yoy");
  assert.deepEqual(yoy.map((p) => p.v), [null, null, -263]);
  // 统计局 printed -6.5% for 2026Q2; gold's year_on_year agrees.
  assert.equal(transform(s, "yoypct")[2]?.v, -6.51);
});

test("nothing near the anniversary is a gap, not the oldest reading", () => {
  const s = [at("2025-01-31", 100), at("2026-06-30", 120)];
  assert.deepEqual(transform(s, "yoy").map((p) => p.v), [null, null]);
});

test("no percentage where the base is at or below zero", () => {
  const s = [at("2026-08-31", 120), at("2026-09-30", -40), at("2026-10-31", -60)];
  assert.deepEqual(transform(s, "pct").map((p) => p.v), [null, null, null]);
  const w = [at("2026-01-07", 10, "W"), at("2026-01-14", 11, "W")];
  assert.deepEqual(transform(w, "pct").map((p) => p.v), [null, 10]);
});

test("levels pass through, and the unit follows the transform", () => {
  const s = [at("2026-01-31", 1), at("2026-02-28", null)];
  assert.equal(transform(s, "level"), s);
  assert.equal(unitAfter("yoypct", "万头"), "%");
  assert.equal(unitAfter("yoy", "万头"), "万头");
  assert.equal(parseUnits("bogus"), "level");
  assert.equal(parseUnits("yoy"), "yoy");
});
