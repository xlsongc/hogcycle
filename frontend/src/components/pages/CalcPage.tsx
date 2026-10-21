/**
 * The hog margin calculator's page (docs/adr/0038). A server component: it
 * picks the few readings the calculator starts from out of the contract, so
 * the client receives five numbers and one curve rather than every panel.
 */

import type { Reading, WallContract } from "@/types/generated/wall";
import { MarginCalc, type Default } from "@/components/calc/MarginCalc";
import { nameOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

// The weight is the national average at sale; the price is the 500-county
// one because the estimated breakeven is on its caliber (ADR-0034), so the
// two defaults compare like with like.
const WEIGHT = "hog_weight";
const COST = "breakeven_price_est";
const PRICE = "hog_price_county";
const CURVE = "lh_futures_curve";

export function CalcPage({ data, locale }: { data: WallContract; locale: Locale }) {
  const t = dict(locale);
  const reading = (id: string): Default | null => {
    const r = data.readings.find((x) => x.id === id) as Reading | undefined;
    return r?.value != null ? { value: r.value, name: nameOf(r, locale), date: r.obs_date } : null;
  };
  const curve = data.panels.find((p) => p.id === CURVE)?.points ?? [];
  const six = data.market?.track_record.horizons.find((h) => h.months === 6) ?? null;

  return (
    <main className="wrap">
      <header className="page-head">
        <h1>{t.calc.heading}</h1>
        <p className="sub">{t.calc.sub}</p>
      </header>
      <MarginCalc
        locale={locale}
        weight={reading(WEIGHT)}
        cost={reading(COST)}
        price={reading(PRICE)}
        curve={curve.map((p) => ({ d: p.d, v: p.v }))}
        six={six && { mean_abs_pct: six.mean_abs_pct, mean_pct: six.mean_pct, n: six.n }}
        today={data.window.end ?? data.generated_at.slice(0, 10)}
      />
    </main>
  );
}
