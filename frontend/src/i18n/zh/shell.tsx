/** 各页共用的文案：外框、主题、站在某天、页脚印记。 */

import type { Dict } from "../en";

export const shell: Pick<
  Dict,
  "meta" | "nav" | "gauge" | "search" | "theme" | "health" | "asOf" | "window" | "notFound"
> = {
  meta: {
    title: "猪周期图表墙",
    description: "中国猪周期一手数据：猪价、能繁母猪、期货与养殖利润，中英双语。",
    card: "hogcycle：中国猪周期一手数据，附每周猪市周报",
    pages: {
      overview: "总览",
      week: "猪市周报",
      wall: "因果链图表墙",
      compare: "对比",
      calc: "养殖利润计算器",
      datasets: "数据与接口",
    },
  },

  nav: {
    pages: "页面",
    language: "语言",
    overview: "总览",
    week: "周报",
    wall: "因果链",
    compare: "对比",
    calc: "利润计算",
    datasets: "数据",
  },

  gauge: {
    stale: "停更",
    staleSince: (date: string, days: number) => `${date} 之后无新数据（${days} 天）`,
  },

  search: {
    open: "搜索",
    title: "查找序列（按 / 或 ⌘K）",
    label: "查找序列",
    placeholder: "中文或英文名称，或 id",
    none: "没有匹配的序列。",
    compare: "对比",
    hint: "↑↓ 移动 · 回车打开它的页面 · Esc 关闭",
  },

  theme: {
    switch: "切换主题",
    system: "跟随系统",
    light: "浅色",
    dark: "深色",
  },

  health: {
    reached: (when: string) => `最近抓取 ${when} UTC`,
    overdue: "有采集器逾期未运行：可能缺少更新的发布",
    never: "从未",
  },

  asOf: {
    label: "站在",
    clear: "回到今天",
    hint: "只显示某个过去日子之前已经发布的数据。",
    banner: (day: string) => (
      <>
        站在 <b className="num">{day}</b>：只显示那天之前已发布的数据。
      </>
    ),
    latest: "当时最新可知的读数",
    released: (date: string) => `${date} 发布`,
    learned: (date: string) => `${date} 采集（源头未注明发布日期）`,
    nothing: (day: string) => `${day} 这一天，这条序列还没有任何可知的数据。`,
    firstPublished: (date: string) => `本仓库里它最早的一次发布是 ${date}。`,
    firstLearned: (date: string) => `${date} 首次采集；源头未注明发布日期。`,
    marker: "站在此日",
    panelNone: (first: { date: string; basis: "published" | "learned" } | null) =>
      first == null
        ? "这一天还不可知"
        : first.basis === "published"
        ? `这一天还不可知：最早一次发布是 ${first.date}`
        : `这一天还不可知：${first.date} 首次采集`,
    startsAt: (month: string) => `可知的期间始于 ${month}`,
    knownFrom: "从何时可知",
  },

  window: {
    label: "时间窗口",
    ranges: { all: "全部", "8y": "近 8 年", "5y": "近 5 年", "3y": "近 3 年", "1y": "近 1 年" },
    stamp: (known: string, start: string, end: string) =>
      `知识时点 ${known} · 数据窗口 ${start} → ${end}`,
  },

  notFound: {
    title: "找不到这个页面",
    body: "地址可能打错了，或者那一期周报还没出。",
    home: "总览",
    week: "本周周报",
    data: "数据与接口",
  },
};
