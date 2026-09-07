# 14. The site speaks two languages, and names travel in the contract

Date: 2026-09-07 · Status: Accepted

Extends [ADR-0007](0007-contract-first-separation.md) (the contract is the sole
frontend/backend interface) and [ADR-0006](0006-frontend-stack.md) (static
export).

## Context

The dashboard was built in Chinese, which is the language of every source it
reads. As a portfolio piece it also has an English-reading audience, and as a
tool it has a reader who wants the caliber notes in the language the caliber
was defined in. Both audiences need the same page.

Three things had to be decided, and only the first is obvious.

## Decision

### English is the default and lives at `/`; Chinese lives at `/zh/`

Both are **prerendered as separate pages**, using two root layouts under App
Router route groups — `app/(en)/` and `app/(zh)/`. The language switch is an
ordinary link.

The alternative was one page holding both dictionaries and swapping them in
React state. It is less code and it is wrong here:

- `<html lang>` lives in the served markup. Patching it from script after load
  is invisible to a crawler and arrives after a screen reader has already begun
  pronouncing the page. A Chinese page that announces itself as English is a
  defect, not a nicety.
- Each version needs a URL that can be shared, linked and indexed.
- A link works with scripting off; the rest of a static dashboard does not,
  but the thing that chooses which language to fail in should.

The cost is a second static page — the same contract inlined twice, ~380 KB of
HTML each, and a full navigation on switch. A language switch *is* a
navigation, so that reads as correct rather than slow.

### Indicator names are contract data, not frontend copy

`config/sources.yaml` grew `name_en` beside the existing `name_zh`; the
contract carries both on every panel and reading, and `threshold` carries
`label_zh`/`label_en`. Both are **required** — a spec without an English name
fails to construct.

A translation table in TypeScript keyed by indicator id would have been less
plumbing. But the caliber lives in the name: `定点屠宰量（全口径）` and
`定点屠宰量（规模以上）` are two different measurements of the same-sounding
thing, separated by a July 2025 caliber change that stepped the level up. That
distinction is defined in the registry, enforced in the backend, and would then
have been re-stated — freely, and free to drift — in a frontend lookup table
nothing checks. Names belong to the indicator, so they travel with it.

The contract's `name` field was renamed to `name_zh` in the same change. `name`
silently meaning "the Chinese one" is exactly the sort of unstated caliber this
project refuses everywhere else.

`backend/tests/test_bilingual_names.py` guards the cheap failures: an empty
name, an English name that is a copy of the Chinese one, Han characters left in
`name_en`, and the two slaughter calibers collapsing to the same English
string.

### Units stay in the source's own form; only their display is localised

`unit` in the contract is `万头`, `CNY/kg`, `ratio` — the source's own symbol,
because the unit is part of the caliber and `fmt()` keys its digit count on it.
`unitOf()` maps it for display, and today that map has one entry
(`万头` → `10k head`). The value is never rescaled: 3,780 万头 stays 3,780, not
37.8 million, because a converted number in a bitemporal store is a number
nobody can trace back.

## Consequences

- Adding an indicator now requires an English name. That is the point.
- Adding UI copy means adding it to `i18n/en.tsx`; `zh.tsx` is typed as
  `Dict = typeof en`, so a missing key is a compile error rather than an
  English sentence appearing in a Chinese paragraph.
- The two pixel grids now switch per page. Departure Mono is drawn on 11px and
  zpix on 12px; the English page is entirely Latin, so `html:lang(en)` takes
  Departure Mono's size via the `--type` token. Setting one page at the other's
  size resamples every glyph on it.
- The CJK subset still has to cover the Chinese page. It is unchanged by this
  work — verified by checking the rendered text of both built pages against the
  shipped font's cmap — but the rule in CLAUDE.md now has two pages to hold.
- A third language would be a third route group and a third dictionary. There
  is no plan for one; the shape does not resist it.
