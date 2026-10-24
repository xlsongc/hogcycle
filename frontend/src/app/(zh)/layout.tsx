/** Root layout for the Chinese site, served at /zh/. See (en)/layout.tsx. */

import type { Metadata } from "next";
import "../globals.css";
import "../nav.css";
import "../wall.css";
import "../overview.css";
import "../market.css";
import "../series.css";
import "../controls.css";
import "../search.css";
import "../tools.css";
import "../week.css";
import "../phone.css";
import { fontVars } from "../fonts";
import { SiteNav } from "@/components/shell/SiteNav";
import { SiteFoot } from "@/components/shell/SiteFoot";
import { searchItems } from "@/components/search/items";
import { THEME_BOOT } from "@/components/shell/themeBoot";
import { HTML_LANG, staticPath } from "@/i18n/locale";
import { zh } from "@/i18n/zh";

export const metadata: Metadata = {
  title: zh.meta.title,
  description: zh.meta.description,
  alternates: {
    types: {
      "application/atom+xml": [
        { url: staticPath("/zh/feed.xml"), title: zh.foot.feed },
        { url: staticPath("/zh/week.xml"), title: zh.foot.weekFeed },
      ],
    },
  },
};

export default function ZhLayout({ children }: { children: React.ReactNode }) {
  return (
    // The boot script may set data-theme before React hydrates; the DOM wins.
    <html lang={HTML_LANG.zh} className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <SiteNav locale="zh" series={searchItems} />
        {children}
        <SiteFoot locale="zh" />
      </body>
    </html>
  );
}
