"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { THEME_KEY as KEY } from "@/components/shell/themeBoot";

type Mode = "system" | "light" | "dark";

/** A per-viewer convenience, so browser storage is the right home for it.
 *  Every access is guarded: a private window or blocked site data makes it
 *  throw, and the page must then simply follow the system theme. */
function stored(): Mode {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** The charts read their colours from CSS custom properties, so switching the
 *  stamp on <html> is enough; the event tells mounted charts to re-read them.
 *  Remembered because changing language is a full page load (two root
 *  layouts), which would otherwise reset it. */
export function ThemeToggle({ locale }: { locale: Locale }) {
  const t = dict(locale).theme;
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => setMode(stored()), []);

  useEffect(() => {
    if (mode == null) return;
    const root = document.documentElement;
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
    try {
      if (mode === "system") window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, mode);
    } catch {
      // Not remembered, still applied.
    }
    window.dispatchEvent(new Event("hogcycle:theme"));
  }, [mode]);

  const current = mode ?? "system";
  const next: Record<Mode, Mode> = { system: "light", light: "dark", dark: "system" };
  return (
    <button onClick={() => setMode(next[current])} title={t.switch}>
      {t[current]}
    </button>
  );
}
