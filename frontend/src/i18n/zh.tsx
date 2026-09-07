/**
 * 中文文案。类型来自 en.tsx —— 少一个键就是编译错误，
 * 而不是英文句子出现在中文段落里。
 *
 * 指标名不在这里：它属于指标本身，随契约一起过来（ADR-0014），
 * 因为口径就写在名字里。
 */

import type { Dict } from "./en";

export const zh: Dict = {
  meta: {
    title: "猪周期图表墙",
    description: "把猪周期的因果链放在一条共享时间轴上，供人判断，不代人判断。",
  },

  nav: {
    language: "语言",
  },

  hud: {
    panel: "监测面板",
    knownAt: "知识时点",
    local: "本地时刻",
    title: "猪周期监测",
    capacity: "产能",
    coverage: "覆盖",
    price: "价格",
    howToRead: "读法",
    from: "起",
    to: "止",
    series: "序列",
    level: "存栏",
    yoy: "同比",
    pctl: "分位",
    hint: (
      <>
        条形填充为该序列<b>自身历史分位</b>，不是绝对水平；样本不足者留空。
        本面板只读数，不判定。
      </>
    ),
    footSource: "数据源",
    footSourceValue: "农业农村部五部委联合发布 · akshare",
    footCaliber: "口径",
    footCaliberValue: "见页脚",
    footCollected: "采集",
    footCollectedValue: (
      <>
        每日 <span className="num">09:00 CST</span>
      </>
    ),
    footVerdict: "判定",
    footVerdictValue: "留给读者",
  },

  gauge: {
    noPercentile: (name: string) => `${name}：历史分位不足，样本太短`,
    percentile: (name: string, pct: number) => `${name}：历史第 ${pct} 分位`,
    now: (label: string, value: number) => `${label} 当前 ${value}`,
  },

  tiles: {
    yoy: "同比",
    noPercentile: "历史分位：样本不足",
    percentile: (pct: number) => `历史第 ${pct} 分位`,
    percentileNote: (pct: number) => <>历史第 {pct} 分位</>,
    belowBreakeven: (
      <>
        <b>低于 5:1 盈亏线</b> · 养殖亏损中
      </>
    ),
    movingBaseline: "基准为移动值，故不计缺口",
  },

  page: {
    heading: "猪周期图表墙",
    sub: (
      <>
        二十个序列，一条共享时间轴：上半部是因果链图表墙，下半部可自选叠放。
        本页只做计算与对齐，<strong>不做阶段判定</strong>
        ——可用历史约三轮周期，任何自动判定规则都会被自己的样本拟合。
      </>
    ),
    chainCapacity: "产能",
    chainToPrice: "→ 10-12 个月后 →",
    chainPrice: "价格",
    chainToMargin: "→ 减成本 →",
    chainMargin: "利润",
    chainFeedback: "→ 反馈回产能",
    chainNoise: "噪音（不改变周期）",

    footerHeading: "口径与局限",
    footer: [
      <>
        生猪成交均价与出栏均重为<b>行情宝平台成交口径</b>；外三元为
        <b>玄田数据口径</b>。两者与农业农村部 500 县集贸市场是三套不同口径的
        <b>同一个量</b>，<b>不可混入同一条曲线</b>，故各自成板。
      </>,
      <>
        猪肉零售价（36 城精瘦肉，发改委采集）测的<b>不是生猪</b>而是零售端猪肉，
        量纲相同但环节不同，天然高于出场价 —— 它和上面几条既不是同一口径，
        也不是同一个量，只在叠放里做参照。
      </>,
      <>
        能繁母猪存栏来自
        <b>农业农村部、发改委、商务部、海关总署、国家统计局联合发布</b>
        的《生猪产品数据》，每月一期。粒度即口径：2020 年及以前只有<b>年度值</b>
        （空心点）；2021-12 至 2025-10 为<b>月度值</b>，其中季末月是国家统计局调查数，
        非季末月由农业农村部定点监测的环比推算；
        <b>2026 年起公开口径改为只发季度末</b>，所以最新一段是季频。
        这不是采集变稀，是上游发布节奏变了。
      </>,
      <>
        定点屠宰量在 <b>2025 年 7 月换了口径</b>（「规模以上」扩为全部定点企业），
        绝对值随之跳升，因此拆成两条序列而<b>不接成一条</b>。旧口径已停止发布，
        标记为封存：它是历史，不是坏掉的采集，所以不出现在上方读数卡片里。
      </>,
      <>
        正常保有量是<b>移动基准</b>（4100 → 3900 → 3750 万头）。缺口或比值必须用
        当期基准，不能用今天的，故此处只列原值。
      </>,
      <>
        玉米按 <b>元/吨</b> 报价，与其余按元/公斤计价的序列量纲不同；
        利润类派生计算在 gold 层统一量纲，silver 层忠于源。
      </>,
      <>
        外三元与玉米为日频序列，上游仅保留约 1 年滚动窗口 —— 超出部分已从源头消失，
        此后深度靠每日采集向前积累。
      </>,
    ],
  },

  dashboard: {
    window: "时间窗口",
    ranges: { all: "全部", "8y": "近 8 年", "3y": "近 3 年", "1y": "近 1 年" },
    appliesBelow: " · 同时作用于下方全部图表",

    wallHeading: "因果链图表墙",
    wallNote: (
      <>
        物理周期本身，按 产能 → 价格 → 利润 的因果顺序排列。每格自带纵轴与单位 ——
        这不是双轴图，是小倍数，也是把 万头、元/公斤 和纯比值放上同一条时间轴的
        唯一诚实做法。
      </>
    ),

    overlayHeading: "自选叠放",
    overlayNote: (
      <>
        任选序列压在一条时间轴上。单位一致时画原值；单位混杂时全部指数化到窗口起点，
        因为把不同量纲塞进两条纵轴会凭空造出数据里没有的相关性。股票只出现在这里 ——
        股价是对周期的索取权，不是周期的一环。
      </>
    ),

    lag: "滞后位移",
    noLag: "不位移",
    shiftForward: "前移",
    months: (n: number) => `${n} 月`,
    lagNote: (
      <>
        把某条序列整体前移，检验领先关系。能繁母猪前移 10–12 个月压到猪价上 ——
        生物学把这个滞后钉死了（妊娠 114 天 + 育肥 6 个月），所以对齐得上不是巧合。
        这也是判断「产能信号<i>当时</i>能不能叫出拐点」的第一张图。
      </>
    ),

    stamp: (known: string, start: string, end: string) =>
      `知识时点 ${known} · 数据窗口 ${start} → ${end}`,
  },

  picker: {
    atCapTitle: (max: number) =>
      `最多同时叠放 ${max} 条 —— 再多就得生成新色相，而生成的色相在色觉缺陷下与已有色无法区分`,
    selected: (n: number, max: number) => `已选 ${n}/${max}`,
    atCap: " · 已达上限",
  },

  table: {
    show: "表格视图",
    hide: "隐藏表格",
    note: (rows: number) => `按月重采样 · 每月取最后一个观测值 · 共 ${rows} 行`,
    month: "月份",
  },

  chart: {
    noData: "此期间无数据",
    panelLabel: (name: string, unit: string, n: number) =>
      `${name}，单位 ${unit}，共 ${n} 个观测点`,
    coarse: "粗粒度",
  },

  overlay: {
    indexAxis: (log: boolean) => `指数（起点=100${log ? "，对数轴" : ""}）`,
    shifted: (months: number) => ` (前移${months}月)`,
    indexedNote: (log: boolean) => (
      <>
        所选序列单位不一致，已全部指数化到窗口起点 —— 比较的是相对涨跌，不是水平
        {log ? "。跨度超过 10 倍，已切换对数轴，使等百分比涨幅占等高" : ""}
      </>
    ),
    label: (n: number, indexed: boolean) =>
      `叠放图，${n} 条序列，${indexed ? "指数化" : "原值"}`,
  },

  theme: {
    switch: "切换主题",
    system: "跟随系统",
    light: "浅色",
    dark: "深色",
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
