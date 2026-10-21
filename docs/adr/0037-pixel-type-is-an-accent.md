# 37. Pixel type is an accent; prose is set to be read

Date: 2026-10-21 · Status: Accepted

Supersedes the "two pixel grids" rule in CLAUDE.md and the font choice in
the phase-2 upgrade (docs/specs/2026-10-14-phase-2-upgrade.md). On the
owner's instruction: the site was "still not friendly to read", the pixel
face had become a constraint and should be used "only where it fits", and
the UI should look premium.

## Context

Every glyph on the site was a pixel face: Departure Mono for Latin and
numerals at 11px, zpix for Chinese at 12px. A pixel face goes soft at any
size that is not a whole multiple of the one it was drawn at, so the whole
page sat at 11–12px. Antialiasing was switched off to keep the lattice,
there was no bold, and the build failed on any other size. Body copy, long
notes and tables all read at the size of a footnote.

zpix is also not an open licence: free for personal use, USD 1,000 for a
commercial product. The owner now wants to know whether the site can earn
money, and a paid font licence before the first yuan of revenue is the
wrong order.

## Decision

- **Inter for everything a reader reads.** SIL OFL, self-hosted by
  next/font at build time, so a reader's browser never contacts Google
  (the build does, once). It has true tabular figures, so number columns
  align without a monospace face. 48 KB for the Latin subset that is
  preloaded; the other subsets load only if a page uses them.
- **Chinese comes from the reader's own system face** (PingFang SC, Hiragino
  Sans GB, Microsoft YaHei, Noto Sans SC), listed behind Inter. A CJK web
  font is several megabytes even split by range, and the system faces are
  good on every platform readers here use.
- **A type scale, not a grid.** Tokens `--text-xs` … `--text-num`
  (12, 13, 15, 17, 20, 26, 34, 40 px); body 15px at line height 1.6, 1.75 on
  the Chinese page. Weights 400–650. `check-type-scale.mjs` replaces
  `check-type-grid.mjs` and fails the build on a size that is not a token.
- **Departure Mono stays, as an accent:** the wordmark (22px, beside a mark
  of three bars in the tier hues) and the small index numbers beside section
  headings (11px). It never sets prose, and a rule that uses it must give a
  whole multiple of 11px.
- **zpix is removed:** the font, its subset script, its character list and
  the coverage check that guarded it.
- **The layout moves to the reference sites' register:** a pinned, frosted
  nav; cards with a 14px radius and a soft shadow; a 1,160px measure; a
  footer on every page with the data links and a not-advice line.
- **Answers first, method on demand.** A section heading carries a
  one-line answer; how it is built opens below it (`SectionHead`). The wall's
  long how-to moved into the same kind of disclosure. No text was cut.
- **A strip of the day's prices** under the overview heading: six readings
  with gold's own latest change, arrows in ink.
- **A true minus sign** (U+2212) in every formatted number: the hyphen
  `toLocaleString` gives sits low and short beside tabular figures.

Fixed on the way: the seasonal chart labelled its second tick January and
never showed February, because each tick took the month starting at or
before it while the ticks drift either side of the month starts.

## Consequences

- Text that names a tier still uses its `-ink` colour; the palette, its
  validation and the dark mode are unchanged.
- The pixel face no longer limits copy length or size, so long notes can be
  rewritten for readers rather than for a lattice.
- How Chinese renders depends on the reader's system. On a machine with no
  CJK font at all it falls back to whatever the browser has, as every
  Chinese site without a web font does.
- The site no longer carries a font that needs a commercial licence.
