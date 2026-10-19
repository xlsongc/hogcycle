/**
 * Fail the build when the page would draw a Chinese character the font
 * subset does not hold.
 *
 * zpix is cut down to the characters the app renders (subset-cjk-font.sh),
 * and one outside the cut falls back to a system face mid-sentence: a smooth
 * glyph in a line of pixel ones. Nothing caught that but a reader's eye, and
 * every new indicator name or line of copy could cause it. The subset script
 * leaves the list of what it cut beside the font; this compares the sources
 * the page is built from against it.
 *
 *   node scripts/check-cjk-coverage.mjs      (run by `npm run build`)
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL("../src/", import.meta.url).pathname;
const LIST = join(SRC, "fonts/Zpix-Subset.chars.txt");

// The ranges the subset script cuts: CJK punctuation, the unified ideographs,
// fullwidth forms, and general punctuation.
const RANGES = [
  [0x3000, 0x303f],
  [0x4e00, 0x9fff],
  [0xff00, 0xffef],
  [0x2010, 0x203f],
];
const isCjk = (c) => RANGES.some(([a, b]) => c >= a && c <= b);

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(join(dir, e.name))
      : /\.(tsx?|css|json)$/.test(e.name)
        ? [join(dir, e.name)]
        : []
  );
}

const held = new Set(readFileSync(LIST, "utf8"));
const missing = new Map();
for (const file of files(SRC)) {
  for (const ch of readFileSync(file, "utf8")) {
    const code = ch.codePointAt(0);
    if (isCjk(code) && !held.has(ch) && !missing.has(ch)) {
      missing.set(ch, file.slice(SRC.length));
    }
  }
}

if (missing.size) {
  console.error(
    `cjk coverage: ${missing.size} character(s) the zpix subset does not hold, ` +
      "so they would fall back to a system face:"
  );
  for (const [ch, file] of missing) console.error(`  ${ch}  (first in src/${file})`);
  console.error("Re-cut the font: frontend/scripts/subset-cjk-font.sh <zpix source>");
  process.exit(1);
}
console.log(`cjk coverage: every character is in the subset (${held.size} held)`);
