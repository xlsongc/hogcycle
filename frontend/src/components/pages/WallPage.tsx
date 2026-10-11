/**
 * The causal-chain wall: every cycle series on one shared, zoomable time axis,
 * with the calibers and limits that govern how to read it.
 */

import type { WallContract } from "@/types/generated/wall";
import { WallView } from "@/components/wall/WallView";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

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
        <div className="chain">
          <span className="chip">
            <i style={{ background: "var(--capacity)" }} />
            {w.chainCapacity}
          </span>
          <span className="arrow">{w.chainToPrice}</span>
          <span className="chip">
            <i style={{ background: "var(--price)" }} />
            {w.chainPrice}
          </span>
          <span className="arrow">{w.chainToMargin}</span>
          <span className="chip">
            <i style={{ background: "var(--margin)" }} />
            {w.chainMargin}
          </span>
          <span className="arrow">{w.chainFeedback}</span>
          <span className="chip">
            <i style={{ background: "var(--noise)" }} />
            {w.chainNoise}
          </span>
        </div>
        <p className="section-note how-to">{w.howTo}</p>
      </header>

      <WallView panels={panels} start={start} end={end} locale={locale} />

      <footer>
        <b>{w.footerHeading}</b>
        <ul>
          {w.footer.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <p className="hint">{t.window.stamp(data.generated_at.slice(0, 10), start, end)}</p>
      </footer>
    </main>
  );
}
