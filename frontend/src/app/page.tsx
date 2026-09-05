import wall from "@/data/wall.json";
import type { WallContract } from "@/types/generated/wall";
import { ChartWall } from "@/charts/ChartWall";
import { ReadingTiles } from "@/components/ReadingTiles";
import { TableView } from "@/components/TableView";
import { ThemeToggle } from "@/components/ThemeToggle";

// The contract is the only thing crossing the boundary. It is imported at
// build time now and will be fetched from an API later; the shape, and so
// this file, does not change. See docs/adr/0007.
const data = wall as WallContract;

export default function Page() {
  const min = data.window.start ?? data.panels[0]?.points[0]?.d ?? "2015-01-01";
  const max = data.window.end ?? new Date().toISOString().slice(0, 10);

  return (
    <main className="wrap">
      <header>
        <h1>猪周期图表墙</h1>
        <p className="sub">
          十个指标，一条共享时间轴。悬停任意日期，整条因果链同时读数。
          本页只做计算与对齐，<strong>不做阶段判定</strong>——可用历史约三轮周期，
          任何自动判定规则都会被自己的样本拟合。
        </p>
        <div className="chain">
          <span className="chip">
            <i style={{ background: "var(--capacity)" }} />
            产能
          </span>
          <span className="arrow">→ 10-12 个月后 →</span>
          <span className="chip">
            <i style={{ background: "var(--price)" }} />
            价格
          </span>
          <span className="arrow">→ 减成本 →</span>
          <span className="chip">
            <i style={{ background: "var(--margin)" }} />
            利润
          </span>
          <span className="arrow">→ 反馈回产能</span>
          <span className="chip">
            <i style={{ background: "var(--noise)" }} />
            噪音（不改变周期）
          </span>
        </div>
      </header>

      <ReadingTiles readings={data.readings} />

      <ChartWall panels={data.panels} min={min} max={max} />

      <TableView panels={data.panels} />

      <div className="bar">
        <ThemeToggle />
        <span className="hint">
          知识时点 {data.generated_at.slice(0, 10)} · 数据窗口 {min} → {max}
        </span>
      </div>

      <footer>
        <b>口径与局限</b>
        <ul>
          <li>
            生猪成交均价与出栏均重为<b>行情宝平台成交口径</b>；外三元为
            <b>玄田数据口径</b>。两者与农业农村部 500 县集贸市场是三套不同口径，
            <b>不可混入同一条曲线</b>，故各自成板。
          </li>
          <li>
            能繁母猪存栏 2015–2024 为<b>年度值</b>（空心点），2025 起为季度末与月度值
            （实心点）。季末月取国家统计局数，非季末月由农业农村部定点监测环比推算，
            两者可信度不同 —— 对本序列，粒度恰好编码了口径。
          </li>
          <li>
            正常保有量是<b>移动基准</b>（4100 → 3900 → 3750 万头）。缺口或比值必须用
            当期基准，不能用今天的，故此处只列原值。
          </li>
          <li>
            玉米按 <b>元/吨</b> 报价，与其余按元/公斤计价的序列量纲不同；
            利润类派生计算在 gold 层统一量纲，silver 层忠于源。
          </li>
          <li>
            外三元与玉米为日频序列，上游仅保留约 1 年滚动窗口 —— 超出部分已从源头消失，
            此后深度靠每日采集向前积累。
          </li>
        </ul>
      </footer>
    </main>
  );
}
