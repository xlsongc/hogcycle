/**
 * Colour and type for canvas text and strokes, read from the page.
 *
 * A canvas cannot use CSS, so everything a chart draws resolves its colour
 * and face here, from the same custom properties the page is styled with.
 */

import type { Panel } from "@/types/generated/wall";
import type { Locale } from "@/i18n/locale";

export type Tier = Panel["tier"];

/** CSS custom properties are the single source of colour; reading them back
 *  keeps the chart in step with the theme toggle and with prefers-color-scheme
 *  instead of duplicating the palette in JS. */
export function cssVar(name: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

export function tierColor(tier: Tier): string {
  return cssVar(`--${tier}`, "#2a78d6");
}

/** next/font generates a hashed family name, so the literal "Inter" resolves
 *  to nothing inside a canvas. Read the variable the loader sets, and list the
 *  system Chinese faces behind it as the page does (docs/adr/0037). */
export function chartFont(): string {
  const inter = cssVar("--font-inter", "");
  const cjk = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';
  return inter ? `${inter}, ${cjk}` : `system-ui, ${cjk}`;
}

/** Numerals and dates on a canvas: Inter's tabular figures at 11px keep a
 *  y-axis column aligned. Text that can carry Chinese takes a pixel more,
 *  because a Han character at 11px loses its inner strokes. */
export const NUM_PX = 11;
export function labelPx(locale: Locale): number {
  return locale === "zh" ? 12 : NUM_PX;
}

let measure: CanvasRenderingContext2D | null = null;

/** How wide a canvas label will draw, so marks can keep their labels apart
 *  in pixels rather than in guesses. */
export function textWidth(text: string, px: number): number {
  if (typeof document === "undefined") return text.length * px;
  measure ??= document.createElement("canvas").getContext("2d");
  if (!measure) return text.length * px;
  measure.font = `${px}px ${chartFont()}`;
  return measure.measureText(text).width;
}
