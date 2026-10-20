import { test } from "node:test";
import assert from "node:assert/strict";
import { knownOn, panelOn } from "../src/lib/asOf.ts";
import type { Panel } from "../src/types/generated/wall.ts";

// piglet_price as exported: 2023-10-25 was first learned undated, then the
// ministry's dated report gave a second value.
const PANEL = {
  id: "piglet_price",
  learned: "2026-09-05",
  revisions: [
    {
      d: "2023-10-25",
      prints: [
        { v: 25.36, p: null, learned: "2026-09-05" },
        { v: 25.63, p: "2023-10-30", learned: "2026-10-12" },
      ],
    },
  ],
  breaks: [],
  points: [
    { d: "2023-10-18", v: 25.1, g: "W", p: "2023-10-23" },
    { d: "2023-10-25", v: 25.63, g: "W", p: "2023-10-30" },
  ],
} as unknown as Panel;

test("a period is revised from the day its second value was out", () => {
  const [, week] = knownOn(PANEL, "2023-11-01");
  assert.equal(week?.v, 25.63);
  // The undated print was learned in 2026: in 2023 there was one value.
  assert.deepEqual(panelOn(PANEL, "2023-11-01").revisions, []);
  assert.equal(panelOn(PANEL, "2026-10-20").revisions[0]?.prints.length, 2);
});

test("today the panel keeps its revisions as exported", () => {
  assert.equal(panelOn(PANEL, null).revisions.length, 1);
});

test("an undated trail is revised once its second print was learned", () => {
  const undated = {
    ...PANEL,
    revisions: [
      {
        d: "2023-10-25",
        prints: [
          { v: 25.36, p: null, learned: "2026-09-05" },
          { v: 25.63, p: null, learned: "2026-10-12" },
        ],
      },
    ],
    points: PANEL.points.map((p) => ({ ...p, p: undefined })),
  } as unknown as Panel;
  assert.deepEqual(panelOn(undated, "2026-10-01").revisions, []);
  const later = panelOn(undated, "2026-10-12").revisions;
  assert.equal(later[0]?.prints.length, 2);
});
