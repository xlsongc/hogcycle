/** Root layout for the Chinese site, served at /zh/. See (en)/layout.tsx. */

import type { Metadata } from "next";
import "../globals.css";
import "../nav.css";
import "../wall.css";
import "../overview.css";
import "../series.css";
import "../controls.css";
import { fontVars } from "../fonts";
import { SiteNav } from "@/components/shell/SiteNav";
import { HTML_LANG } from "@/i18n/locale";
import { zh } from "@/i18n/zh";

export const metadata: Metadata = {
  title: zh.meta.title,
  description: zh.meta.description,
};

export default function ZhLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={HTML_LANG.zh} className={fontVars}>
      <body>
        <SiteNav locale="zh" />
        {children}
      </body>
    </html>
  );
}
