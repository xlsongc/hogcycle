/** 单个合约，以及市场以往的偏离（docs/adr/0036、0041）。 */

import type { Dict } from "../en";

export const futures: Pick<Dict, "futures"> = {
  futures: {
    contract: (delivery: string) => `LH${delivery.slice(2, 4)}${delivery.slice(5, 7)}`,
    contractHeading: "合约",
    deliveredPick: "已交割…",
    liveSum: (code: string, last: string, on: string, week: string | null, sinceFirst: string) =>
      `${code}：${on} 结算 ${last}${week ? `，较上周 ${week}` : ""}，较上市首周 ${sinceFirst}。`,
    doneSum: (
      code: string,
      final: string,
      on: string,
      far: { months: number; v: string; pct: string } | undefined
    ) =>
      `${code}：${on} 最后结算 ${final}。${far ? `交割前 ${far.months} 个月时是 ${far.v}，偏离 ${far.pct}。` : ""}`,
    whole: "2021 年以来全部合约",
    closeIn: (code: string) => `回到 ${code}`,
    finalLine: (v: string) => `最后结算 ${v}`,
    contractLabel: (code: string) => `${code} 每周结算价，与其他合约同图`,
    weeksCaption: (code: string) => `${code} 每周最后一个结算价`,
    allWeeks: (n: number) => `全部 ${n} 周`,
    download: "全部合约逐日结算价（CSV）",
    curveTable: "各交割月结算价",

    trackHeading: "市场以往偏离多少",
    trackNote: (n: number, first: string) =>
      `${first} 以来 ${n} 个已交割合约：交割前 1、3、6、9 个月的结算价，对比最后结算价。`,
    cols: {
      ahead: "提前",
      n: "合约数",
      meanAbs: "平均偏离",
      mean: "平均（带方向）",
      worst: "最大偏离",
      week: "周",
      settle: "结算价",
      onWeek: "较上周",
      vsFirst: "较上市首周",
      vsFinal: "较最后结算",
    },
    months: (m: number) => `${m} 个月`,
    signedNote: "带方向：大于零表示当时的价格高于最后结算价。",
    showContracts: "逐个合约",
    hideContracts: "收起合约",
    deliveryCol: "交割月",
    finalCol: "最后结算价",
    caption: "每个已交割合约提前若干个月时的结算价，以及它与最后结算价的偏离",
    chartLabel: (n: number) => `生猪期货：${n} 个合约，每个从上市到交割按周画出`,
    asOfHidden: "站在过去某天时不显示。",
  },
};
