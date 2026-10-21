/** 总览页和它的读数表。 */

import { UNIT_ZH } from "./words";
import type { Dict } from "../en";

export const overview: Pick<Dict, "overview" | "readings"> = {
  overview: {
    tickerLabel: "最新价格",
    feed: "订阅（Atom）",
    api: "数据下载与接口",
    futuresHeading: "期货市场给未来的定价",
    futuresNote: (date: string) =>
      `市场今天为未来各月交割的生猪出的价（${date} 结算）。这是真金白银下注的预期，不是本站的预测。`,
    futuresMethod:
      "大商所生猪期货每个在挂合约的最新结算价，按交割月排开，读自新浪的镜像。单位是交割标准品的元/吨，和上面的现货价格不是同一口径。柱子从零开始画，长短可以直接比较。",
    futuresCaption: "生猪期货：各交割月的最新结算价",
    futuresMonth: "交割月",
    futuresSettle: "结算价",
    futuresMore: "全部合约，以及 2021 年以来的主力连续",
    futuresTrack: (three: number, six: number, sixSigned: number, n: number) =>
      `这类定价以往偏离多少：交割前 3 个月，合约结算价与它最后的结算价平均相差 ${three}%；交割前 6 个月相差 ${six}%，带方向平均${sixSigned >= 0 ? "高出" : "低于"} ${Math.abs(sixSigned)}%（2021 年以来 ${n} 个已交割合约）。只是过去，而且只有几轮周期。`,
    thesisHeading: "产能领先价格",
    thesisNote: "把能繁母猪存栏前移到它变成商品猪所需的时间，放在它领先的猪价上方。",
    thesisMethod: (
      <>
        <p>这个滞后由生物学钉死在 10–12 个月（妊娠 114 天 + 育肥约 6 个月），所以位移量不是拟合出来的参数。</p>
        <p>
          两格共用一条时间轴、各自一套纵轴：<b>不是双轴图</b>。今天之后的那段前移曲线，是已经存在的产能被画在生物学让它上市的位置 —— 这是对齐，<b>不是预测</b>。
        </p>
      </>
    ),
    lead: "前移",
    leadOption: (n: number) => (n ? `${n} 个月` : "不前移"),
    shifted: (n: number) => (n ? `（前移 ${n} 个月）` : ""),
    today: "今天",
    changesNote: "管道按固定定义算出的事实：阈值上下的连续期数、多年极值、停更与逾期。没有一条是阶段判定。",
    groups: {
      runs: "阈值",
      extremes: "多年极值",
      stale: "停止更新",
      overdue: "发布逾期",
    },
    extreme: (kind: "low" | "high", since: string, all: boolean) =>
      `${all ? `序列开始（${since}）` : since}以来${kind === "low" ? "最低" : "最高"}`,
    run: (below: boolean, line: string, n: number, since: string) =>
      `自 ${since} 起连续 ${n} 期在${line}${below ? "下方" : "上方"}`,
    staleFor: (days: number, date: string) => `最后读数 ${date}，已 ${days} 天`,
    overdueFor: (period: string, by: string) =>
      `${period}尚未发布，自 ${by} 起已晚于有记录以来的每一次`,
    nothing: "按这些定义，暂无可报告的事实。",

    heading: "猪周期现在在哪",
    lede: "三个读数按因果顺序排列：能繁母猪决定 10–12 个月后的生猪供给，猪价是这批供给落地的地方，养殖利润决定养殖户还愿不愿意补栏。每个数字都注明它描述的时期和公开的日期。",
    stamp: (asOf: string) => `数据截至 ${asOf}`,
    lastRelease: (date: string) => `最近一次发布 ${date}`,
    role: {
      capacity: "领先猪价 10–12 个月",
      price: "供给落地的地方",
      margin: "决定补栏是否继续",
    },
    streak: (dir: "up" | "down", n: number, g: string) =>
      `连续 ${n} ${UNIT_ZH[g] ?? "期"}${dir === "down" ? "下降" : "上升"}`,
    change: (pct: number, since: string) => `较 ${since} ${pct > 0 ? "+" : ""}${pct}%`,
    yoy: (pct: number) => `同比 ${pct > 0 ? "+" : ""}${pct}%`,
    position: (pct: number, years: number | null) =>
      years == null ? `处于自身历史第 ${pct} 分位` : `处于自身 ${years} 年历史的第 ${pct} 分位`,
    released: (date: string, lag: number) => `${date} 发布，滞后 ${lag} 天`,
    outlook: (who: string, year: string, value: string, unit: string, date: string | null) =>
      `${who} 预测 ${year} 年末：${value} ${unit}${date ? `（${date} 发布）` : ""}`,
    releaseUnknown: "源头未注明发布日期",
    nextRelease: (period: string, usual: string) => `下一期 ${period}，通常 ${usual} 前发布`,
    nextOverdue: (period: string, by: string) =>
      `${period}已逾期：晚于有记录以来的每一次发布（${by}）`,
    staleBadge: (days: number) => `已 ${days} 天没有新数据`,
    align: "读数画在",
    alignPeriod: "它描述的时期",
    alignRelease: "它公开的那天",
    alignNote: (median: number) => (
      <>
        按发布日放置时，每个读数出现在读者第一次能用上它的位置。发布比时期结束中位晚 <b className="num">{median}</b> 天，这段时间是从生物学领先期里扣掉的。
        2021-12 以前的读数没有发布日期，这一视图里不画，也不去猜。
      </>
    ),
    feedHeading: "最近发布",
    feedNote: "周度与月度发布，按公开日期从新到旧。",
    factsHeading: "值得留意",
  },

  readings: {
    heading: "全部读数",
    note: "因果链图表墙上的每一条序列。点名称打开它在图表墙上的那一格。",
    name: "序列",
    value: "最新值",
    yoy: "同比",
    position: "历史位置",
    asOf: "日期",
    status: "状态",
    ordinal: (pct: number) => `第 ${pct} 分位`,
    span: (years: number) => `${years}年`,
    positionTitle: (pct: number, years: number | null) =>
      `在该序列自身${years == null ? "" : ` ${years} 年`}历史中的第 ${pct} 分位：0 为最低读数，100 为最高`,
    noPositionTitle: "历史太短，不计分位",
    live: "更新中",
    overdue: "逾期",
    overdueTitle: (period: string, by: string) =>
      `${period}的数尚未发布，已晚于有记录以来的每一次发布（${by}）。还不算停更。`,
    movingBaseline: "调控基准为移动值，故不计缺口",
  },
};
