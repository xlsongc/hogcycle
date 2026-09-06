import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./hud.css";
import "./tiles.css";

// Loaded through next/font rather than a CSS @font-face: an absolute
// url("/fonts/...") inside CSS is not rewritten by basePath, so on a project
// Pages site it would 404 and the whole page would fall back to a system
// face. next/font also fingerprints and self-hosts the file.
const departureMono = localFont({
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
// whose name uses a new character.
const zpix = localFont({
  src: "../fonts/Zpix-Subset.woff2",
  variable: "--font-zpix",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "猪周期图表墙",
  description: "把猪周期的因果链放在一条共享时间轴上，供人判断，不代人判断。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${departureMono.variable} ${zpix.variable}`}>
      <body>{children}</body>
    </html>
  );
}
