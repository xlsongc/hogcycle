/**
 * The page body, in whichever language the route rendered it.
 *
 * Both locales render this same tree — one component, two prerenders — so a
 * change to the layout cannot land on one language and miss the other. Only
 * the copy differs, and it differs in exactly one place: `@/i18n`.
 */

import type { WallContract } from "@/types/generated/wall";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { ReadingTiles } from "@/components/ReadingTiles";
import { Dashboard } from "@/components/Dashboard";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Hud } from "@/components/hud/Hud";

export function Wall({ data, locale }: { data: WallContract; locale: Locale }) {
  const t = dict(locale).page;

  return (
    <main className="wrap">
      <LanguageToggle locale={locale} />

      <Hud data={data} locale={locale} />

      <header>
        <h1>{t.heading}</h1>
        <p className="sub">{t.sub}</p>
        <div className="chain">
          <span className="chip">
            <i style={{ background: "var(--capacity)" }} />
            {t.chainCapacity}
          </span>
          <span className="arrow">{t.chainToPrice}</span>
          <span className="chip">
            <i style={{ background: "var(--price)" }} />
            {t.chainPrice}
          </span>
          <span className="arrow">{t.chainToMargin}</span>
          <span className="chip">
            <i style={{ background: "var(--margin)" }} />
            {t.chainMargin}
          </span>
          <span className="arrow">{t.chainFeedback}</span>
          <span className="chip">
            <i style={{ background: "var(--noise)" }} />
            {t.chainNoise}
          </span>
        </div>
      </header>

      <ReadingTiles readings={data.readings} locale={locale} />

      <Dashboard data={data} locale={locale} />

      <footer>
        <b>{t.footerHeading}</b>
        <ul>
          {t.footer.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </footer>
    </main>
  );
}
