"use client";

/**
 * Find a series from anywhere: press / (or ⌘K), type a name in either
 * language or an id, and Enter opens its page.
 *
 * Forty series do not fit a menu, and a reader who knows the name should not
 * have to know the tier it sits in. A native <dialog>, so focus is trapped
 * and Esc closes it without code of ours; the list is a listbox the input
 * drives, so a screen reader hears the option the arrows land on.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { nameOf, pathOf, seriesPath, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { find, type Findable } from "@/lib/search";

export type SearchItem = Findable & { tier: string };

const SHOWN = 12;

type Props = { items: SearchItem[]; locale: Locale };

export function SeriesSearch({ items, locale }: Props) {
  const t = dict(locale);
  const s = t.search;
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const list = useId();

  const hits = useMemo(() => find(items, query).slice(0, SHOWN), [items, query]);

  const open = useCallback(() => {
    setQuery("");
    setActive(0);
    dialog.current?.showModal();
    input.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target != null &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        if (dialog.current?.open) return;
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (id: string) => {
    dialog.current?.close();
    router.push(seriesPath(locale, id));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (hits.length ? (a + step + hits.length) % hits.length : 0));
    } else if (e.key === "Enter" && hits[active]) {
      e.preventDefault();
      go(hits[active].id);
    }
  };

  return (
    <>
      <button className="search-open" onClick={open} aria-haspopup="dialog" title={s.title}>
        <svg className="search-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="search-label">{s.open}</span> <kbd>/</kbd>
      </button>
      <dialog
        ref={dialog}
        className="search"
        aria-label={s.label}
        // A click on the backdrop lands on the dialog itself.
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-expanded="true"
          aria-controls={list}
          aria-activedescendant={hits[active] ? `${list}-${hits[active].id}` : undefined}
          aria-label={s.label}
          placeholder={s.placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <ul id={list} role="listbox" aria-label={s.label}>
          {hits.map((item, i) => (
            <li
              key={item.id}
              id={`${list}-${item.id}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item.id)}
            >
              <span className="search-name">{nameOf(item, locale)}</span>
              <span className="search-meta muted">
                {t.tier[item.tier as keyof typeof t.tier] ?? item.tier}
              </span>
              <Link
                className="search-compare"
                href={`${pathOf(locale, "compare")}?s=${item.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  dialog.current?.close();
                }}
                tabIndex={-1}
              >
                {s.compare}
              </Link>
            </li>
          ))}
        </ul>
        <p className="search-hint muted">{hits.length ? s.hint : s.none}</p>
      </dialog>
    </>
  );
}
