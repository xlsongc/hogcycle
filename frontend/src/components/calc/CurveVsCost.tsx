"use client";

/**
 * The futures curve against the reader's cost (docs/adr/0038): today's
 * price, then each contract's settle moved by the reader's basis, with the
 * cost drawn across as the line they have to clear.
 *
 * Hand-drawn SVG rather than ECharts: one line, one rule and a dozen
 * points, redrawn on every keystroke, on a page that has no other chart.
 * The SVG is drawn at its measured width so the labels stay at the type
 * scale on a phone instead of shrinking with a viewBox.
 */

import { useEffect, useRef, useState } from "react";
import type { Forward } from "@/lib/margin";

type Props = {
  rows: Forward[];
  cost: number;
  price: number;
  labels: { today: string; cost: (v: string) => string; summary: string };
  n: (v: number, digits?: number) => string;
};

const H = 220;
const PAD = { left: 46, right: 14, top: 22, bottom: 30 };

/** Three or four round values across [lo, hi]. */
function ticks(lo: number, hi: number): number[] {
  const raw = (hi - lo) / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(v);
  return out;
}

export function CurveVsCost({ rows, cost, price, labels, n }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = [
    { key: "today", label: labels.today, v: price },
    ...rows.map((r) => ({ key: r.month, label: r.month.slice(2), v: r.local })),
  ];
  const vs = [...points.map((p) => p.v), cost];
  const span = Math.max(Math.max(...vs) - Math.min(...vs), 0.5);
  const lo = Math.min(...vs) - span * 0.12;
  const hi = Math.max(...vs) + span * 0.12;

  const plotW = width - PAD.left - PAD.right;
  const slot = plotW / points.length;
  const x = (i: number) => PAD.left + slot * (i + 0.5);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  // A label every slot while they fit, every other one when they do not.
  const every = slot < 40 ? 2 : 1;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const yc = y(cost);

  // The cost's label sits at the left end of its line, above or below it,
  // on whichever side keeps clear of the first two points.
  const lead = points.slice(0, 2).map((p) => y(p.v));
  const clearance = (top: number, bottom: number) =>
    Math.min(...lead.map((py) => (py < top ? top - py : py > bottom ? py - bottom : 0)));
  const fitsBelow = yc + 18 <= H - PAD.bottom;
  const below = fitsBelow && clearance(yc + 3, yc + 18) > clearance(yc - 18, yc - 3);

  return (
    <div className="cvc" ref={host}>
      <svg width={width} height={H} role="img" aria-label={labels.summary}>
        {ticks(lo, hi).map((v) => (
          <g key={v}>
            <line className="cvc-grid" x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} />
            <text className="cvc-tick" x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end">
              {n(v, v % 1 ? 1 : 0)}
            </text>
          </g>
        ))}
        {/* Below the cost line a hog sells at a loss. */}
        <rect className="cvc-loss" x={PAD.left} y={yc} width={plotW} height={Math.max(0, H - PAD.bottom - yc)} />
        <line className="cvc-cost" x1={PAD.left} x2={width - PAD.right} y1={yc} y2={yc} />
        <text className="cvc-cost-label" x={PAD.left + 6} y={below ? yc + 15 : yc - 7}>
          {labels.cost(n(cost, 2))}
        </text>
        <path className="cvc-line" d={line} />
        {points.map((p, i) => (
          <g key={p.key}>
            <circle
              className={p.v >= cost ? "cvc-dot above" : "cvc-dot"}
              cx={x(i)}
              cy={y(p.v)}
              r={i === 0 ? 5 : 4}
            />
            {i % every === 0 && (
              <text className={i === 0 ? "cvc-x today" : "cvc-x"} x={x(i)} y={H - 10} textAnchor="middle">
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
