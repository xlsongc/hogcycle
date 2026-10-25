/**
 * Where the site lives, and what every page tells a crawler or a chat app
 * about itself: its one address, the same page in the other language, and
 * the card a pasted link unfolds into (Open Graph, X's card).
 *
 * The address is the production one even in a local build. A canonical URL
 * or a sitemap entry describes the published page, and a preview run at
 * localhost pointing a crawler at localhost would be worse than none.
 */

import type { Metadata } from "next";
import { PATH, type Locale } from "@/i18n/locale";
import { en } from "@/i18n/en";
import { zh } from "@/i18n/zh";

export const SITE = "https://xlsongc.github.io/hogcycle";

/** For `metadataBase` in both root layouts: relative addresses in a page's
 *  metadata resolve against it, base path included. */
export const SITE_URL = new URL(`${SITE}/`);

/** The card image, one for the whole site: frontend/scripts/og-card.mjs. */
export const CARD = { url: "/og.png", width: 1200, height: 630 };

const OG_LOCALE: Record<Locale, string> = { en: "en_US", zh: "zh_CN" };
const DICT = { en, zh };

/** The page at `rest` (no language prefix, trailing slash: "week/2026-w43/",
 *  "" for the overview) in one language. */
export function localized(locale: Locale, rest: string): string {
  return `${PATH[locale]}${rest}`;
}

type PageMeta = { locale: Locale; rest: string; title: string; description: string };

/**
 * A page's whole metadata. Next merges metadata shallowly, so a page that
 * sets `alternates` or `openGraph` replaces the layout's outright; this
 * builds every field a page needs, the feeds included, in one place.
 * Every address here is relative to `SITE_URL`, which carries the base
 * path, so none of them goes through staticPath.
 */
export function pageMeta({ locale, rest, title, description }: PageMeta): Metadata {
  const t = DICT[locale];
  const feeds = locale === "zh" ? "/zh/" : "/";
  return {
    title,
    description,
    alternates: {
      canonical: localized(locale, rest),
      languages: {
        en: localized("en", rest),
        "zh-CN": localized("zh", rest),
        "x-default": localized("en", rest),
      },
      types: {
        "application/atom+xml": [
          { url: `${feeds}feed.xml`, title: t.foot.feed },
          { url: `${feeds}week.xml`, title: t.foot.weekFeed },
        ],
      },
    },
    openGraph: {
      type: "website",
      siteName: t.meta.title,
      locale: OG_LOCALE[locale],
      alternateLocale: OG_LOCALE[locale === "en" ? "zh" : "en"],
      url: localized(locale, rest),
      title,
      description,
      images: [{ ...CARD, alt: t.meta.card }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [CARD.url],
    },
  };
}
