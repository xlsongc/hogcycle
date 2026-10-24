/** 猪市周报（docs/adr/0039）。 */

import type { Dict } from "../en";

export const week: Pick<Dict, "week"> = {
  week: {
    kicker: (year: number, n: number) => `猪市周报 · ${year} 年第 ${n} 周`,
    title: (range: string) => `本周猪市：${range}`,
    metaTitle: (year: number, n: number) => `${year} 年第 ${n} 周猪市周报`,
    metaDescription: "本周中国生猪价格、期货和官方数据发布的变化，全部来自公开来源，按本站在周末时所知的数据整理。",
    // The days arrive as "10月24日", so no space sits between them and the
    // Chinese around them.
    open: (cut: string) => `数据截至${cut}。本周尚未结束，本期内容还会更新。`,
    closed: (end: string) => `本期为${end}结束时本站所知的数据。之后的修订不会改写本期。`,
    headlinePart: (name: string, value: string, delta: string | null, pct: string | null) =>
      delta == null
        ? `${name} ${value}`
        : `${name} ${value}，较上周 ${delta}${pct ? `（${pct}）` : ""}`,
    join: "；",
    stop: "。",
    noHeadline: "本周主要价格都没有新数据。",
    fromOverview: "本周",
    read: "阅读本周周报",
    prev: "上一期",
    next: "下一期",
    feed: "订阅（Atom）",
    method: (
      <>
        <p>
          每一期都是本站两个时点所知数据的差：本周末时能知道的每个序列，减去上周末时能知道的。数值从发布方发布的那天算起；来源没有注明日期的，从本站获取的那天算起。这和图表墙上"站在某天"用的是同一条规则。
        </p>
        <p>
          所以往期内容就是当时的样子：之后才修订的数字不会改写它，当时本站还没开始收录的序列就是空着，不会用今天的数据补上。所有数字都只是对已发布数值的算术，不判断涨跌意味着什么。
        </p>
      </>
    ),

    moves: {
      title: "本周价格",
      note: "每个日度和周度序列的最新读数，对比一周前的最新读数。",
    },
    cols: {
      series: "序列",
      latest: "最新",
      change: "较上周",
      range: "本周区间",
    },
    groups: {
      price: "生猪与猪肉价格",
      market: "期货",
      capacity: "仔猪",
      margin: "饲料与利润",
      noise: "其他",
    },
    revised: "修订",
    firstWeek: "首周收录",
    quietLabel: "本周无新数据：",

    curve: {
      title: "期货曲线",
      note: (on: string) => `各在市合约${on}的结算价，对比一周前。单位为元/吨（交割标准品），是市场的价格，不是本站的预测。`,
      contract: "合约",
      settle: "结算价",
      change: "较上周",
    },

    released: {
      title: "本周发布",
      note: "本周发布的月度、季度和年度数据，每条附上一期的数值。",
      none: "本周没有月度、季度或年度数据发布。",
      published: (d: string) => `${d}发布`,
      learned: (d: string) => `${d}获取，来源未注明发布日期`,
      prior: (period: string) => `对比${period}`,
      yoy: "同比",
      revisedFrom: (v: string) => `由 ${v} 修订`,
      forecast: "预测",
    },

    upcoming: {
      title: "下周预计发布",
      note: "发布日历根据各序列过去的发布时间，预计一周内会出的数据。这是预期，不是确定的日期。",
      none: "未来一周没有预计发布的数据。",
      usual: (d: string) => `通常${d}前`,
      by: (d: string) => `最晚纪录${d}`,
      overdue: "逾期",
    },

    equities: {
      title: "上市猪企",
      note: "股价，按收盘价计。股价是对周期的押注，不是对周期的测量。",
    },

    archive: {
      title: "往期周报",
      note: "自 2026-09-06 开始采集以来，每周一期，链接固定不变。每期右侧是当周生猪现货价格的涨跌。",
      current: "进行中",
    },
  },
};
