/**
 * The two pixel faces, loaded once and shared by both root layouts.
 *
 * Loaded through next/font rather than a CSS @font-face: an absolute
 * url("/fonts/...") inside CSS is not rewritten by basePath, so on a project
 * Pages site it would 404 and the whole page would fall back to a system
 * face. next/font also fingerprints and self-hosts the file.
 */

import localFont from "next/font/local";

export const departureMono = localFont({
  src: "../fonts/DepartureMono-Regular.woff2",
  variable: "--font-departure",
  display: "swap",
  weight: "400",
});

// Zpix (最像素) — a 12px pixel CJK face, so Chinese sits on the same lattice
// as Departure Mono instead of a smooth system sans floating over it.
//
// NOT an open-source licence, unlike Departure Mono above: free for personal
// and educational use, USD $1000 for a commercial product. See
// ../fonts/Zpix-NOTICE.md, which also names the two OFL alternatives that
// drop straight in.
//
// Subset to the ~750 glyphs this app can render, which takes it from 966 KB
// to 29 KB. A character outside that set falls back to a system face — very
// visible next to pixel type — so re-cut it with
// `frontend/scripts/subset-cjk-font.sh` after adding UI copy or an indicator
// whose name uses a new character. Both language pages load it: the English
// page still renders Chinese in the language toggle and in a handful of
// caliber terms that have no English equivalent worth inventing.
export const zpix = localFont({
  src: "../fonts/Zpix-Subset.woff2",
  variable: "--font-zpix",
  display: "swap",
  weight: "400",
});

export const fontVars = `${departureMono.variable} ${zpix.variable}`;
