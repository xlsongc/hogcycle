"use client";

/**
 * The bar across the top of every page: where you are, where else you can
 * go, and the same page in the other language.
 *
 * Lives in the root layout, so it persists across pages within a language.
 * The language link is a navigation between two root layouts (docs/adr/0014)
 * and goes to the *same page* in the other language — switching language on
 * the wall should not drop the reader back on the overview.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ENDONYM, LOCALES, PAGES, pageOf, pathOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteNav({ locale }: { locale: Locale }) {
  const t = dict(locale).nav;
  const page = pageOf(usePathname() ?? "/");

  return (
    <nav className="site-nav" aria-label={t.pages}>
      <div className="site-nav-inner">
        <Link href={pathOf(locale, "overview")} className="brand">
          hogcycle
        </Link>
        <ul>
          {PAGES.map((p) => (
            <li key={p}>
              <Link href={pathOf(locale, p)} aria-current={p === page ? "page" : undefined}>
                {t[p]}
              </Link>
            </li>
          ))}
        </ul>
        <div className="site-nav-end">
          <span className="lang" aria-label={t.language}>
            {LOCALES.map((l) =>
              l === locale ? (
                <b key={l} aria-current="true">
                  {ENDONYM[l]}
                </b>
              ) : (
                <Link key={l} href={pathOf(l, page)} hrefLang={l}>
                  {ENDONYM[l]}
                </Link>
              )
            )}
          </span>
          <ThemeToggle locale={locale} />
        </div>
      </div>
    </nav>
  );
}
