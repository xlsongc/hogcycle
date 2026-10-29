import { test } from "node:test";
import assert from "node:assert/strict";
import { lastWeekEnd, opening, pct, settleAt, standing, weeks } from "../src/lib/futures.ts";

const lh2709 = {
  delivery: "2027-09-30",
  delivered: false,
  settles: [
    { d: "2026-10-02", v: 13745 },
    { d: "2026-10-09", v: 13500 },
    { d: "2026-10-16", v: 13200 },
    { d: "2026-10-23", v: 12995 },
    { d: "2026-10-28", v: 12790 },
  ],
};

test("a week ends on the Sunday before the latest settle's week", () => {
  assert.equal(lastWeekEnd("2026-10-28"), "2026-10-25"); // a Wednesday
  assert.equal(lastWeekEnd("2026-10-26"), "2026-10-25"); // a Monday
  assert.equal(lastWeekEnd("2026-10-25"), "2026-10-18"); // a Sunday is its own week's end
});

test("the settle in force is the last one on or before the day", () => {
  assert.deepEqual(settleAt(lh2709.settles, "2026-10-25"), { d: "2026-10-23", v: 12995 });
  assert.equal(settleAt(lh2709.settles, "2026-09-30"), undefined);
});

test("a live contract stands against last week and its first week", () => {
  const s = standing(lh2709)!;
  assert.equal(s.last.v, 12790);
  assert.equal(s.week?.d, "2026-10-23");
  assert.equal(s.weekPct, -1.6);
  assert.equal(s.sinceFirst, -6.9);
  assert.equal(standing({ ...lh2709, settles: [] }), undefined);
});

test("the weekly record runs newest first, each week against the one before and the reference", () => {
  const rows = weeks(lh2709.settles, 12790);
  assert.equal(rows[0]?.d, "2026-10-28");
  assert.equal(rows[0]?.against, 0);
  assert.equal(rows[rows.length - 1]?.week, null);
  assert.equal(rows[rows.length - 1]?.against, pct(13745, 12790));
});

test("the page opens on the contract the main price is, else the nearest live one", () => {
  const near = { delivery: "2026-11-30", delivered: false, settles: [{ d: "2026-10-28", v: 9285 }] };
  const done = { delivery: "2026-09-30", delivered: true, settles: [{ d: "2026-09-24", v: 10300 }] };
  const lives = [done, near, lh2709];
  assert.equal(opening(lives, { d: "2026-10-28", v: 12790 }), "2027-09-30");
  assert.equal(opening(lives, { d: "2026-10-28", v: 1 }), "2026-11-30");
  assert.equal(opening([done]), "2026-09-30");
});
