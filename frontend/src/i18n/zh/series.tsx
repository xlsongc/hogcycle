/** 单个序列自己的页面。 */

import type { ReactNode } from "react";
import type { Dict } from "../en";

export const series: Pick<Dict, "series" | "span" | "cycles" | "units" | "seasons"> = {
  series: {
    back: "全部读数",
    publisher: "发布方",
    sourcePage: "源页面",
    noUrl: "没有公开页面：通过接口采集。",
    retired: "上游已关闭这个口径，本页只保留历史。",
    caliberEarlier: (from: string | null, link: ReactNode) => (
      <>
        {from ? `新口径始于 ${from}。` : ""}此前的口径是另一个序列：{link}。
      </>
    ),
    caliberLater: (until: string | null, link: ReactNode) => (
      <>
        {until ? `此口径止于 ${until}。` : ""}此后的口径是另一个序列：{link}。
      </>
    ),
    equity: "股价是对周期的索取权，不是周期的一环，所以不在图表墙上。",
    market: "期货价格是市场用钱下注的预期，不是测量，也不是本项目的预测，所以不在图表墙上。",
    forecast: "这是 USDA 的估计与预测，不是测量，所以不放在图表墙上。",
    releaseForecast: "预测在它描述的时期结束之前发布，并随时期临近而修订。USDA 每年 4 月和 10 月设定中国的数字。",
    ahead: (date: string, days: number) => `${date} 发布，比时期结束早 ${days} 天`,
    latest: "最新读数",
    chartHeading: "历史",
    releaseHeading: "什么时候公开",
    releaseBody: (median: number, max: number, n: number) => (
      <>
        期末后中位 <b className="num">{median}</b> 天公开，最长 <b className="num">{max}</b>{" "}
        天，基于 <b className="num">{n}</b> 次有日期的发布。回测也必须等这么久。
      </>
    ),
    releaseNext: (period: string, usual: string, by: string) => (
      <>
        下一期：{period}。通常 <b className="num">{usual}</b> 前发布；过了{" "}
        <b className="num">{by}</b> 仍未发布，就比有记录以来的每一次都晚。这是从过去的发布推出的预期，不是发布日期。
      </>
    ),
    releaseNone: "源头没有注明发布日期，所以每个数值是哪天公开的并不知道。不要假设它在期末当天就公开了。",
    revisionsHeading: "修订记录",
    revisionsNote: "同一时期出现过的每个数值，按本仓库得知的先后排列。没有任何覆盖。",
    revisionsNone: "自首次记录以来没有数值变过。若有修订，会作为同一时期的第二次发布出现在这里。",
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
    downloadNote: "全分辨率、全历史；图上的日频数据经过抽稀。",
    onWall: "在因果链图表墙上查看",
    inCompare: "和其他序列对比",
    showAll: (n: number) => `显示全部 ${n} 个读数`,
    showRecent: "只显示最近 12 个",
    allNote: "每个读数都是原始分辨率，最新的在前。",
  },

  cycles: {
    heading: "周期叠放",
    intro:
      "写下每轮周期开始的月份（低谷、高峰，或任何你想对照的拐点），每轮都从那个月重画，起点指数化为 100。本页从不替你挑起点：找拐点就是在解读周期，这一步留给你。",
    signedNote: "这个序列会到零或以下，指数化没有意义，所以按它自己的单位叠放。",
    add: "周期起点",
    addButton: "添加",
    horizon: "显示",
    tick: (m: number) => (m === 0 ? "起点" : `+${m} 月`),
    monthsIn: (m: number) => (m === 0 ? "起点" : `第 ${m} 个月`),
    legend: (month: string) => `自 ${month}`,
    remove: (month: string) => `移除自 ${month} 起的周期`,
    none: (months: string[]) =>
      `${months.join("、")} 没有读数，无法从那里开始。起点从不挪到相邻的月份。`,
    bad: "起点是一个月份，写作 YYYY-MM。",
    atCap: (max: number) => `最多同时叠放 ${max} 轮。`,
    empty: "还没有选起点。在上面添加一个起始月份。",
    indexAxis: "指数（每轮起点 = 100）",
    computed: "由你的浏览器根据图上的读数计算",
    showTable: "表格视图",
    hideTable: "隐藏表格",
    monthCol: "距起点",
    caption: "每轮周期按距起点的整月排列：取离每个月最近的读数，给出指数和原单位数值。",
    label: (n: number, months: number, indexed: boolean) =>
      `周期叠放，${n} 轮，每轮 ${months} 个月，${indexed ? "以各自起点指数化" : "按序列自己的单位"}`,
  },

  seasons: {
    heading: "逐年季节对比",
    note: "最近六个自然年各画一条线，共用一条 1 月到 12 月的横轴，今年画得最粗。猪价有季节性，同样的涨跌放在 3 月和放在 11 月意思不同。只画读数本身，不画往年平均。",
    month: (m: number) => `${m}月`,
    label: (years: number[]) => `逐年季节对比，每年一条线：${years.join("、")}`,
  },

  units: {
    label: "单位",
    level: "原值",
    yoy: "同比变化",
    yoypct: "同比 %",
    pct: "环比 %",
    note: "由你的浏览器计算；一年前指离 365 天前最近、相差不超过 45 天的读数，和卡片上的同比一致",
  },

  span: {
    heading: "所选区间",
    hint: "选一个区间，或在图上拖选一段，可以看到这段时间的变化和高低点。",
    note: (n: number) => `${n} 个读数 · 由你的浏览器根据图上的点计算`,
    first: "起",
    last: "止",
    change: "变化",
    high: "最高",
    low: "最低",
    noPct: "不给百分比：区间内有零或负值",
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
