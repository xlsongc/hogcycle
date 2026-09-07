/**
 * What a locale is, and how to read a localised field off the contract.
 *
 * Both languages are prerendered as separate pages, so `Locale` is a build-time
 * fact rather than runtime state: it arrives as a prop from the route that
 * rendered it and never changes while a page is mounted. Switching language is
 * a navigation, which is why the toggle is a link and works with scripting off.
 */

export type Locale = "en" | "zh";

export const LOCALES: readonly Locale[] = ["en", "zh"] as const;

/** English is the default, so it owns the root path. */
export const PATH: Record<Locale, string> = { en: "/", zh: "/zh/" };

/** For the <html lang> attribute. Chinese is region-tagged because zh alone
 *  leaves a reader to guess between simplified and traditional forms. */
export const HTML_LANG: Record<Locale, string> = { en: "en", zh: "zh-CN" };

/** Each written in its own language — the point of the toggle is to be
 *  legible to someone who cannot read the page they are currently on. */
export const ENDONYM: Record<Locale, string> = { en: "English", zh: "中文" };

export function other(locale: Locale): Locale {
  return locale === "en" ? "zh" : "en";
}

/** The contract carries both names on every panel and reading (ADR-0014). */
export function nameOf(x: { name_zh: string; name_en: string }, locale: Locale): string {
  return locale === "en" ? x.name_en : x.name_zh;
}

export function labelOf(
  t: { label_zh: string; label_en: string },
  locale: Locale
): string {
  return locale === "en" ? t.label_en : t.label_zh;
}

/** Units stay in the contract exactly as the source writes them, because the
 *  unit is part of the caliber. Only the display form is localised, and only
 *  where the source's own form is not already language-neutral. */
const UNIT_EN: Record<string, string> = { "万头": "10k head" };

export function unitOf(unit: string, locale: Locale): string {
  return locale === "en" ? (UNIT_EN[unit] ?? unit) : unit;
}

/** Number grouping. Both locales group in thousands here, but stating it
 *  keeps a future locale from silently inheriting zh-CN's conventions. */
export const NUMBER_LOCALE: Record<Locale, string> = { en: "en-US", zh: "zh-CN" };
