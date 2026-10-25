/**
 * Draw the card a pasted link unfolds into (public/og.png, 1200 × 630):
 * the wordmark, what the site is in both languages, and the hog price
 * index since 2015 — the cycle itself, from the contract.
 *
 * Run by hand, not by the build: it needs a Chrome to take the picture, and
 * the card is the site's, not the day's, so it changes only when this file
 * does. Chinese comes from the machine's own CJK face (PingFang on a Mac).
 *
 *   node scripts/og-card.mjs            (CHROME=/path/to/chrome to override)
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const OUT = join(ROOT, "public/og.png");
const CHROME =
  process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = 1200;
const H = 630;

const wall = JSON.parse(readFileSync(join(ROOT, "src/data/wall.json"), "utf8"));
const panel = wall.panels.find((p) => p.id === "hog_price_index");
const pts = panel.points.filter((p) => p.v != null);

// The line spans the card's width under the text; its own min to max fills
// the band, as a sparkline does.
const BAND = { x0: 72, x1: W - 72, y0: 318, y1: 492 };
const t0 = Date.parse(pts[0].d);
const t1 = Date.parse(pts.at(-1).d);
const lo = Math.min(...pts.map((p) => p.v));
const hi = Math.max(...pts.map((p) => p.v));
const x = (d) => BAND.x0 + ((Date.parse(d) - t0) / (t1 - t0)) * (BAND.x1 - BAND.x0);
const y = (v) => BAND.y1 - ((v - lo) / (hi - lo)) * (BAND.y1 - BAND.y0);
const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.d).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
const area = `${line}L${BAND.x1},${BAND.y1}L${BAND.x0},${BAND.y1}Z`;
const years = [2015, 2018, 2021, 2024].map((yr) => ({ yr, at: x(`${yr}-01-01`) }));
const last = pts.at(-1);

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family: Departure; src: url("file://${join(ROOT, "src/fonts/DepartureMono-Regular.woff2")}"); }
* { box-sizing: border-box; }
html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
body { background: #f5f5f2; color: #121211;
  font-family: -apple-system, "SF Pro Display", "PingFang SC", "Noto Sans CJK SC", sans-serif; }
.brand { position: absolute; left: 72px; top: 64px; display: flex; align-items: center; gap: 16px;
  font: 44px/1 Departure, monospace; }
.mark { display: flex; align-items: flex-end; gap: 4px; height: 36px; }
.mark i { width: 10px; border-radius: 2px; }
h1 { position: absolute; left: 72px; top: 148px; margin: 0; font-size: 64px; font-weight: 650;
  letter-spacing: -0.01em; }
.en { position: absolute; left: 74px; top: 240px; margin: 0; font-size: 32px; color: #46453f; }
svg { position: absolute; left: 0; top: 0; }
.foot { position: absolute; left: 72px; right: 72px; bottom: 40px; display: flex;
  justify-content: space-between; font-size: 22px; color: #696862; }
.foot b { color: #121211; font-weight: 600; }
</style></head><body>
<div class="brand"><span class="mark"><i style="height:36px;background:#2a78d6"></i><i style="height:24px;background:#1baf7a"></i><i style="height:14px;background:#eb6834"></i></span>hogcycle</div>
<h1>中国猪周期，一手数据</h1>
<p class="en">China's hog cycle, from primary sources</p>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1baf7a" stop-opacity="0.22"/><stop offset="1" stop-color="#1baf7a" stop-opacity="0"/>
  </linearGradient></defs>
  <line x1="${BAND.x0}" x2="${BAND.x1}" y1="${BAND.y1}" y2="${BAND.y1}" stroke="#cfcec6"/>
  ${years.map((g) => `<text x="${g.at.toFixed(1)}" y="${BAND.y1 + 30}" font-size="18" fill="#696862">${g.yr}</text>`).join("")}
  <path d="${area}" fill="url(#g)"/>
  <path d="${line}" fill="none" stroke="#17815b" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="${x(last.d).toFixed(1)}" cy="${y(last.v).toFixed(1)}" r="6" fill="#17815b"/>
</svg>
<div class="foot"><span><b>猪市周报</b> · 因果链 · 利润计算器 · 数据接口</span><span>xlsongc.github.io/hogcycle</span></div>
</body></html>`;

if (!existsSync(CHROME)) {
  console.error(`No Chrome at ${CHROME}; set CHROME to one.`);
  process.exit(1);
}
const dir = mkdtempSync(join(tmpdir(), "og-card-"));
const page = join(dir, "card.html");
writeFileSync(page, html);
execFileSync(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--force-device-scale-factor=1",
  `--window-size=${W},${H}`,
  `--screenshot=${OUT}`,
  `file://${page}`,
]);
console.log(`wrote ${OUT} (hog price index ${pts[0].d} → ${last.d})`);
