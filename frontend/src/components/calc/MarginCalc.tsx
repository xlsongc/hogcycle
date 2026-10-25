"use client";

/**
 * The hog margin calculator (docs/adr/0038): the reader's weight, cost and
 * price in, profit per hog out — today, at each futures contract's settle,
 * and across a grid of prices and costs.
 *
 * The fields start from the site's own latest figures and say which; the
 * arithmetic is lib/margin.ts. The numbers travel in the query string, so a
 * farmer can send a calculation to a partner as a link, and the farm's own
 * numbers are kept in the reader's browser for the next visit
 * (lib/calcMemory.ts). A shared link wins over what is kept: it is someone
 * else's calculation, and mixing the two would answer neither.
 */

import { useEffect, useState, type ReactNode } from "react";
import { NUMBER_LOCALE, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { clearing, forwards, grid, parsed, perHead, toBreakeven, type Inputs } from "@/lib/margin";
import { readParams, writeParams } from "@/lib/urlState";
import { KEPT, load, save, type Kept } from "@/lib/calcMemory";
import { CurveVsCost } from "./CurveVsCost";

export type Default = { value: number; name: string; date: string };

type Props = {
  locale: Locale;
  weight: Default | null;
  cost: Default | null;
  price: Default | null;
  curve: { d: string; v: number | null }[];
  six: { mean_abs_pct: number; mean_pct: number; n: number } | null;
  today: string;
};

type Field = keyof Inputs;
const KEYS: Record<Field, string> = { weight: "w", cost: "c", price: "p", basis: "b", heads: "n" };
// Only for a contract missing a reading: the field still needs a number.
const BLANK: Inputs = { weight: 125, cost: 14, price: 12, basis: 0, heads: 100 };
const STEPS = [-2, -1, 0, 1, 2];

export function MarginCalc({ locale, weight, cost, price, curve, six, today }: Props) {
  const c = dict(locale).calc;
  const u = c.units;
  const n = (v: number, digits = 0, sign = false) =>
    v
      .toLocaleString(NUMBER_LOCALE[locale], {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
        signDisplay: sign ? "exceptZero" : "auto",
      })
      .replace(/^-/, "\u2212");

  const start: Inputs = {
    weight: weight?.value ?? BLANK.weight,
    cost: cost?.value ?? BLANK.cost,
    price: price?.value ?? BLANK.price,
    basis: 0,
    heads: BLANK.heads,
  };
  const asText = (x: Inputs) =>
    Object.fromEntries(Object.entries(x).map(([k, v]) => [k, String(v)])) as Record<Field, string>;
  const [text, setText] = useState<Record<Field, string>>(() => asText(start));
  // The kept fields this reader has typed, or that came back from last time.
  const [mine, setMine] = useState<Kept[]>([]);
  const [restored, setRestored] = useState<Kept[]>([]);

  // The prerendered page shows the defaults; a shared link's numbers, or the
  // reader's kept ones, arrive after mount, since a static page has no
  // server to read either.
  useEffect(() => {
    const q = readParams();
    const from = Object.fromEntries(
      (Object.keys(KEYS) as Field[]).flatMap((k) => {
        const v = q.get(KEYS[k]);
        return v == null ? [] : [[k, v]];
      })
    );
    if (Object.keys(from).length) {
      setText((t) => ({ ...t, ...from }));
      return;
    }
    const kept = load();
    const keys = KEPT.filter((k) => kept[k] != null);
    if (keys.length) {
      setText((t) => ({ ...t, ...kept }));
      setMine(keys);
      setRestored(keys);
    }
  }, []);

  const set = (k: Field, v: string) => {
    const next = { ...text, [k]: v };
    setText(next);
    writeParams({ [KEYS[k]]: v });
    if ((KEPT as readonly Field[]).includes(k)) {
      const fields = mine.includes(k as Kept) ? mine : [...mine, k as Kept];
      setMine(fields);
      save(Object.fromEntries(fields.map((f) => [f, next[f]])));
    }
  };
  const reset = () => {
    setText(asText(start));
    writeParams(Object.fromEntries(Object.values(KEYS).map((k) => [k, null])));
    setMine([]);
    setRestored([]);
    save({});
  };

  const x: Inputs = {
    weight: parsed(text.weight, start.weight),
    cost: parsed(text.cost, start.cost),
    price: parsed(text.price, start.price),
    basis: parsed(text.basis, 0),
    heads: parsed(text.heads, start.heads),
  };
  const head = perHead(x.weight, x.price, x.cost);
  const gap = toBreakeven(x.price, x.cost);
  const rows = forwards(curve, today, x);
  const table = grid(x, STEPS);
  const front = forwards(curve, today, { ...x, basis: 0 })[0];
  const clears = clearing(rows, x.cost);
  const todayGap = price && front ? price.value - front.local : null;

  const field = (k: Field, label: string, unit: string, note?: ReactNode) => (
    <div className="calc-field">
      <label htmlFor={`calc-${k}`}>{label}</label>
      <div className="calc-input">
        <input
          id={`calc-${k}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text[k]}
          onChange={(e) => set(k, e.target.value)}
        />
        <span>{unit}</span>
      </div>
      {note && <p className="hint">{note}</p>}
    </div>
  );

  return (
    <>
      <div className="calc">
        <form className="calc-card calc-inputs" onSubmit={(e) => e.preventDefault()}>
          <h2>{c.inputs}</h2>
          {restored.length > 0 && (
            <p className="calc-restored">
              {c.restored(restored.map((k) => c.kept[k]).join(c.listJoin))}{" "}
              <button type="button" className="link-button" onClick={reset}>
                {c.forget}
              </button>
            </p>
          )}
          {field("weight", c.weight, u.kg, weight && c.from(weight.name, `${n(weight.value)} ${u.kg}`, weight.date))}
          {field("cost", c.cost, u.perKg, cost && c.costFrom(`${n(cost.value, 2)} ${u.perKg}`, cost.date))}
          {field("price", c.price, u.perKg, price && c.from(price.name, `${n(price.value, 2)} ${u.perKg}`, price.date))}
          {field(
            "basis",
            c.basis,
            u.perKg,
            <>
              {c.basisFrom}
              {todayGap != null && front && (
                <>
                  {" "}
                  {c.basisToday(
                    `${n(price?.value ?? 0, 2)}`,
                    front.month,
                    `${n(front.local, 2)}`,
                    `${n(todayGap, 2, true)} ${u.perKg}`
                  )}{" "}
                  <button type="button" className="link-button" onClick={() => set("basis", todayGap.toFixed(2))}>
                    {c.useBasis}
                  </button>
                </>
              )}
            </>
          )}
          {field("heads", c.heads, u.head)}
          <div className="calc-actions">
            <button type="button" onClick={reset}>
              {c.reset}
            </button>
            <span className="hint">{c.share}</span>
          </div>
          <p className="hint calc-memory">{c.memory}</p>
        </form>

        <div className="calc-out">
          <section className="calc-card calc-now" aria-labelledby="calc-now-h" aria-live="polite">
            <h2 id="calc-now-h">{c.nowHeading}</h2>
            <p className="calc-big">
              <b className={head < 0 ? "num loss" : "num"}>{n(head, 0, true)}</b>
              <span>
                {u.perHead} · {c.perHead}
              </span>
            </p>
            <p className="calc-batch num">
              {n(head * x.heads, 0, true)} {u.yuan} · {c.perBatch(n(x.heads))}
            </p>
            <dl className="calc-split">
              <div>
                <dt>{c.revenue}</dt>
                <dd className="num">{n(x.weight * x.price)}</dd>
              </div>
              <div>
                <dt>{c.costHead}</dt>
                <dd className="num">{n(x.weight * x.cost)}</dd>
              </div>
            </dl>
            <p className="calc-gap">
              {gap.kg > 0
                ? c.gapUp(`${n(gap.kg, 2)} ${u.perKg}`, gap.pct == null ? "—" : `${n(gap.pct, 1)}%`)
                : c.gapDown(`${n(-gap.kg, 2)} ${u.perKg}`, gap.pct == null ? "—" : `${n(-gap.pct, 1)}%`)}
            </p>
          </section>

          <section className="calc-card" aria-labelledby="calc-fwd-h">
            <h2 id="calc-fwd-h">{c.forwardHeading}</h2>
            <p className="calc-note">{c.forwardNote}</p>
            {rows.length > 0 && (
              <>
                <p className="calc-clears">{c.clears(clears.above, rows.length, clears.first)}</p>
                <CurveVsCost
                  rows={rows}
                  cost={x.cost}
                  price={x.price}
                  n={n}
                  labels={{
                    today: c.chart.today,
                    cost: c.chart.cost,
                    summary: c.clears(clears.above, rows.length, clears.first),
                  }}
                />
              </>
            )}
            {rows.length ? (
              <div className="calc-table">
                <table>
                  <caption className="sr-only">{c.forwardCaption}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{c.cols.month}</th>
                      <th scope="col">
                        {c.cols.settle} <small>{u.perTonne}</small>
                      </th>
                      <th scope="col">
                        {c.cols.local} <small>{u.perKg}</small>
                      </th>
                      <th scope="col">
                        {c.cols.perHead} <small>{u.perHead}</small>
                      </th>
                      <th scope="col">{c.cols.batch}</th>
                      <th scope="col">{c.cols.lots}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.month}>
                        <th scope="row" className="num">
                          {r.month}
                        </th>
                        <td className="num">{n(r.settle)}</td>
                        <td className="num">{n(r.local, 2)}</td>
                        <td className={r.perHead < 0 ? "num loss" : "num gain"}>{n(r.perHead, 0, true)}</td>
                        <td className="num">{n(r.batch, 0, true)}</td>
                        <td className="num">{n(r.lots, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="hint">{c.noFutures}</p>
            )}
            {rows.length > 0 && <p className="hint">{c.lotsNote(`${n(x.heads * x.weight)} ${u.kg}`)}</p>}
            {six && <p className="hint">{c.forwardTrack(six.mean_abs_pct, six.mean_pct, six.n)}</p>}
          </section>
        </div>
      </div>

      <section className="calc-grid-section" aria-labelledby="calc-grid-h">
        <h2 className="section" id="calc-grid-h">
          {c.gridHeading}
        </h2>
        <p className="section-note">{c.gridNote}</p>
        <div className="calc-table calc-card">
          <table className="calc-grid">
            <caption className="sr-only">{c.gridCaption}</caption>
            <thead>
              <tr>
                <th scope="col">
                  {c.priceAxis} / {c.costAxis}
                </th>
                {table[0]?.cells.map((cell) => (
                  <th key={cell.cost} scope="col" className="num">
                    {n(cell.cost, 2)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.map((row, i) => (
                <tr key={row.price}>
                  <th scope="row" className="num">
                    {n(row.price, 2)}
                  </th>
                  {row.cells.map((cell, j) => (
                    <td
                      key={cell.cost}
                      className={[
                        "num",
                        cell.perHead < 0 ? "loss" : "gain",
                        STEPS[i] === 0 && STEPS[j] === 0 ? "here" : "",
                      ].join(" ")}
                    >
                      {n(cell.perHead, 0, true)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="calc-disclaimer">{c.disclaimer}</p>
      </section>
    </>
  );
}
