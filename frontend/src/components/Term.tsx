"use client";

/**
 * A term with its explanation one press away, beside where it is used. The
 * note opens inline under the line rather than in a tooltip: a tooltip cannot
 * be read on a phone or kept open while reading the chart it explains.
 */

import { useId, useState, type ReactNode } from "react";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import type { TermId } from "@/i18n/en/terms";

export function Term({ id, locale, children }: { id: TermId; locale: Locale; children?: ReactNode }) {
  const t = dict(locale).terms;
  const item = t.items[id];
  const note = useId();
  const [open, setOpen] = useState(false);
  return (
    <>
      {children}
      <button
        type="button"
        className="term-toggle"
        aria-expanded={open}
        aria-controls={note}
        aria-label={t.toggle(item.label)}
        title={t.toggle(item.label)}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      <span id={note} className="term-note" role="note" hidden={!open}>
        {item.body}
      </span>
    </>
  );
}
