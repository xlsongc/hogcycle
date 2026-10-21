/**
 * Fail the build when a font size is not on the type scale (docs/adr/0037).
 *
 * Text sizes come from the --text-* tokens in globals.css, so the page has
 * one scale rather than a size per rule. The one literal allowed is the pixel
 * face's own grid: Departure Mono is drawn on 11px and is resampled into blur
 * at any size that is not a whole multiple of it, so a rule that sets it
 * names the multiple outright.
 *
 * Canvas text cannot read a CSS token, so the charts take NUM_PX or
 * labelPx(locale) from charts/base/ink.ts instead of a number.
 *
 *   node scripts/check-type-scale.mjs       (run by `npm run build`)
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL("../src/", import.meta.url).pathname;
const PIXEL_GRID = new Set(["11px", "22px", "33px", "44px"]);

const problems = [];

function filesOf(dir, test) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? filesOf(join(dir, e.name), test) : test(e.name) ? [join(dir, e.name)] : []
  );
}

for (const file of filesOf(join(SRC, "app"), (n) => n.endsWith(".css"))) {
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = selector.trim().replace(/\s+/g, " ");
    const pixel = /font-family\s*:\s*var\(--font-pixel\)/.test(body);
    for (const [, prop, value] of body.matchAll(/(font(?:-size)?)\s*:\s*([^;]+)/g)) {
      if (prop === "font" && !/\d/.test(value)) continue;
      for (const [size] of value.matchAll(/\d+(?:\.\d+)?px/g)) {
        if (pixel && PIXEL_GRID.has(size)) continue;
        const why = pixel ? "the pixel face takes a multiple of 11px" : "use a var(--text-*) token";
        problems.push(`${file.replace(SRC, "src/")}: ${sel} { ${prop}: ${size} } — ${why}`);
      }
    }
  }
}

for (const file of filesOf(join(SRC, "charts"), (n) => /\.tsx?$/.test(n))) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/fontSize:\s*\d+/g)) {
    const line = src.slice(0, m.index).split("\n").length;
    problems.push(`${file.replace(SRC, "src/")}:${line}: ${m[0]} — use NUM_PX or labelPx(locale)`);
  }
}

if (problems.length) {
  console.error(`type scale: ${problems.length} size(s) off the scale\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("type scale: every font size is a token or the pixel grid");
