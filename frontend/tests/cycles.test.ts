import { test } from "node:test";
import assert from "node:assert/strict";
import { cycles, indexable, parseAnchors, parseHorizon } from "../src/lib/cycles.ts";
import type { Point } from "../src/types/generated/wall.ts";

const at = (d: string, v: number | null): Point => ({ d, v, g: "M" });
const SERIES = [
  at("2018-04-30", 12),
  at("2018-05-31", 10),
  at("2018-06-30", 11),
  at("2018-08-31", 15),
  at("2019-05-31", 30),
  at("2019-06-30", 32),
];

test("a cycle starts at the first reading in the chosen month, indexed to 100", () => {
  const [c] = cycles(SERIES, ["2018-05"], 12, true);
  assert.deepEqual(c?.base, { d: "2018-05-31", v: 10, g: "M" });
  assert.deepEqual(
    c?.points.map((p) => [Math.round(p.x), p.y]),
    [[0, 100], [1, 110], [3, 150], [12, 300]]
  );
});

test("the horizon cuts the cycle and earlier readings are not in it", () => {
  const [c] = cycles(SERIES, ["2018-06"], 12, true);
  assert.deepEqual(c?.points.map((p) => p.d), ["2018-06-30", "2018-08-31", "2019-05-31", "2019-06-30"]);
  const [short] = cycles(SERIES, ["2018-06"], 3, true);
  assert.deepEqual(short?.points.map((p) => p.d), ["2018-06-30", "2018-08-31"]);
});

test("a month with no reading is named, not filled from a neighbour", () => {
  const [c] = cycles(SERIES, ["2018-07"], 12, true);
  assert.equal(c?.base, null);
  assert.deepEqual(c?.points, []);
});

test("a series that reaches zero or below is laid over in its own units", () => {
  const profit = [at("2022-01-31", 50), at("2022-02-28", -20)];
  assert.equal(indexable(profit), false);
  assert.equal(indexable(SERIES), true);
  const [c] = cycles(profit, ["2022-01"], 12, false);
  assert.deepEqual(c?.points.map((p) => p.y), [50, -20]);
});

test("anchors from a link: valid months only, unique, sorted, at most eight", () => {
  assert.deepEqual(parseAnchors("2021-01,2018-05,2018-13,x,2018-05"), ["2018-05", "2021-01"]);
  const many = Array.from({ length: 10 }, (_, i) => `20${10 + i}-01`).join(",");
  assert.equal(parseAnchors(many).length, 8);
  assert.deepEqual(parseAnchors(null), []);
  assert.equal(parseHorizon("48"), 48);
  assert.equal(parseHorizon("7"), 36);
});
