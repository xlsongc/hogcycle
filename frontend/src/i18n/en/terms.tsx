/** The terms a reader meets on the page, explained where they meet them. */

export const terms = {
  terms: {
    heading: "Terms on this page",
    toggle: (label: string) => `What is ${label}?`,
    items: {
      sowHerd: {
        label: "breeding sows (能繁母猪)",
        body: "Sows kept to breed. A sow bred today gives piglets that reach slaughter weight 10 to 12 months later (114 days of gestation, then about six months of finishing), so this herd sets hog supply that far ahead. It is the one leading indicator in the cycle.",
      },
      normalHolding: {
        label: "the normal holding (正常保有量)",
        body: "The breeding herd the government aims to hold, which each release compares the herd with. It moves: 41 million head in releases to February 2023, 39 million from the 2024 Q2 release (published 2024-07-25), and 37.5 million, now called the control target, from the 2026 Q2 release (published 2026-07-23). Releases from March 2023 to May 2024 state no ratio. A gap or ratio must use the baseline in force at the time, so this site shows the level and draws no ratio.",
      },
      caliber: {
        label: "caliber (口径)",
        body: "Who is surveyed and how: the definition behind a number. When a survey changes whom it asks, the numbers before and after measure different things even when the level barely moves, so each caliber here is its own series, never joined into one line.",
      },
      hogCornRatio: {
        label: "the hog-to-corn ratio and its 5:1 line",
        body: "The hog price divided by the corn price. 5:1 is the break-even line drawn on the NDRC's ratio. It is defined on that caliber, so the 500-county ratio, which runs about 0.26 lower, is shown without it.",
      },
      releaseVsPeriod: {
        label: "period and release date",
        body: "Every reading has two dates: the period it describes and the day it was published. A month's sow figure appears 20 to 59 days after the month ends. Drawn at its period, a chart looks ahead by that much; drawn at the day it was published, each reading sits where a reader could first have used it.",
      },
      hollowMarkers: {
        label: "hollow points",
        body: "Annual or quarterly readings. They are a different kind of measurement, not a smoother sample of the monthly one, so they are always marked.",
      },
    },
  },
};

export type TermId = keyof typeof terms.terms.items;
