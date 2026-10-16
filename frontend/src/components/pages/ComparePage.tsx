/** Compare: any series on one axis, with one of them shiftable to test a lead. */

import type { WallContract } from "@/types/generated/wall";
import { CompareView } from "@/components/compare/CompareView";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { HealthStamp } from "@/components/shell/HealthStamp";

export function ComparePage({ data, locale }: { data: WallContract; locale: Locale }) {
  const t = dict(locale);
  const start = data.window.start ?? "2015-01-01";
  const end = data.window.end ?? data.generated_at.slice(0, 10);

  return (
    <main className="wrap">
      <header>
        <h1>{t.compare.heading}</h1>
        <p className="sub">{t.compare.sub}</p>
      </header>
      <CompareView panels={data.panels} start={start} end={end} locale={locale} />
      <footer>
        <p className="hint">
          {t.window.stamp(data.generated_at.slice(0, 10), start, end)}
          {data.health && " · "}
          <HealthStamp health={data.health} locale={locale} />
        </p>
      </footer>
    </main>
  );
}
