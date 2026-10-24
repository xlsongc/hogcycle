/**
 * The foot of every page: what the site is, where its data and code are,
 * and that none of it is advice. In the root layout, beside the nav.
 */

import Link from "next/link";
import { PAGES, pathOf, staticPath, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { BrandMark } from "./BrandMark";

const REPO = "https://github.com/xlsongc/hogcycle";

export function SiteFoot({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const f = t.foot;
  return (
    <footer className="site-foot">
      <div className="site-foot-inner">
        <div className="site-foot-about">
          <Link href={pathOf(locale, "overview")} className="brand" aria-label="hogcycle">
            <BrandMark />
            <span className="brand-word">hogcycle</span>
          </Link>
          <p className="site-foot-note">{f.about}</p>
          <p className="site-foot-note">{f.disclaimer}</p>
        </div>
        <nav aria-label={f.pages}>
          <h2>{f.pages}</h2>
          <ul>
            {PAGES.map((p) => (
              <li key={p}>
                <Link href={pathOf(locale, p)}>{t.meta.pages[p]}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2>{f.data}</h2>
          <ul>
            <li>
              <Link href={pathOf(locale, "datasets")}>{f.downloads}</Link>
            </li>
            <li>
              <a href={staticPath("/data/index.json")}>{f.index}</a>
            </li>
            <li>
              <a href={staticPath(locale === "zh" ? "/zh/feed.xml" : "/feed.xml")}>{f.feed}</a>
            </li>
            <li>
              <a href={staticPath(locale === "zh" ? "/zh/week.xml" : "/week.xml")}>{f.weekFeed}</a>
            </li>
          </ul>
        </div>
        <div>
          <h2>{f.project}</h2>
          <ul>
            <li>
              <a href={REPO} rel="noopener noreferrer">
                {f.code}
              </a>
            </li>
            <li>
              <a href={`${REPO}/tree/main/docs/adr`} rel="noopener noreferrer">
                {f.decisions}
              </a>
            </li>
            <li>
              <a href={`${REPO}/issues`} rel="noopener noreferrer">
                {f.issues}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
