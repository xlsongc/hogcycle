"use client";

/**
 * The running clock in the header corners.
 *
 * Its own component purely to bound re-rendering: it ticks ten times a second
 * and the rest of the header must not re-render with it.
 *
 * It renders a fixed placeholder on the server and starts only after mount.
 * A clock is the canonical hydration mismatch — the server's value is stale
 * by definition — and the placeholder keeps the layout from shifting when the
 * real value arrives, since both are the same width in a monospaced face.
 */

import { useEffect, useRef } from "react";

const PLACEHOLDER = "--:--:--:--";

function stamp(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return [
    p(d.getHours()),
    p(d.getMinutes()),
    p(d.getSeconds()),
    p(Math.floor(d.getMilliseconds() / 10)),
  ].join(":");
}

export function Clock() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    // Written straight to the text node rather than held in state. At ten
    // ticks a second, setState would re-render this subtree 36,000 times an
    // hour on a page that also holds twenty ECharts instances — enough that
    // the main thread never goes idle. The clock owns one text node; React
    // has no reason to be involved in changing it.
    const tick = () => {
      if (ref.current) ref.current.textContent = stamp(new Date());
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, []);

  return (
    <b className="num" ref={ref} suppressHydrationWarning>
      {PLACEHOLDER}
    </b>
  );
}
