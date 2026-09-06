import type { Reading } from "@/types/generated/wall";
import { fmt } from "@/charts/base/theme";

/**
 * Current level per series, with where it sits in its own history.
 *
 * A percentile is context, not a verdict. The tiles deliberately stop short of
 * combining them into a phase call — three cycles of history cannot support
 * one, and a confident label would be read as more than it is.
 */
export function ReadingTiles({ readings }: { readings: Reading[] }) {
  // `in_wall` is the backend's own answer to "does this describe the cycle
  // right now?", so the tiles ask it rather than re-deriving the rule here.
  // It excludes equities — a share price is a claim on the cycle, not a
  // measurement of it — and retired calibers, whose final value is history
  // and would read as a current level on a tile.
  const cycle = readings.filter((r) => r.in_wall !== false);
  return (
    <section className="tiles">
      {cycle.map((r) => (
        <div
          key={r.id}
          className="tile"
          style={{ ["--tier" as string]: `var(--${r.tier})` }}
        >
          <div className="tile-label">{r.name}</div>
          <div className="tile-value">
            {fmt(r.value, r.unit)}
            <small>{r.unit}</small>
          </div>
          <div className="tile-note">{note(r)}</div>
        </div>
      ))}
    </section>
  );
}

function note(r: Reading) {
  const where =
    r.percentile == null ? null : <>历史第 {r.percentile} 分位</>;

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
