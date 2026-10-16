/**
 * Reading a panel from the keyboard.
 *
 * A pointer reads a panel by hovering; without one the wall was a picture.
 * Focused, a panel steps through its readings with ←/→ (Home and End jump to
 * the ends, Escape lets go). Each step drives the same crosshair a pointer
 * would, and tells the rest of the group by time (pointerSync.ts), so the
 * chain can be read down one line from the keyboard too.
 */

import type { echarts } from "./echarts";
import { broadcastPointer } from "./pointerSync";

type Chart = ReturnType<typeof echarts.init>;

type Options = {
  chart: Chart;
  el: HTMLElement;
  group: string;
  /** Each plotted point's time, or null where there is nothing to read (no
   *  value, or outside the window). Indexes match the panel's points. */
  times: (number | null)[];
  /** The point the crosshair last read, by pointer or by key. */
  current: () => number | null;
  /** A step landed on a point, at this x in the chart. */
  onStep: (index: number, x: number) => void;
  onLeave: () => void;
};

export function readByKeyboard(o: Options): () => void {
  const readable = o.times.flatMap((t, i) => (t == null ? [] : [i]));

  const goTo = (i: number) => {
    const at = o.times[i];
    if (at == null) return;
    const x = o.chart.convertToPixel({ xAxisIndex: 0 }, at) as unknown as number;
    o.chart.dispatchAction({
      type: "updateAxisPointer",
      currTrigger: "mousemove",
      x,
      y: o.el.clientHeight / 2,
    });
    broadcastPointer(o.group, at, o.chart.id);
    o.onStep(i, x);
  };

  const leave = () => {
    o.chart.dispatchAction({ type: "updateAxisPointer", currTrigger: "leave" });
    broadcastPointer(o.group, null, o.chart.id);
    o.onLeave();
  };

  const onKey = (e: KeyboardEvent) => {
    if (!readable.length) return;
    const last = readable.length - 1;
    const now = o.current();
    const pos = now == null ? -1 : readable.indexOf(now);
    // The first press starts from the latest reading, which is the one the
    // panel's header already shows.
    const step: Record<string, () => number> = {
      ArrowRight: () => (pos < 0 ? last : Math.min(pos + 1, last)),
      ArrowLeft: () => (pos < 0 ? last : Math.max(pos - 1, 0)),
      Home: () => 0,
      End: () => last,
    };
    if (e.key === "Escape") {
      leave();
      return;
    }
    const next = step[e.key];
    if (!next) return;
    e.preventDefault();
    goTo(readable[next()] as number);
  };

  o.el.addEventListener("keydown", onKey);
  o.el.addEventListener("blur", leave);
  return () => {
    o.el.removeEventListener("keydown", onKey);
    o.el.removeEventListener("blur", leave);
  };
}
