import { test } from "node:test";
import assert from "node:assert/strict";
import { dayOfYear, seasonal, seasons } from "../src/lib/seasons.ts";
import type { Point } from "../src/types/generated/wall.ts";

const at = (d: string, v: number | null, g: Point["g"] = "W"): Point => ({ d, v, g });

test("1 March is the same day in a leap year and in another", () => {
  assert.equal(dayOfYear("2024-03-01"), dayOfYear("2025-03-01"));
  assert.equal(dayOfYear("2024-02-29"), 60);
  assert.equal(dayOfYear("2025-01-01"), 1);
  assert.equal(dayOfYear("2025-12-31"), 366);
});

test("each year with two readings or more, oldest first, the last six", () => {
  const pts: Point[] = [];
  for (let y = 2015; y <= 2026; y++) pts.push(at(`${y}-01-07`, y), at(`${y}-06-30`, y + 0.5));
  pts.push(at("2027-01-06", 1));
  const s = seasons(pts);
  assert.deepEqual(s.map((x) => x.year), [2021, 2022, 2023, 2024, 2025, 2026]);
  assert.deepEqual(s[5]?.points.map((p) => p.v), [2026, 2026.5]);
});

test("a quarterly or annual series has no season to show", () => {
  const q = [at("2024-03-31", 1, "Q"), at("2024-06-30", 2, "Q"), at("2025-03-31", 1, "Q"), at("2025-06-30", 2, "Q")];
  assert.equal(seasonal(q), false);
  const w = [at("2024-01-07", 1), at("2024-06-30", 2), at("2025-01-07", 1), at("2025-06-30", 2)];
  assert.equal(seasonal(w), true);
});
