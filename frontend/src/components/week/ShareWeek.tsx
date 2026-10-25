"use client";

/**
 * Copy an issue as text: its name, its one sentence, its own address.
 *
 * WeChat reads a page's card unreliably, so a pasted link may arrive as a
 * bare title; the sentence travels as text the reader pastes with it. Where the browser has a share sheet (most phones), a second button
 * opens it. The address is the issue's own, never /week/, which moves on.
 */

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

type Props = { title: string; text: string; url: string; locale: Locale };

// The old way, for a browser without the clipboard API or one that refuses
// it outside a secure context or a user gesture it recognises.
function copyByHand(value: string): boolean {
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

export function ShareWeek({ title, text, url, locale }: Props) {
  const t = dict(locale).week.share;
  const whole = `${title}\n${text}\n${url}`;
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const [canShare, setCanShare] = useState(false);

  // Known only in the browser; the prerendered page offers the copy alone.
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (state !== "copied") return;
    const id = window.setTimeout(() => setState("idle"), 2400);
    return () => window.clearTimeout(id);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(whole);
      setState("copied");
    } catch {
      setState(copyByHand(whole) ? "copied" : "failed");
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // Dismissing the sheet rejects too; nothing to say about it.
    }
  };

  return (
    <div className="wk-share">
      <button type="button" onClick={copy}>
        {state === "copied" ? t.copied : t.copy}
      </button>
      {canShare && (
        <button type="button" onClick={share}>
          {t.share}
        </button>
      )}
      <span className="sr-only" aria-live="polite">
        {state === "copied" ? t.copiedAll : ""}
      </span>
      {state === "failed" && (
        <label className="wk-share-fallback">
          <span>{t.failed}</span>
          <textarea readOnly rows={3} value={whole} onFocus={(e) => e.currentTarget.select()} />
        </label>
      )}
    </div>
  );
}
