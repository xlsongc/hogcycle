/**
 * The terms a page uses, each a disclosure that works without script. Terms
 * inside prose cannot carry a button of their own, so the page lists them
 * once, near the prose that uses them.
 */

import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import type { TermId } from "@/i18n/en/terms";

export function Glossary({ ids, locale }: { ids: TermId[]; locale: Locale }) {
  const t = dict(locale).terms;
  return (
    <section className="glossary" aria-label={t.heading}>
      <span className="filter-label">{t.heading}</span>
      {ids.map((id) => (
        <details key={id}>
          <summary>{t.items[id].label}</summary>
          <p>{t.items[id].body}</p>
        </details>
      ))}
    </section>
  );
}
