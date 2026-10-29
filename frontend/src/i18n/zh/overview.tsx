/** 总览页和它的读数表。 */

import { UNIT_ZH } from "./words";
import type { Dict } from "../en";

export const overview: Pick<Dict, "overview" | "readings"> = {
  overview: {
    tickerLabel: "最新价格",
    feed: "订阅（Atom）",
    api: "数据下载与接口",
    futuresHeading: "期货曲线",
    futuresNote: (date: string) => `大商所生猪期货 ${date} 结算价，按交割月。`,
    futuresCaption: "生猪期货：各交割月的最新结算价",
    futuresMonth: "交割月",
    futuresSettle: "结算价",
    futuresWeek: "较上周",
    futuresMore: "单个合约与以往偏离",
    futuresSpread: (nearM: string, nearV: string, farM: string, farV: string, pct: number) =>
      `${farM} 合约 ${farV}，比 ${nearM}（${nearV}）${pct >= 0 ? "高" : "低"} ${Math.abs(pct)}%。`,
    futuresTrack: (six: number, signed: number, n: number) =>
      `以往交割前 6 个月的价格，与最终结算价平均相差 ${six}%，平均${signed >= 0 ? "偏高" : "偏低"} ${Math.abs(signed)}%（2021 年以来 ${n} 个合约）。`,
    thesisHeading: "产能领先价格",
    thesisNote: "能繁母猪存栏按所选月数前移，放在猪价上方对照。",
    thesisMethod: <p>滞后由生物学决定：妊娠 114 天，加上约 6 个月育肥，共 10–12 个月。</p>,
    lead: "前移",
    leadOption: (n: number) => (n ? `${n} 个月` : "不前移"),
    shifted: (n: number) => (n ? `（前移 ${n} 个月）` : ""),
    today: "今天",
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
    lede: "能繁母猪决定 10–12 个月后的供给，猪价是供给落地的地方，养殖利润决定补不补栏。",
    stamp: (asOf: string) => `数据截至 ${asOf}`,
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
        按发布日放置：发布比时期结束中位晚 <b className="num">{median}</b> 天。2021-12 以前的读数没有发布日期，不画。
      </>
    ),
    feedHeading: "最近发布",
    feedNote: "按发布日期，新的在前。",
    factsHeading: "值得留意",
  },

  readings: {
    heading: "全部读数",
    note: "图表墙上的全部序列。",
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
    overdueTitle: (period: string, by: string) => `${period}已晚于有记录以来的每一次发布（${by}）。`,
    movingBaseline: "调控基准为移动值，故不计缺口",
  },
};
