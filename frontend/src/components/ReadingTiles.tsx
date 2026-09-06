import type { Reading } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";
import { litSegments } from "@/lib/segments";

/**
 * Current level per series, styled as a physical readout.
 *
 * A percentile is context, not a verdict. The tiles deliberately stop short of
 * combining them into a phase call — three cycles of history cannot support
 * one, and a confident label would be read as more than it is.
 *
 * The display treatment is not decoration for its own sake: the all-segments
 * ghost behind each value states, without a caption, that this is one reading
 * off one instrument at one moment, which is exactly the claim these numbers
 * make and no more.
 */

const SEGMENTS = 14;

export function ReadingTiles({ readings }: { readings: Reading[] }) {
  // `in_wall` is the backend's own answer to "does this describe the cycle
  // right now?", so the tiles ask it rather than re-deriving the rule here.
  // It excludes equities — a share price is a claim on the cycle, not a
  // measurement of it — and retired calibers, whose final value is history
  // and would read as a current level on a tile.
  const cycle = readings.filter((r) => r.in_wall !== false);

  return (
    <section className="tiles">
      {cycle.map((r) => {
        const text = fmt(r.value, r.unit);
        const lit = litSegments(r.percentile, SEGMENTS);

        return (
          <div
            key={r.id}
            className="tile"
            style={{ ["--tier" as string]: `var(--${r.tier})` }}
          >
            <div className="tile-label">
              <span>{r.name}</span>
              {r.yoy != null && (
                <span className="tile-yoy">
                  同比 {r.yoy > 0 ? "+" : ""}
                  {r.yoy}%
                </span>
              )}
            </div>

            <div className="tile-screen">
              <div className="tile-digits">
                {/* Same string with every digit turned to 8, so the unlit
                    segments line up exactly under the lit ones. */}
                <span className="tile-ghost" aria-hidden="true">
                  {text.replace(/\d/g, "8")}
                </span>
                {text}
                <span className="tile-unit">{r.unit}</span>
              </div>
              <div
                className="tile-bar"
                role="img"
                aria-label={
                  r.percentile == null
                    ? "历史分位：样本不足"
                    : `历史第 ${r.percentile} 分位`
                }
              >
                {Array.from({ length: SEGMENTS }, (_, i) => (
                  <i key={i} className={i < lit ? "on" : ""} />
                ))}
              </div>
            </div>

            <div className="tile-note">{note(r)}</div>
          </div>
        );
      })}
    </section>
  );
}

function note(r: Reading) {
  const where = r.percentile == null ? null : <>历史第 {r.percentile} 分位</>;

  if (r.id === "hog_corn_ratio" && r.value != null && r.value < 5) {
    return (
      <>
        <b>低于 5:1 盈亏线</b> · 养殖亏损中
      </>
    );
  }
  if (r.id === "sow_inventory") {
    // 正常保有量 is a moving baseline (4100 → 3900 → 3750). A gap computed
    // against today's target would misstate every past period, so the tile
    // shows the level and says why it stops there.
    return <>{r.obs_date} · 基准为移动值，故不计缺口</>;
  }
  return (
    <>
      {where}
      {where ? " · " : ""}
      {r.obs_date}
    </>
  );
}
