/** 猪市周报（docs/adr/0039）。 */

import type { Dict } from "../en";

export const week: Pick<Dict, "week"> = {
  week: {
    kicker: (year: number, n: number) => `猪市周报 · ${year} 年第 ${n} 周`,
    title: (range: string) => `本周猪市：${range}`,
    metaTitle: (year: number, n: number) => `${year} 年第 ${n} 周猪市周报`,
    metaDescription: "本周中国生猪价格、期货和官方数据发布。",
    // The days arrive as "10月24日", so no space sits between them and the
    // Chinese around them.
    open: (cut: string) => `数据截至${cut}。本周尚未结束，本期内容还会更新。`,
    closed: (end: string) => `数据截至${end}。`,
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
    share: {
      copy: "复制本周总结",
      copied: "已复制",
      copiedAll: "已复制总结和链接",
      share: "分享…",
      failed: "这个浏览器不允许自动复制，请手动选择下面的文字：",
    },
    method: (
      <p>每一期对比本周末之前已发布的数据和上周末之前已发布的数据。之后的修订不改写往期。</p>
    ),

    moves: {
      title: "本周价格",
      note: "日度和周度序列，对比一周前。",
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
      note: (on: string) => `各合约${on}结算价，对比一周前，元/吨。`,
      contract: "合约",
      settle: "结算价",
      change: "较上周",
    },

    released: {
      title: "本周发布",
      note: "本周发布的月度、季度和年度数据。",
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
      note: "根据以往发布时间推算。",
      none: "未来一周没有预计发布的数据。",
      usual: (d: string) => `通常${d}前`,
      by: (d: string) => `最晚纪录${d}`,
      overdue: "逾期",
    },

    equities: {
      title: "上市猪企",
      note: "按收盘价。",
    },

    archive: {
      title: "往期周报",
      note: "2026-09-06 起每周一期。右侧是当周生猪现货价格涨跌。",
      current: "进行中",
    },
  },
};
