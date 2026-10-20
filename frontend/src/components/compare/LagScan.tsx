"use client";

/**
 * The lag scan under the overlay: for the shifted series against another
 * one, the correlation at every shift from 0 to 24 months (lib/leadLag.ts).
 * The slider says "try 10"; this says how 10 compares with every other
 * choice. Signed bars around a zero line, the reader's lag outlined, the
 * strongest named. A description of this history, said as such.
 */

import { useMemo, useState } from "react";
import type { Panel } from "@/types/generated/wall";
import { MAX_LAG, scan, strongest, type Basis } from "@/lib/leadLag";
import { nameOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

type Props = { lead: Panel; targets: Panel[]; months: number; locale: Locale };

const W = 25 * 18;
const H = 120;
const MID = H / 2;

export function LagScan({ lead, targets, months, locale }: Props) {
  const t = dict(locale).lagScan;
  const [targetId, setTargetId] = useState<string | null>(null);
  const [basis, setBasis] = useState<Basis>("yoy");
  const target = targets.find((p) => p.id === targetId) ?? targets[0];
  const rs = useMemo(
    () => (target ? scan(lead.points, target.points, basis) : []),
    [lead, target, basis]
  );
  if (!target) return null;
  const best = strongest(rs);
  const here = rs[months];
  const step = W / (MAX_LAG + 1);
  const r2 = (r: number) => r.toFixed(2);

  return (
    <section className="lag-scan" aria-labelledby="lag-scan-h">
      <h2 className="section" id="lag-scan-h">
        {t.heading}
      </h2>
      <div className="bar">
        <span className="filter-label">{t.against}</span>
        {targets.map((p) => (
          <button key={p.id} aria-pressed={p.id === target.id} onClick={() => setTargetId(p.id)}>
            {nameOf(p, locale)}
          </button>
        ))}
        <span className="filter-label bar-gap">{t.basis}</span>
        <button aria-pressed={basis === "yoy"} onClick={() => setBasis("yoy")}>
          {t.yoy}
        </button>
        <button aria-pressed={basis === "level"} onClick={() => setBasis("level")}>
          {t.level}
        </button>
      </div>
      {best ? (
        <>
          <p aria-live="polite">
            {here?.r != null ? t.here(months, r2(here.r), here.n) : t.hereNone(months)}{" "}
            {t.best(best.k, r2(best.r as number), best.n)}
          </p>
          <svg
            className="lag-bars"
            viewBox={`0 0 ${W} ${H + 18}`}
            role="img"
            aria-label={t.label(nameOf(lead, locale), nameOf(target, locale))}
          >
            <line x1={0} x2={W} y1={MID} y2={MID} className="lag-zero" />
            {rs.map(({ k, r }) => {
              if (r == null) return null;
              const h = Math.abs(r) * (MID - 4);
              return (
                <rect
                  key={k}
                  x={k * step + 3}
                  width={step - 6}
                  y={r >= 0 ? MID - h : MID}
                  height={Math.max(h, 1)}
                  className={k === months ? "lag-bar here" : k === best.k ? "lag-bar best" : "lag-bar"}
                />
              );
            })}
            {rs
              .filter(({ k }) => k % 3 === 0)
              .map(({ k }) => (
                <text key={k} x={k * step + step / 2} y={H + 14} className="lag-tick num">
                  {k}
                </text>
              ))}
          </svg>
          <p className="hint">{t.note(basis)}</p>
        </>
      ) : (
        <p className="hint">{t.tooFew}</p>
      )}
    </section>
  );
}
