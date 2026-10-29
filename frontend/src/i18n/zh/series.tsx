/** 单个序列自己的页面。 */

import type { ReactNode } from "react";
import type { Dict } from "../en";

export const series: Pick<Dict, "series" | "span" | "cycles" | "units" | "seasons"> = {
  series: {
    back: "全部读数",
    publisher: "发布方",
    sourcePage: "源页面",
    noUrl: "通过接口采集，没有公开页面。",
    retired: "上游已停发，只保留历史。",
    caliberEarlier: (from: string | null, link: ReactNode) => (
      <>
        {from ? `新口径始于 ${from}。` : ""}此前：{link}。
      </>
    ),
    caliberLater: (until: string | null, link: ReactNode) => (
      <>
        {until ? `此口径止于 ${until}。` : ""}此后：{link}。
      </>
    ),
    forecast: "USDA 的估计与预测。",
    releaseForecast: "USDA 每年 4 月和 10 月修订中国数据。",
    releaseSettle: "大商所在每个交易日收盘后公布结算价。",
    ahead: (date: string, days: number) => `${date} 发布，比时期结束早 ${days} 天`,
    latest: "最新读数",
    chartHeading: "历史",
    releaseHeading: "发布",
    releaseBody: (median: number, max: number, n: number) => (
      <>
        期末后中位 <b className="num">{median}</b> 天发布，最长 <b className="num">{max}</b>{" "}
        天（共 {n} 次）。
      </>
    ),
    releaseNext: (period: string, usual: string, by: string) => (
      <>
        下一期：{period}，通常 <b className="num">{usual}</b> 前发布，过了{" "}
        <b className="num">{by}</b> 算逾期。
      </>
    ),
    releaseNone: "源头未注明发布日期。",
    revisionsHeading: "修订",
    revisionsNote: "每个时期出现过的所有数值，从早到晚。",
    revisionsNone: "从未修订。",
    cols: {
      period: "时期",
      value: "数值",
      change: "变化",
      released: "发布",
      learned: "采集",
    },
    unknown: "未注明",
    recentHeading: "最近读数",
    download: "下载 CSV",
    downloadNote: "全部读数，完整历史",
    onWall: "在图表墙上看",
    inCompare: "和其他序列对比",
    showAll: (n: number) => `全部 ${n} 个读数`,
    showRecent: "最近 12 个",
  },

  cycles: {
    heading: "周期叠放",
    intro: "填入每轮周期开始的月份，每轮从那个月起重画，起点记为 100。",
    signedNote: "这个序列会跌到零以下，按它自己的单位叠放。",
    add: "周期起点",
    addButton: "添加",
    horizon: "显示",
    tick: (m: number) => (m === 0 ? "起点" : `+${m} 月`),
    monthsIn: (m: number) => (m === 0 ? "起点" : `第 ${m} 个月`),
    legend: (month: string) => `自 ${month}`,
    remove: (month: string) => `移除自 ${month} 起的周期`,
    none: (months: string[]) => `${months.join("、")} 没有读数。`,
    bad: "起点是一个月份，写作 YYYY-MM。",
    atCap: (max: number) => `最多同时叠放 ${max} 轮。`,
    empty: "在上面添加一个起始月份，比如某轮的低谷。",
    indexAxis: "指数（每轮起点 = 100）",
    showTable: "表格视图",
    hideTable: "隐藏表格",
    monthCol: "距起点",
    caption: "每轮周期按距起点的整月排列：取离每个月最近的读数，给出指数和原单位数值。",
    label: (n: number, months: number, indexed: boolean) =>
      `周期叠放，${n} 轮，每轮 ${months} 个月，${indexed ? "以各自起点指数化" : "按序列自己的单位"}`,
  },

  seasons: {
    heading: "逐年季节对比",
    note: "最近六年各一条线，1 月到 12 月；粗线是今年。",
    month: (m: number) => `${m}月`,
    label: (years: number[]) => `逐年季节对比，每年一条线：${years.join("、")}`,
  },

  units: {
    label: "单位",
    level: "原值",
    yoy: "同比变化",
    yoypct: "同比 %",
    pct: "环比 %",
  },

  span: {
    heading: "所选区间",
    hint: "在图上拖选可放大。",
    note: (n: number) => `${n} 个读数`,
    first: "起",
    last: "止",
    change: "变化",
    high: "最高",
    low: "最低",
    noPct: "区间内有零或负值，不给百分比",
    rank: (below: number, others: number) =>
      below === 0 ? (
        <>最后一个读数是区间内最低的。</>
      ) : below === others ? (
        <>最后一个读数是区间内最高的。</>
      ) : (
        <>
          最后一个读数高于区间内其余 <b className="num">{others}</b> 个中的{" "}
          <b className="num">{below}</b> 个。
        </>
      ),
  },
};
