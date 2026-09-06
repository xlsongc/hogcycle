# 12. The overlay normalises rather than adding an axis

Date: 2026-09-06 · Status: Accepted

## Context

A configurable overlay — "let me stack whichever curves I want" — collides
with the rule this project will not bend: no dual axis. The series span 万头
(~4,000), 元/公斤 (~11), 元/吨 (~2,365), a bare ratio (~4.5) and share prices.
One linear axis flattens everything but the largest into the baseline. Two
axes align arbitrarily and manufacture a correlation the data does not hold.

## Decision

Normalise, and pick the normalisation from what was selected:

| selection | treatment |
|---|---|
| all series share a unit | raw values, one axis — levels are comparable and carry meaning |
| units differ | index every series to 100 at the window start |
| indexed **and** the widest series spans more than 10x | switch to a log axis |

The mode in force is printed on the chart, never inferred by the reader.

## Consequences

- No configuration can produce a dual axis. The rule holds by construction
  rather than by discipline.
- Indexing alone was not enough: 牧原 is up ~20x since 2015 while 能繁母猪
  moved between 85 and 100, so on a linear indexed axis the sow line sat flat
  on the baseline. A log axis gives equal percentage moves equal height, which
  is what "compare relative change" means.
- Log is withheld until it is needed, since it costs a casual reader something.
- Raw mode is not a fallback but the better answer when it applies: comparing
  猪价, 白条肉 and 仔猪价 in 元/公斤 is a real comparison and the levels matter.
- The overlay is a lines form, so the eight-slot categorical order is legal
  there, unlike the small-multiples wall which caps at three. Slots are
  allocated on add and released on remove, so de-selecting one line never
  repaints the others.
- Selection is capped at eight. A ninth hue would have to be generated, and a
  generated hue is indistinguishable from an existing one under CVD.
- The lag control shifts one selected series forward by whole months. It is
  the project's thesis made interactive: 能繁母猪 +10-12 months against 猪价.
