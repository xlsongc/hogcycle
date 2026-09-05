import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "猪周期图表墙",
  description: "把猪周期的因果链放在一条共享时间轴上，供人判断，不代人判断。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
