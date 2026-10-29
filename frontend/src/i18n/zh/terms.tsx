/** 读者在页面上遇到的术语，就在遇到的地方解释。 */

import type { Dict } from "../en";

export const terms: Pick<Dict, "terms"> = {
  terms: {
    heading: "本页术语",
    toggle: (label: string) => `什么是${label}？`,
    items: {
      sowHerd: {
        label: "能繁母猪",
        body: "用于繁殖的母猪。它们的仔猪 10 到 12 个月后达到出栏体重，所以存栏决定那时的生猪供给。",
      },
      normalHolding: {
        label: "正常保有量",
        body: "政府设定的能繁母猪目标存栏：2023 年 2 月及以前为 4100 万头，2024-07-25 起为 3900 万头，2026-07-23 起为 3750 万头。目标会变，所以只画存栏水平。",
      },
      caliber: {
        label: "口径",
        body: "调查谁、怎么调查。调查对象一变，前后就是两条序列。",
      },
      hogCornRatio: {
        label: "猪粮比价和 5:1 线",
        body: "生猪价格除以玉米价格。5:1 线属于发改委口径；500 县比价平均低约 0.26，不画这条线。",
      },
      releaseVsPeriod: {
        label: "时期与发布日",
        body: "每个读数有两个日期：描述的时期和发布的日子。能繁母猪月度数据在月末后 20 到 59 天发布。",
      },
      hollowMarkers: {
        label: "空心点",
        body: "年度或季度读数。",
      },
    },
  },
};
