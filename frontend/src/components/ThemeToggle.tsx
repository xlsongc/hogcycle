"use client";

import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";
const LABEL: Record<Mode, string> = { system: "跟随系统", light: "浅色", dark: "深色" };

/** The charts read their colours from CSS custom properties, so switching the
 *  stamp on <html> is enough; the event tells mounted charts to re-read them. */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
    window.dispatchEvent(new Event("hogcycle:theme"));
  }, [mode]);

  const next: Record<Mode, Mode> = { system: "light", light: "dark", dark: "system" };
  return (
    <button onClick={() => setMode(next[mode])} title="切换主题">
      {LABEL[mode]}
    </button>
  );
}
