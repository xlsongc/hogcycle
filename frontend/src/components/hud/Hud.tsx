"use client";

/**
 * The instrument header.
 *
 * It borrows the layout language of a spacecraft panel — bracketed groups,
 * segmented gauges, a vertical scale with a marker, a plate of metadata along
 * the bottom — because that language is honest about what this page is: a set
 * of readings taken from instruments of differing reliability, presented for
 * a human to interpret. It is not a summary and it does not conclude
 * anything; the one number it puts in the middle is the series the whole
 * project exists to watch, with its own year-on-year beside it.
 *
 * Everything except the pig is read from the contract. See Gauge.tsx.
 */

import type { Reading, WallContract } from "@/types/generated/wall";
import { Bar, Group, Scale } from "./Gauge";
import { Clock } from "./Clock";
import { PixelPig } from "./PixelPig";
import { fmt } from "@/charts/base/theme";

/** The series each bracketed group shows, in causal order. Ids rather than a
 *  tier filter: the header is a hand-picked instrument panel, not an
 *  exhaustive listing, and the wall below already shows everything. */
const LEFT = ["sow_inventory", "hog_inventory", "slaughter"];
const RIGHT = ["hog_price_index", "piglet_price", "corn_price"];
const HERO = "sow_inventory";
const SCALE_OF = "hog_corn_ratio";

function pick(readings: Reading[], ids: string[]): Reading[] {
  return ids
    .map((id) => readings.find((r) => r.id === id))
    .filter((r): r is Reading => !!r);
}

export function Hud({ data }: { data: WallContract }) {
  const left = pick(data.readings, LEFT);
  const right = pick(data.readings, RIGHT);
  const hero = data.readings.find((r) => r.id === HERO);
  const ratio = data.readings.find((r) => r.id === SCALE_OF);

  const ratioPanel = data.panels.find((p) => p.id === SCALE_OF);
  const ratioValues =
    ratioPanel?.points.map((p) => p.v).filter((v): v is number => v != null) ?? [];
  const ratioMin = ratioValues.length ? Math.min(...ratioValues) : 4;
  const ratioMax = ratioValues.length ? Math.max(...ratioValues) : 10;

  return (
    <section className="hud" aria-label="监测面板">
      <div className="hud-top">
        <div className="hud-stamp">
          <span>知识时点</span>
          <b className="num">{data.generated_at.slice(0, 10)}</b>
        </div>
        <div className="hud-title" aria-hidden="true">
          <i className="ticks" />
          <span>猪 周 期 监 测</span>
          <i className="ticks" />
        </div>
        <div className="hud-stamp right">
          <span>本地时刻</span>
          <Clock />
        </div>
      </div>

      <div className="hud-body">
        <div className="hud-col">
          <Group label="产能">
            {left.map((r) => (
              <Bar key={r.id} reading={r} />
            ))}
          </Group>
          <Group label="覆盖">
            <div className="hud-kv">
              <span>起</span>
              <b className="num">{data.window.start ?? "—"}</b>
            </div>
            <div className="hud-kv">
              <span>止</span>
              <b className="num">{data.window.end ?? "—"}</b>
            </div>
            <div className="hud-kv">
              <span>序列</span>
              <b className="num">{String(data.panels.length).padStart(3, "0")}</b>
            </div>
          </Group>
        </div>

        <div className="hud-center">
          <div className="hud-frame">
            <PixelPig />
            {hero && (
              <div className="hud-readout" aria-hidden="true">
                <div>
                  <span>存栏</span>
                  <b className="num">{fmt(hero.value, hero.unit)}</b>
                </div>
                <div>
                  <span>同比</span>
                  <b className="num">{hero.yoy == null ? "—" : `${hero.yoy > 0 ? "+" : ""}${hero.yoy}%`}</b>
                </div>
                <div>
                  <span>分位</span>
                  <b className="num">
                    {hero.percentile == null
                      ? "—"
                      : String(hero.percentile).padStart(3, "0")}
                  </b>
                </div>
              </div>
            )}
          </div>
          {hero && (
            <div className="hud-tag">
              {hero.name} · {hero.obs_date}
            </div>
          )}
        </div>

        {ratio && (
          <Scale
            min={ratioMin}
            max={ratioMax}
            value={ratio.value}
            label="猪粮比价"
            unit="RATIO"
            threshold={{ value: 5, label: "5:1 盈亏线" }}
          />
        )}

        <div className="hud-col">
          <Group label="价格">
            {right.map((r) => (
              <Bar key={r.id} reading={r} />
            ))}
          </Group>
          <Group label="读法">
            <p className="hud-hint">
              条形填充为该序列<b>自身历史分位</b>，不是绝对水平；样本不足者留空。
              本面板只读数，不判定。
            </p>
          </Group>
        </div>
      </div>

      <div className="hud-foot">
        <span>
          <i>数据源</i>农业农村部五部委联合发布 · akshare
        </span>
        <span>
          <i>口径</i>见页脚
        </span>
        <span>
          <i>采集</i>每日 <span className="num">09:00 CST</span>
        </span>
        <span>
          <i>判定</i>留给读者
        </span>
      </div>
    </section>
  );
}
