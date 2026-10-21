/**
 * The site's two faces, loaded once and shared by both root layouts
 * (docs/adr/0037).
 *
 * Loaded through next/font rather than a CSS @font-face: an absolute
 * url("/fonts/...") inside CSS is not rewritten by basePath, so on a project
 * Pages site it would 404. next/font also fingerprints and self-hosts the
 * file, so a reader's browser never asks Google for anything; the build does,
 * once.
 */

import localFont from "next/font/local";
import { Inter } from "next/font/google";

// Everything a reader reads: prose, numbers, controls, chart labels. Inter
// has true tabular figures, so columns of numbers line up without a
// monospace face. It has no Chinese, so CJK falls through to the system's
// own (PingFang, YaHei, Noto Sans CJK): a few MB a reader already has,
// rather than a web font the size of the site.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Departure Mono, the pixel face (SIL OFL), is now an accent: the wordmark
// and section numbers. It is drawn on 11px and goes soft at any size that is
// not a whole multiple of that, so it never sets prose.
export const departureMono = localFont({
  src: "../fonts/DepartureMono-Regular.woff2",
  variable: "--font-departure",
  display: "swap",
  weight: "400",
});

export const fontVars = `${inter.variable} ${departureMono.variable}`;
