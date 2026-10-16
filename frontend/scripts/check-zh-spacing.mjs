/**
 * Fail the build when the Chinese pages put a space between two Chinese
 * characters.
 *
 * JSX joins a line break inside text with a space. That is invisible in
 * English copy and wrong in Chinese, where words are not separated: the
 * phase-2 audit found 22 such gaps across /zh/, /zh/wall/ and /zh/compare/
 * ("复原。 空心点"), every one a wrapped line in i18n/zh.tsx. The check reads
 * the prerendered HTML, because that is where JSX's rule has been applied.
 * A space between Chinese and Latin or numerals ("近 5 年") is deliberate
 * and allowed.
 *
 *   node scripts/check-zh-spacing.mjs        (run by `npm run build`, after next build)
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const OUT = new URL("../out/zh/", import.meta.url).pathname;

const HAN = "\\u4e00-\\u9fff\\u3000-\\u303f\\uff01-\\uff5e";
const GAP = new RegExp(`([${HAN}]) +([${HAN}])`, "g");
// Inline elements run on in the same line of text, so a space beside one
// still sits between two characters; a block boundary does not.
const INLINE = /<\/?(?:a|b|i|em|strong|span|code)(?:\s[^>]*)?>/g;

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? htmlFiles(join(dir, e.name)) : e.name.endsWith(".html") ? [join(dir, e.name)] : []
  );
}

const problems = [];
for (const file of htmlFiles(OUT)) {
  const text = readFileSync(file, "utf8")
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, "")
    .replace(INLINE, "")
    .replace(/<[^>]+>/g, "\n");
  for (const m of text.matchAll(GAP)) {
    const at = m.index ?? 0;
    problems.push(`${file.slice(OUT.length - 3)}: …${text.slice(Math.max(0, at - 8), at + 10)}…`);
  }
}

if (problems.length) {
  console.error(`zh spacing: ${problems.length} space(s) between Chinese characters`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("  A wrapped line inside JSX text becomes a space; join it in src/i18n/zh.tsx.");
  process.exit(1);
}
console.log("zh spacing: no space between Chinese characters");
