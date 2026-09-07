/**
 * The language switch.
 *
 * A link, not a button: the two languages are separately prerendered pages
 * (docs/adr/0014), so switching is a navigation. That costs a page load and
 * buys a correct <html lang> in the served markup, a URL a reader can share,
 * and a control that still works with scripting off.
 */

import Link from "next/link";
import { ENDONYM, LOCALES, PATH, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

export function LanguageToggle({ locale }: { locale: Locale }) {
  return (
    <nav className="lang" aria-label={dict(locale).nav.language}>
      {LOCALES.map((l) =>
        l === locale ? (
          <b key={l} aria-current="page">
            {ENDONYM[l]}
          </b>
        ) : (
          <Link key={l} href={PATH[l]} hrefLang={l}>
            {ENDONYM[l]}
          </Link>
        )
      )}
    </nav>
  );
}
