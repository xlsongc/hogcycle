import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "猪周期图表墙",
  description: "把猪周期的因果链放在一条共享时间轴上，供人判断，不代人判断。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={departureMono.variable}>
      <body>{children}</body>
    </html>
  );
}
