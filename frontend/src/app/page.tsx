import wall from "@/data/wall.json";
import type { WallContract } from "@/types/generated/wall";
import { ReadingTiles } from "@/components/ReadingTiles";
import { Dashboard } from "@/components/Dashboard";

// The contract is the only thing crossing the boundary. It is imported at
// build time now and will be fetched from an API later; the shape, and so
// this file, does not change. See docs/adr/0007.
const data = wall as WallContract;

export default function Page() {
  return (
    <main className="wrap">
      <header>
        <h1>猪周期图表墙</h1>
        <p className="sub">
          二十个序列，一条共享时间轴：上半部是因果链图表墙，下半部可自选叠放。
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

      <Dashboard data={data} />

      <footer>
        <b>口径与局限</b>
        <ul>
          <li>
            生猪成交均价与出栏均重为<b>行情宝平台成交口径</b>；外三元为
            <b>玄田数据口径</b>。两者与农业农村部 500 县集贸市场是三套不同口径的
            <b>同一个量</b>，<b>不可混入同一条曲线</b>，故各自成板。
          </li>
          <li>
            猪肉零售价（36 城精瘦肉，发改委采集）测的<b>不是生猪</b>而是零售端猪肉，
            量纲相同但环节不同，天然高于出场价 —— 它和上面几条既不是同一口径，
            也不是同一个量，只在叠放里做参照。
          </li>
          <li>
            能繁母猪存栏来自<b>农业农村部、发改委、商务部、海关总署、国家统计局联合发布</b>
            的《生猪产品数据》，每月一期。粒度即口径：2020 年及以前只有<b>年度值</b>
            （空心点）；2021-12 至 2025-10 为<b>月度值</b>，其中季末月是国家统计局调查数，
            非季末月由农业农村部定点监测的环比推算；<b>2026 年起公开口径改为只发季度末</b>，
            所以最新一段是季频。这不是采集变稀，是上游发布节奏变了。
          </li>
          <li>
            定点屠宰量在 <b>2025 年 7 月换了口径</b>（「规模以上」扩为全部定点企业），
            绝对值随之跳升，因此拆成两条序列而<b>不接成一条</b>。旧口径已停止发布，
            标记为封存：它是历史，不是坏掉的采集，所以不出现在上方读数卡片里。
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
