/**
 * Root layout for the English site, served at /.
 *
 * There are two root layouts, one per language, because <html lang> lives here
 * and it has to be right in the *served* markup — a lang attribute patched by
 * script after load is invisible to a crawler and arrives too late for a
 * screen reader that has already begun. See docs/adr/0014.
 */

import type { Metadata } from "next";
import "../globals.css";
import "../nav.css";
import "../wall.css";
import "../overview.css";
import "../series.css";
import "../controls.css";
import "../search.css";
import "../phone.css";
import { fontVars } from "../fonts";
import { SiteNav } from "@/components/shell/SiteNav";
import { searchItems } from "@/components/search/items";
import { THEME_BOOT } from "@/components/shell/themeBoot";
import { HTML_LANG } from "@/i18n/locale";
import { en } from "@/i18n/en";

export const metadata: Metadata = {
  title: en.meta.title,
  description: en.meta.description,
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    // The boot script may set data-theme before React hydrates; the DOM wins.
    <html lang={HTML_LANG.en} className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <SiteNav locale="en" series={searchItems} />
        {children}
      </body>
    </html>
  );
}
