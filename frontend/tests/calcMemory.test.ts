import { test } from "node:test";
import assert from "node:assert/strict";
import { fromStore } from "../src/lib/calcMemory.ts";

test("kept numbers come back under their own names", () => {
  assert.deepEqual(fromStore('{"weight":"128","cost":"13.7","basis":"-0.4","heads":"1,200"}'), {
    weight: "128",
    cost: "13.7",
    basis: "-0.4",
    heads: "1,200",
  });
});

test("today's price is never kept, even if a store holds one", () => {
  assert.deepEqual(fromStore('{"price":"15","cost":"14"}'), { cost: "14" });
});

test("anything that is not a number under a kept name is ignored", () => {
  assert.deepEqual(fromStore(null), {});
  assert.deepEqual(fromStore("not json"), {});
  assert.deepEqual(fromStore("[1,2]"), {});
  assert.deepEqual(fromStore('{"weight":125,"cost":"abc","heads":""}'), {});
});
