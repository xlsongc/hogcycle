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

/** next/font generates a hashed family name, so the literal "Departure Mono"
 *  resolves to nothing inside a canvas. Read the variables the loader sets —
 *  both of them, so Chinese in a canvas label (数据始于, 盈亏线) lands on the
 *  same pixel face as the page instead of a heavy system fallback. */
export function monoFont(): string {
  const faces = [cssVar("--font-departure", ""), cssVar("--font-zpix", "")].filter(Boolean);
  return faces.length ? `${faces.join(", ")}, monospace` : "ui-monospace, monospace";
}

/** Canvas text that can carry Chinese — a threshold's label, "today", the
 *  coverage note, a legend of series names — sits on zpix's 12px grid on the
 *  Chinese page. Numerals and dates stay on Departure Mono's 11px in both:
 *  either face drawn off its own grid is resampled and goes soft. */
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
  measure.font = `${px}px ${monoFont()}`;
  return measure.measureText(text).width;
}
