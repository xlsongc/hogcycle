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

/** The site's pages. Each is prerendered once per locale, so a page is a
 *  (locale, page) pair and every one of them has its own shareable URL. */
export type Page = "overview" | "week" | "wall" | "compare" | "calc" | "datasets";

export const PAGES: readonly Page[] = [
  "overview",
  "week",
  "wall",
  "compare",
  "calc",
  "datasets",
] as const;

const SLUG: Record<Page, string> = {
  overview: "",
  week: "week/",
  wall: "wall/",
  compare: "compare/",
  calc: "calc/",
  datasets: "datasets/",
};

/** Trailing slash included: GitHub Pages serves /wall/ as /wall/index.html,
 *  and next.config sets trailingSlash for the same reason. */
export function pathOf(locale: Locale, page: Page): string {
  return PATH[locale] + SLUG[page];
}

/** Which nav page a pathname is, from either locale, or null for a page the
 *  nav does not list (a series page). `usePathname` already has the basePath
 *  removed, so this only has to strip the language prefix. A past week's
 *  issue sits under the weekly page, and counts as it. */
export function pageOf(pathname: string): Page | null {
  const rest = pathname.replace(/^\/zh(?=\/|$)/, "").replace(/\/+$/, "");
  if (rest === "") return "overview";
  return (
    PAGES.find((p) => {
      const slug = SLUG[p].slice(0, -1);
      return slug && (rest === `/${slug}` || rest.startsWith(`/${slug}/`));
    }) ?? null
  );
}

/** A series' own page. Every series name on the site links here. */
export function seriesPath(locale: Locale, id: string): string {
  return `${PATH[locale]}series/${id}/`;
}

/** One week's issue of the digest (docs/adr/0039), by its ISO week id. */
export function weekPath(locale: Locale, id: string): string {
  return `${PATH[locale]}week/${id.toLowerCase()}/`;
}

/** The same page in another language: swap the prefix, keep the rest. */
export function inLocale(pathname: string, locale: Locale): string {
  const rest = pathname.replace(/^\/zh(?=\/|$)/, "") || "/";
  const path = rest.endsWith("/") ? rest : `${rest}/`;
  return locale === "zh" ? `/zh${path}` : path;
}

/** A file under public/, with the deploy's base path. Next adds it to <Link>
 *  and assets on its own, but not to a plain download link. */
export function staticPath(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}

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
const UNIT_DISPLAY: Record<Locale, Record<string, string>> = {
  en: { "万头": "10k head", "万吨": "10k t", "CNY/head": "CNY/head", ratio: ": 1", "1000 head": "1,000 head", "1000 t CWE": "1,000 t CWE" },
  zh: {
    "CNY/kg": "元/公斤",
    "CNY/tonne": "元/吨",
    "CNY/head": "元/头",
    CNY: "元",
    kg: "公斤",
    ratio: ": 1",
    "1000 head": "千头",
    "1000 t CWE": "千吨（胴体当量）",
  },
};

export function unitOf(unit: string, locale: Locale): string {
  return UNIT_DISPLAY[locale][unit] ?? unit;
}

/** Number grouping. Both locales group in thousands here, but stating it
 *  keeps a future locale from silently inheriting zh-CN's conventions. */
export const NUMBER_LOCALE: Record<Locale, string> = { en: "en-US", zh: "zh-CN" };
