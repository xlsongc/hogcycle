/**
 * Every page the site publishes, in both languages, for a search engine
 * told where to look (served as /sitemap.xml under the base path).
 *
 * A project Pages site cannot have a robots.txt of its own: crawlers read
 * one only at the host's root, which belongs to the account's user site. So
 * this file is found when someone submits it (a search console), not on its
 * own; the pages link to each other anyway.
 */

import type { MetadataRoute } from "next";
import { contract } from "@/lib/contract";
import { LOCALES, PAGES, pathOf, type Locale } from "@/i18n/locale";
import { SITE, localized } from "@/lib/site";

// A static export prerenders a route handler only when told it is static.
export const dynamic = "force-static";

const data = contract;
const day = data.generated_at.slice(0, 10);

const url = (locale: Locale, rest: string) => `${SITE}${localized(locale, rest)}`;

// Each language's page is listed in its own right, naming its twin.
function entry(locale: Locale, rest: string, lastModified: string): MetadataRoute.Sitemap[number] {
  return {
    url: url(locale, rest),
    lastModified,
    alternates: { languages: { en: url("en", rest), "zh-CN": url("zh", rest) } },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const rests = [
    ...PAGES.map((p) => ({ rest: pathOf("en", p).slice(1), on: day })),
    ...data.panels.map((p) => ({ rest: `series/${p.id}/`, on: day })),
    // A finished issue's numbers do not change (ADR-0039), so its date is
    // its end.
    ...(data.weeks ?? []).map((w) => ({
      rest: `week/${w.id.toLowerCase()}/`,
      on: w.complete ? w.end : day,
    })),
  ];
  return rests.flatMap(({ rest, on }) => LOCALES.map((locale) => entry(locale, rest, on)));
}
