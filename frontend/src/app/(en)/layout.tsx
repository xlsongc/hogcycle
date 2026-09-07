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
import "../hud.css";
import "../tiles.css";
import "../controls.css";
import { fontVars } from "../fonts";
import { HTML_LANG } from "@/i18n/locale";
import { en } from "@/i18n/en";

export const metadata: Metadata = {
  title: en.meta.title,
  description: en.meta.description,
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={HTML_LANG.en} className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
