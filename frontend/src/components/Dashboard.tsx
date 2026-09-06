"use client";

/**
 * Holds the state both views share: the time window, the overlay selection,
 * and the lag shift.
 *
 * The window lives here rather than inside either chart because a filter is
 * supposed to scope everything below it — if the wall and the overlay could
 * disagree about the date range, two numbers on one screen would silently be
 * measuring different periods.
 */

import { useCallback, useMemo, useState } from "react";
import type { WallContract } from "@/types/generated/wall";
import { ChartWall } from "@/charts/ChartWall";
import { Overlay, type LagSpec } from "@/charts/Overlay";
import { SeriesPicker } from "./SeriesPicker";
import { TableView } from "./TableView";
import { ThemeToggle } from "./ThemeToggle";
import { MAX_OVERLAY_SERIES } from "@/charts/base/theme";

const RANGES = [
  { key: "all", label: "全部", years: null },
  { key: "8y", label: "近 8 年", years: 8 },
  { key: "3y", label: "近 3 年", years: 3 },
  { key: "1y", label: "近 1 年", years: 1 },
] as const;

// Opens on the project's own thesis rather than an empty chart: capacity
// against the price it is supposed to lead.
const DEFAULT_SELECTION = ["sow_inventory", "hog_price_index", "eq_muyuan"];

export function Dashboard({ data }: { data: WallContract }) {
  const [rangeKey, setRangeKey] = useState<string>("all");
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTION);
  const [slots, setSlots] = useState<Map<string, number>>(
    () => new Map(DEFAULT_SELECTION.map((id, i) => [id, i]))
  );
  const [lagId, setLagId] = useState<string>("");
  const [lagMonths, setLagMonths] = useState<number>(0);

  const dataEnd = data.window.end ?? new Date().toISOString().slice(0, 10);
  const dataStart = data.window.start ?? "2015-01-01";

  const [min, max] = useMemo(() => {
    const years = RANGES.find((r) => r.key === rangeKey)?.years;
    if (!years) return [dataStart, dataEnd];
    const d = new Date(dataEnd);
    d.setUTCFullYear(d.getUTCFullYear() - years);
    return [d.toISOString().slice(0, 10), dataEnd];
  }, [rangeKey, dataStart, dataEnd]);

  /** Allocating the lowest free slot on add, and freeing it on remove, is what
   *  keeps a de-selection from repainting the survivors. */
  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const has = prev.includes(id);
      if (!has && prev.length >= MAX_OVERLAY_SERIES) return prev;
      const next = has ? prev.filter((x) => x !== id) : [...prev, id];
      setSlots((old) => {
        const m = new Map(old);
        if (has) {
          m.delete(id);
        } else {
          const taken = new Set(m.values());
          let free = 0;
          while (taken.has(free)) free += 1;
          m.set(id, free);
        }
        return m;
      });
      return next;
    });
  }, []);

  const wallPanels = data.panels.filter((p) => p.in_wall !== false);
  const lag: LagSpec | null =
    lagId && lagMonths ? { id: lagId, months: lagMonths } : null;
  const full = rangeKey === "all";

  return (
    <>
      <div className="bar filters">
        <span className="filter-label">时间窗口</span>
        {RANGES.map((r) => (
          <button
            key={r.key}
            aria-pressed={rangeKey === r.key}
            onClick={() => setRangeKey(r.key)}
          >
            {r.label}
          </button>
        ))}
        <span className="hint">
          {min} → {max}
          {full ? "" : " · 同时作用于下方全部图表"}
        </span>
      </div>

      <h2 className="section">因果链图表墙</h2>
      <p className="section-note">
        物理周期本身，按 产能 → 价格 → 利润 的因果顺序排列。每格自带纵轴与单位 ——
        这不是双轴图，是小倍数，也是把 万头、元/公斤 和纯比值放上同一条时间轴的唯一诚实做法。
      </p>
      <ChartWall panels={wallPanels} min={min} max={max} />

      <h2 className="section">自选叠放</h2>
      <p className="section-note">
        任选序列压在一条时间轴上。单位一致时画原值；单位混杂时全部指数化到窗口起点，
        因为把不同量纲塞进两条纵轴会凭空造出数据里没有的相关性。股票只出现在这里 ——
        股价是对周期的索取权，不是周期的一环。
      </p>

      <SeriesPicker
        panels={data.panels}
        selected={selected}
        slots={slots}
        onToggle={toggle}
      />

      <div className="bar">
        <span className="filter-label">滞后位移</span>
        <button aria-pressed={!lagId} onClick={() => setLagId("")}>
          不位移
        </button>
        {selected.map((id) => (
          <button
            key={id}
            aria-pressed={lagId === id}
            onClick={() => {
              setLagId(id);
              if (!lagMonths) setLagMonths(12);
            }}
          >
            {data.panels.find((p) => p.id === id)?.name ?? id}
          </button>
        ))}
        {lagId && (
          <>
            <span className="filter-label">前移</span>
            {[6, 10, 12, 18].map((m) => (
              <button
                key={m}
                aria-pressed={lagMonths === m}
                onClick={() => setLagMonths(m)}
              >
                {m} 月
              </button>
            ))}
          </>
        )}
      </div>
      <p className="section-note">
        把某条序列整体前移，检验领先关系。能繁母猪前移 10–12 个月压到猪价上 ——
        生物学把这个滞后钉死了（妊娠 114 天 + 育肥 6 个月），所以对齐得上不是巧合。
        这也是判断「产能信号当时能不能叫出拐点」的第一张图。
      </p>

      <Overlay
        panels={data.panels}
        selected={selected}
        slots={slots}
        min={min}
        max={max}
        lag={lag}
      />

      <TableView panels={wallPanels} />

      <div className="bar">
        <ThemeToggle />
        <span className="hint">
          知识时点 {data.generated_at.slice(0, 10)} · 数据窗口 {dataStart} → {dataEnd}
        </span>
      </div>
    </>
  );
}
