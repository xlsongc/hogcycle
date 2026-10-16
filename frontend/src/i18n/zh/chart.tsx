/** 图上画的字和各页共用的名称：层级、粒度。 */

import type { Dict } from "../en";

export const chart: Pick<Dict, "chart" | "tier" | "granularity"> = {
  chart: {
    noData: "此期间无数据",
    noneNear: "该日期附近无数据",
    published: (date: string, lag: number) =>
      lag >= 0 ? `${date} 发布 · 晚 ${lag} 天` : `${date} 发布 · 提前 ${-lag} 天`,
    startsAt: (month: string) => `数据始于 ${month}`,
    datedFrom: (month: string) => `发布日期始于 ${month}`,
    undated: "源头不写发布日期，这个视图里没有它的位置",
    caliberFrom: (month: string) => `新口径始于 ${month}`,
    cadence: {
      D: "日度",
      W: "周度",
      M: "月度",
      Q: "季度",
      A: "年度",
    },
    cadenceBreak: (from: string, to: string) => `${from} → ${to}`,
    granularityName: {
      D: "日度读数",
      W: "周度读数",
      M: "月度读数",
      Q: "季度读数",
      A: "年度读数",
    },
    tierNote: {
      capacity: "产能：领先价格 10–12 个月",
      margin: "利润：决定产能变化能否持续",
      price: "价格：被预测的结果，不是驱动因素",
      noise: "噪音：短期扰动，影响股价，不改变周期",
      equity: "股票：对周期的索取权，不是周期的一环",
    },
    panelLabel: (name: string, unit: string, n: number) =>
      `${name}，单位 ${unit}，共 ${n} 个观测点`,
    keys: "左右方向键逐个读数，Home 和 End 跳到两端。",
    spoken: (value: string, unit: string, date: string, kind: string, published?: string) =>
      `${value} ${unit}，${date}，${kind}${published ? `，${published} 发布` : ""}`,
    coarse: "粗粒度",
  },

  tier: {
    capacity: "产能",
    margin: "利润",
    price: "价格",
    noise: "噪音",
    equity: "股票",
  },

  granularity: { D: "日", W: "周", M: "月", Q: "季", A: "年" },
};
