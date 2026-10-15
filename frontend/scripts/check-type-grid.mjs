/**
 * Fail the build when a font size leaves the two pixel grids.
 *
 * Departure Mono is drawn on 11px and zpix on 12px; at any other size a
 * pixel face is resampled and goes soft. The page's grid travels in
 * `--type` (12px, 11px under html:lang(en)), so prose and every control
 * that can carry Chinese reads it. A literal size is legal only where the
 * text is in one script: numerals, the Latin brand, an endonym. The phase-2
 * audit found 108 of 210 Chinese runs on /zh/ drawn at 11px, all from
 * literals written for the English grid; this keeps them from coming back.
 *
 *   node scripts/check-type-grid.mjs        (run by `npm run build`)
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL("../src/", import.meta.url).pathname;

// selector -> the one literal size it may use, and why it is single-script.
const LITERAL = {
  ".num": "11px", // numerals only, Departure Mono in both languages
  ".arrow": "11px", // the → between chain chips
  ".brand": "11px", // "hogcycle", Latin
  ".lang": "11px", // "English"; 中文 takes the rule below
  ".lang :lang(zh)": "12px", // zpix's grid, on either page
  ".signal-value b": "33px", // a card's value: numerals at 3 × 11px
};

const problems = [];

function cssFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? cssFiles(join(dir, e.name)) : e.name.endsWith(".css") ? [join(dir, e.name)] : []
  );
}

for (const file of cssFiles(join(SRC, "app"))) {
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = selector.trim().replace(/\s+/g, " ");
    for (const [, size] of body.matchAll(/font(?:-size)?\s*:\s*(\d+(?:\.\d+)?px)/g)) {
      if (LITERAL[sel] !== size) {
        problems.push(`${file.replace(SRC, "src/")}: ${sel} { font…: ${size} } — use var(--type)`);
      }
    }
  }
}

// Canvas text: ECharts takes a number, so the same rule reads NUM_PX for
// numerals and labelPx(locale) for anything that can carry Chinese.
function tsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? tsFiles(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []
  );
}
for (const file of tsFiles(join(SRC, "charts"))) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/fontSize:\s*\d+/g)) {
    const line = src.slice(0, m.index).split("\n").length;
    problems.push(`${file.replace(SRC, "src/")}:${line}: ${m[0]} — use NUM_PX or labelPx(locale)`);
  }
}

if (problems.length) {
  console.error(`type grid: ${problems.length} size(s) off the pixel grids\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("type grid: every font size is on a pixel grid");
