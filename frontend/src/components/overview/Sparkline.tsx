/**
 * A series' recent shape, drawn as a server-rendered SVG.
 *
 * Not ECharts: a card needs the shape and where the latest reading sits in
 * it, nothing to hover, and a canvas per card would mean three chart
 * instances and a hydration pass for a picture that never changes. The y
 * range is the window's own min to max, which is what a sparkline is for —
 * the card's numbers carry the scale.
 */

import type { Panel } from "@/types/generated/wall";
import { shiftMonths } from "@/lib/dates";

const W = 240;
const H = 48;
const PAD = 3;

type Props = { panel: Panel; end: string; years?: number; label: string };

export function Sparkline({ panel, end, years = 5, label }: Props) {
  const from = shiftMonths(end, -12 * years);
  const pts = panel.points.filter((p) => p.v != null && p.d >= from) as {
    d: string;
    v: number;
  }[];
  if (pts.length < 2) return null;

  const t0 = Date.parse(from);
  const t1 = Date.parse(end);
  const vs = pts.map((p) => p.v);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const x = (d: string) => PAD + ((Date.parse(d) - t0) / (t1 - t0)) * (W - 2 * PAD);
  const y = (v: number) => (hi === lo ? H / 2 : PAD + (1 - (v - lo) / (hi - lo)) * (H - 2 * PAD));
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.d).toFixed(1)},${y(p.v).toFixed(1)}`);
  const last = pts[pts.length - 1]!;

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
    >
      <line className="spark-base" x1={PAD} x2={W - PAD} y1={y(lo)} y2={y(lo)} />
      <path className="spark-line" d={path.join("")} vectorEffect="non-scaling-stroke" />
      <circle className="spark-dot" cx={x(last.d)} cy={y(last.v)} r={2.5} />
    </svg>
  );
}
