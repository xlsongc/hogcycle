/** 期货曲线的历史和市场以往的偏离（docs/adr/0036）。 */

import type { Dict } from "../en";

export const futures: Pick<Dict, "futures"> = {
  futures: {
    historyHeading: "市场给每个交割月的定价如何变化",
    historyNote:
      "从第一个合约 LH2109 起的每个合约，取每周最后一个结算价，从上市画到交割。一条线在它的合约结束处结束。仍在交易的合约用彩色画出。把指针移到某一周，可以读出那时的整条曲线。",
    contract: (delivery: string) => `LH${delivery.slice(2, 4)}${delivery.slice(5, 7)}`,
    trackHeading: "市场以往偏离多少",
    trackNote: (n: number, first: string) =>
      `所有已交割的合约（${n} 个，最早的在 ${first} 交割）：交割月开始前 1、3、6、9 个月时的结算价，对比合约最后的结算价。只是结算价之间的算术，不是模型。它说明市场以往偏离的幅度，不说明下一次会落在哪里。`,
    cols: {
      ahead: "提前",
      n: "合约数",
      meanAbs: "平均偏离",
      mean: "平均（带方向）",
      worst: "最大偏离",
    },
    months: (m: number) => `${m} 个月`,
    signedNote: "带方向：大于零表示市场当时的定价高于合约最后的结算价。",
    showContracts: "逐个合约",
    hideContracts: "收起合约",
    deliveryCol: "交割月",
    finalCol: "最后结算价",
    caption: "每个已交割合约提前若干个月时的结算价，以及它与最后结算价的偏离",
    chartLabel: (n: number) => `生猪期货：${n} 个合约，每个从上市到交割按周画出`,
    asOfHidden: "这份记录描述的是今天的历史，页面站在过去某一天时不显示。",
  },
};
