/** 各页共用的文案：外框、主题、站在某天、页脚印记。 */

import type { Dict } from "../en";

export const shell: Pick<
  Dict,
  "meta" | "nav" | "gauge" | "search" | "theme" | "health" | "asOf" | "window"
> = {
  meta: {
    title: "猪周期图表墙",
    description: "把猪周期的因果链放在一条共享时间轴上，供人判断，不代人判断。",
    pages: {
      overview: "总览",
      wall: "因果链图表墙",
      compare: "对比",
    },
  },

  nav: {
    pages: "页面",
    language: "语言",
    overview: "总览",
    wall: "因果链",
    compare: "对比",
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
    reached: (when: string) => `数据源最近一次抓取 ${when} UTC`,
    overdue: "有采集器逾期未运行：可能缺少更新的发布",
    never: "从未",
  },

  asOf: {
    label: "站在",
    clear: "回到今天",
    hint: "选一个过去的日子，只看那天能知道的数据。有发布日期的，从发布方公开那天算；源头没写发布日期的，从本仓库获知那天算，绝不按「通常滞后」去推。",
    banner: (day: string) => (
      <>
        站在 <b className="num">{day}</b>：只显示那天能知道的数据。连续涨跌、多年极值、历史分位和同比描述的是今天的序列，这里不显示。
      </>
    ),
    latest: "当时最新可知的读数",
    released: (date: string) => `${date} 发布`,
    learned: (date: string) => `源头没写发布日期；本仓库 ${date} 获知`,
    nothing: (day: string) => `${day} 这一天，这条序列还没有任何可知的数据。`,
    firstPublished: (date: string) => `本仓库里它最早的一次发布是 ${date}。`,
    firstLearned: (date: string) =>
      `源头不写发布日期，本仓库 ${date} 才首次获知。发布日期从不推算，所以此前不显示。`,
    marker: "站在此日",
    panelNone: (first: { date: string; basis: "published" | "learned" } | null) =>
      first == null
        ? "这一天还不可知"
        : first.basis === "published"
        ? `这一天还不可知：最早一次发布是 ${first.date}`
        : `这一天还不可知：源头没写发布日期，本仓库 ${first.date} 首次获知`,
    startsAt: (month: string) => `可知的期间始于 ${month}`,
    knownFrom: "从何时可知",
    overviewLink: "看某个过去日子里的因果链图表墙",
  },

  window: {
    label: "时间窗口",
    ranges: { all: "全部", "8y": "近 8 年", "5y": "近 5 年", "3y": "近 3 年", "1y": "近 1 年" },
    stamp: (known: string, start: string, end: string) =>
      `知识时点 ${known} · 数据窗口 ${start} → ${end}`,
  },
};
