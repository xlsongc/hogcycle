/**
 * The one page for every address the site does not have.
 *
 * GitHub Pages serves 404.html for any missing path under the base path, in
 * either language, so this page cannot know which language the reader came
 * in; it says it in both. It sits outside both root layouts (there is no
 * shared one to put a not-found inside), so it brings its own document,
 * styles, fonts and theme.
 */

import type { Metadata } from "next";
import "./globals.css";
import "./nav.css";
import "./not-found.css";
import { fontVars } from "./fonts";
import { BrandMark } from "@/components/shell/BrandMark";
import { THEME_BOOT } from "@/components/shell/themeBoot";
import { HTML_LANG, PATH, pathOf, staticPath, type Locale } from "@/i18n/locale";
import { en } from "@/i18n/en";
import { zh } from "@/i18n/zh";

// Next marks this page noindex on its own.
export const metadata: Metadata = {
  title: `404 · ${zh.notFound.title} · ${en.notFound.title}`,
};

function Links({ locale }: { locale: Locale }) {
  const t = (locale === "zh" ? zh : en).notFound;
  return (
    <ul lang={HTML_LANG[locale]}>
      <li>
        <a href={staticPath(PATH[locale])}>{t.home}</a>
      </li>
      <li>
        <a href={staticPath(pathOf(locale, "week"))}>{t.week}</a>
      </li>
      <li>
        <a href={staticPath(pathOf(locale, "datasets"))}>{t.data}</a>
      </li>
    </ul>
  );
}

export default function GlobalNotFound() {
  return (
    <html lang={HTML_LANG.zh} className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <main className="wrap nf">
          <a href={staticPath("/")} className="brand" aria-label="hogcycle">
            <BrandMark />
            <span className="brand-word">hogcycle</span>
          </a>
          <p className="nf-code num">404</p>
          <section>
            <h1>{zh.notFound.title}</h1>
            <p>{zh.notFound.body}</p>
            <Links locale="zh" />
          </section>
          <section lang={HTML_LANG.en}>
            <h2>{en.notFound.title}</h2>
            <p>{en.notFound.body}</p>
            <Links locale="en" />
          </section>
        </main>
      </body>
    </html>
  );
}
