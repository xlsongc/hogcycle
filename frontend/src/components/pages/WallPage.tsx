/**
 * The causal-chain wall: every cycle series on one shared, zoomable time axis,
 * with the calibers and limits that govern how to read it.
 */

import type { WallContract } from "@/types/generated/wall";
import { WallView } from "@/components/wall/WallView";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { Term } from "@/components/Term";
import { Glossary } from "@/components/Glossary";
import { HealthStamp } from "@/components/shell/HealthStamp";

export function WallPage({ data, locale }: { data: WallContract; locale: Locale }) {
  const t = dict(locale);
  const w = t.wall;
  const panels = data.panels.filter((p) => p.in_wall !== false);
  const start = data.window.start ?? "2015-01-01";
  const end = data.window.end ?? data.generated_at.slice(0, 10);

  return (
    <main className="wrap">
      <header>
        <h1>{w.heading}</h1>
        <p className="sub">{w.sub(panels.length)}</p>
        <details className="method how-to">
          <summary>{t.more.howTo}</summary>
          <div>
            <p>{w.howTo}</p>
          </div>
        </details>
        <Glossary
          ids={["sowHerd", "normalHolding", "caliber", "hogCornRatio", "releaseVsPeriod", "hollowMarkers"]}
          locale={locale}
        />
      </header>

      <WallView
        panels={panels}
        start={start}
        end={end}
        today={data.generated_at.slice(0, 10)}
        locale={locale}
      />

      <footer>
        <b>{w.footerHeading}</b>
        <Term id="caliber" locale={locale} />
        <ul>
          {w.footer.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <p className="hint">
          {t.window.stamp(data.generated_at.slice(0, 10), start, end)}
          {data.health && " · "}
          <HealthStamp health={data.health} locale={locale} />
        </p>
      </footer>
    </main>
  );
}
