/**
 * Crosshair sync across the charts of one group, by time.
 *
 * `echarts.connect()` links axis pointers by *series and data index*: each
 * connected chart is told to point at "your series n, observation k". That is
 * right for charts that plot the same rows and wrong for small multiples,
 * where every panel has its own observations at its own dates — a weekly
 * panel's observation 185 is mid-2022, and a monthly panel either has no 185
 * or has one in another year. The wall showed exactly that: a pointer on
 * 2022-07-27 put 二元母猪价格 on 2021-09-30.
 *
 * So the chart under the pointer broadcasts the pointer's *time*, and every
 * other chart in the group places its own crosshair at that time on its own
 * axis. Only the chart being hovered broadcasts, which is what stops the
 * charts from echoing each other forever.
 */

import type { echarts } from "./echarts";

type Chart = ReturnType<typeof echarts.init>;
type Detail = { at: number | null; from: string };

/** Tell every chart in a group to point at a time, or to let go (null),
 *  as the chart `from` would when hovered. The keyboard reader uses it. */
export function broadcastPointer(group: string, at: number | null, from: string): void {
  window.dispatchEvent(
    new CustomEvent<Detail>(`hogcycle:pointer:${group}`, { detail: { at, from } })
  );
}

export function syncPointer(
  chart: Chart,
  el: HTMLElement,
  group: string,
  onLeave?: () => void,
  /** A y inside this chart's plot. ECharts only places a pointer for a point
   *  its grid contains; the default suits a panel, not a 28px ruler. */
  pointY: () => number = () => el.clientHeight / 2
): () => void {
  const name = `hogcycle:pointer:${group}`;
  const send = (at: number | null) => broadcastPointer(group, at, chart.id);

  // DOM pointer events rather than zrender's: they fire before the chart's
  // own axis-pointer handling, so the very first move is already "ours".
  let hovered = false;
  const enter = () => {
    hovered = true;
  };
  const leave = () => {
    hovered = false;
    send(null);
  };
  el.addEventListener("pointerenter", enter);
  el.addEventListener("pointerleave", leave);

  const onAxis = (raw: unknown) => {
    if (!hovered) return;
    const at = (raw as { axesInfo?: { value?: number }[] }).axesInfo?.[0]?.value;
    if (at != null) send(at);
  };
  chart.on("updateAxisPointer", onAxis);

  const onRemote = (e: Event) => {
    const { at, from } = (e as CustomEvent<Detail>).detail;
    if (chart.isDisposed()) return;
    if (at == null) {
      onLeave?.();
      if (from !== chart.id) chart.dispatchAction({ type: "updateAxisPointer", currTrigger: "leave" });
      return;
    }
    if (from === chart.id) return;
    // A pixel point, not a bare value: ECharts hides the pointer when an
    // update arrives without one. Every panel shares the window and the grid
    // insets, so the same time lands on the same x in each.
    const x = chart.convertToPixel({ xAxisIndex: 0 }, at) as unknown as number;
    chart.dispatchAction({
      type: "updateAxisPointer",
      currTrigger: "mousemove",
      x,
      y: pointY(),
    });
  };
  window.addEventListener(name, onRemote);

  return () => {
    window.removeEventListener(name, onRemote);
    el.removeEventListener("pointerenter", enter);
    el.removeEventListener("pointerleave", leave);
    chart.off("updateAxisPointer", onAxis);
  };
}
