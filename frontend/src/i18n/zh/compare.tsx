/** 对比页、序列选择器和叠放图。 */

import type { Dict } from "../en";

export const compare: Pick<Dict, "compare" | "picker" | "overlay" | "lagScan"> = {
  compare: {
    heading: "对比",
    sub: <>任选序列放在一条时间轴上。单位不同时，全部按窗口起点指数化。</>,
    lag: "位移",
    noLag: "不位移",
    forward: "前移",
    months: (n: number) => `${n} 个月`,
    lagNote: <>把序列整体前移，看领先关系，比如能繁母猪前移 10–12 个月对照猪价。</>,
    share: "复制网址即可分享这个视图。",
    tableCaption: "图上序列的月度表，各用自己的单位：每月取最后一个观测值，只含窗口内，已计入位移。",
    tableNote: (rows: number) => `各用自己的单位，每月取最后一个读数，已计入位移 · 共 ${rows} 行`,
    undated: (names: string[]) => `按发布日放置时未画出（源头无发布日期）：${names.join("、")}。`,
    signed: (names: string[]) => `指数化时未画出（会跌到零以下）：${names.join("、")}。和同单位的序列一起选即可。`,
  },

  lagScan: {
    heading: "前移多少个月最对得上",
    against: "对照",
    basis: "比较",
    yoy: "同比变化",
    level: "原值",
    here: (k: number, r: string, n: number) => `前移 ${k} 个月时，相关系数 ${r}，基于 ${n} 个月。`,
    hereNone: (k: number) => `前移 ${k} 个月时，重叠的月份太少，算不出相关系数。`,
    best: (k: number, r: string, n: number) => `最强在 ${k} 个月：${r}，基于 ${n} 个月。`,
    note: (basis: "yoy" | "level") =>
      `0 到 24 个月逐个位移的相关系数，用月末值${basis === "yoy" ? "的同比" : ""}。历史只有大约三轮周期。`,
    tooFew: "任何位移下重叠的月份都不够（至少 24 个），算不出相关系数。",
    label: (lead: string, target: string) => `${lead} 前移 0 到 24 个月后与 ${target} 的相关系数`,
  },

  picker: {
    atCapTitle: (max: number) => `最多同时叠放 ${max} 条`,
    selected: (n: number, max: number) => `已选 ${n}/${max}`,
    atCap: " · 已达上限",
    chosen: "已选",
    find: "查找要加入的序列",
    showAll: (n: number) => `全部 ${n} 条序列`,
    hideAll: "收起列表",
    none: "没有匹配的序列。",
  },

  overlay: {
    indexAxis: (log: boolean) => `指数（起点=100${log ? "，对数轴" : ""}）`,
    shifted: (months: number) => ` (前移${months}月)`,
    indexedNote: (log: boolean) => (
      <>
        单位不同：已按窗口起点指数化{log ? "，对数轴" : ""}
      </>
    ),
    label: (n: number, indexed: boolean) =>
      `叠放图，${n} 条序列，${indexed ? "指数化" : "原值"}`,
  },
};
