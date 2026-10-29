/** The terms a reader meets on the page, explained where they meet them. */

export const terms = {
  terms: {
    heading: "Terms on this page",
    toggle: (label: string) => `What is ${label}?`,
    items: {
      sowHerd: {
        label: "breeding sows (能繁母猪)",
        body: "Sows kept to breed. Their piglets reach slaughter weight 10 to 12 months later, so the herd sets hog supply that far ahead.",
      },
      normalHolding: {
        label: "the normal holding (正常保有量)",
        body: "The breeding herd the government targets: 41 million head to 2023-02, 39 million from 2024-07-25, 37.5 million from 2026-07-23. Only the level is drawn, since the target moves.",
      },
      caliber: {
        label: "caliber (口径)",
        body: "Who is surveyed and how. When that changes, the numbers before and after are different series.",
      },
      hogCornRatio: {
        label: "the hog-to-corn ratio and its 5:1 line",
        body: "Hog price divided by corn price. The 5:1 line belongs to the NDRC ratio; the 500-county ratio runs about 0.26 lower and has no line.",
      },
      releaseVsPeriod: {
        label: "period and release date",
        body: "Each reading has the period it describes and the day it was published. A month's sow figure comes 20 to 59 days after the month.",
      },
      hollowMarkers: {
        label: "hollow points",
        body: "Annual or quarterly readings.",
      },
    },
  },
};

export type TermId = keyof typeof terms.terms.items;
