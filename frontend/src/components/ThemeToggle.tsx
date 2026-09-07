"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

type Mode = "system" | "light" | "dark";

/** The charts read their colours from CSS custom properties, so switching the
 *  stamp on <html> is enough; the event tells mounted charts to re-read them. */
export function ThemeToggle({ locale }: { locale: Locale }) {
  const t = dict(locale).theme;
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
    window.dispatchEvent(new Event("hogcycle:theme"));
  }, [mode]);

  const next: Record<Mode, Mode> = { system: "light", light: "dark", dark: "system" };
  return (
    <button onClick={() => setMode(next[mode])} title={t.switch}>
      {t[mode]}
    </button>
  );
}
