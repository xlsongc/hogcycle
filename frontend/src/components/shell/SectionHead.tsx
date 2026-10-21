/**
 * A section's heading, its one-line answer, and how it is built behind a
 * disclosure (docs/adr/0037). The reader gets what to take from the section
 * first; the method is one press away rather than a paragraph in front of
 * the chart.
 */

import type { ReactNode } from "react";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

type Props = {
  id: string;
  /** The section's place on the page, set small in the pixel face. */
  index?: string;
  title: ReactNode;
  note?: ReactNode;
  method?: ReactNode;
  locale: Locale;
};

export function SectionHead({ id, index, title, note, method, locale }: Props) {
  return (
    <>
      <h2 className="section" id={id}>
        {index && (
          <span className="kicker" aria-hidden="true">
            {index}
          </span>
        )}
        <span>{title}</span>
      </h2>
      {note && <p className="section-note">{note}</p>}
      {method && (
        <details className="method">
          <summary>{dict(locale).more.method}</summary>
          <div>{method}</div>
        </details>
      )}
    </>
  );
}
