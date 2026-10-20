import { test } from "node:test";
import assert from "node:assert/strict";
import { MIN_PAIRS, pearson, scan, strongest, yearOnYear, monthly } from "../src/lib/leadLag.ts";
import type { Point } from "../src/types/generated/wall.ts";

/** Month ends from 2016-01 for n months, valued by f(month index). */
function series(n: number, f: (i: number) => number): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const y = 2016 + Math.floor(i / 12);
    const m = (i % 12) + 1;
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    return { d: end, v: f(i), g: "M" as const };
  });
}

test("a series that is another one eleven months later is found at eleven", () => {
  const wave = (i: number) => 100 + 20 * Math.sin(i / 7) + 8 * Math.sin(i / 3.1);
  const lead = series(120, wave);
  const target = series(120, (i) => wave(i - 11));
  const best = strongest(scan(lead, target));
  assert.equal(best?.k, 11);
  assert.ok((best?.r ?? 0) > 0.99);
});

test("too few shared months give no r rather than a confident one", () => {
  const lead = series(MIN_PAIRS + 5, (i) => 100 + i);
  const target = series(MIN_PAIRS + 5, (i) => 50 + Math.sin(i));
  const rs = scan(lead, target, "level");
  assert.equal(rs[0]?.r != null, true);
  assert.equal(rs[24]?.r, null);
});

test("year on year is a difference for a series that reaches zero or below", () => {
  const s = monthly(series(14, (i) => (i < 12 ? 10 : -5)));
  assert.deepEqual([...yearOnYear(s).values()], [-15, -15]);
  const p = monthly(series(13, (i) => (i < 12 ? 10 : 12)));
  const [pct] = [...yearOnYear(p).values()];
  assert.ok(Math.abs((pct ?? 0) - 20) < 1e-9);
});

test("pearson on a line is one, and on a flat series is nothing", () => {
  assert.equal(pearson([1, 2, 3], [2, 4, 6]), 1);
  assert.equal(pearson([1, 2, 3], [5, 5, 5]), null);
});
