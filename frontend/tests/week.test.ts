import { test } from "node:test";
import assert from "node:assert/strict";
import { dayLabel, quiet, revised, signedPct, spot, weekNumber, weekRange } from "../src/lib/week.ts";
import type { Move, Week } from "../src/types/generated/wall.ts";

const move = (id: string, d: string, prev_d: string | null, delta: number | null, pct: number | null): Move => ({
  id, d, v: 1, prev_d, prev_v: prev_d ? 1 : null, delta, pct, hi: null, lo: null,
});

const week = (moves: Move[]): Week => ({
  id: "2026-W43", start: "2026-10-19", end: "2026-10-25", cut: "2026-10-24", complete: false,
  moves, released: [], curve: [], upcoming: [],
});

test("a week is named by its ISO year and number", () => {
  assert.deepEqual(weekNumber("2026-W43"), { year: 2026, n: 43 });
  assert.equal(dayLabel("2026-10-04", "zh"), "10月4日");
  assert.equal(dayLabel("2026-10-04", "en"), "Oct 4");
});

test("a range names the month once, and both years when it crosses one", () => {
  assert.equal(weekRange("2026-10-19", "2026-10-25", "en"), "Oct 19 – 25, 2026");
  assert.equal(weekRange("2026-10-19", "2026-10-25", "zh"), "2026年10月19日至25日");
  assert.equal(weekRange("2026-09-28", "2026-10-04", "zh", true), "9月28日至10月4日");
  assert.equal(weekRange("2026-12-28", "2027-01-03", "en"), "Dec 28, 2026 – Jan 3, 2027");
});

test("a percentage carries a true minus and one decimal", () => {
  assert.equal(signedPct(-6), "−6.0%");
  assert.equal(signedPct(1.1), "+1.1%");
  assert.equal(signedPct(0), "0.0%");
});

test("the same reading on both sides is quiet; another value for it is a revision", () => {
  assert.ok(quiet(move("a", "2026-08-19", "2026-08-19", 0, 0)));
  assert.ok(revised(move("a", "2026-10-14", "2026-10-14", -0.5, -2.6)));
  assert.ok(!quiet(move("a", "2026-10-21", "2026-10-14", 0, 0)));
});

test("the spot move falls back to the next price when the first has nothing new", () => {
  const w = week([
    move("hog_price_wai3", "2026-10-16", "2026-10-16", 0, 0),
    move("hog_price_county", "2026-10-15", "2026-10-08", -0.18, -1.6),
  ]);
  assert.equal(spot(w)?.id, "hog_price_county");
});
