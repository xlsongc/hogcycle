# Zpix (最像素) — licence notice

Source: <https://github.com/SolidZORO/zpix-pixel-font> (v3.2.0)
Author: SolidZORO · <solidzoro@live.com>

`Zpix-Subset.woff2` is a subset of that font, cut to the ~754 glyphs this app
can render. The font's own name table (author, version, source URL) is kept
inside the file.

## Read this before reusing the project commercially

**Zpix is not an open-source font.** It is easy to assume it is, because it
ships next to Departure Mono here and that one *is* SIL OFL. The author's
terms, from the project README:

| Use | Price |
|---|---|
| Personal product | free |
| Education product | free |
| Commercial / business product (single) | **USD $1000** |
| Commercial / business product (multiple) | contact the author |

This repository is a personal project, which is the free case. Anyone
lifting the font out of it for a commercial product needs to buy a licence
from the author — vendoring it here does not convey one.

If that is a problem, the drop-in替代 is an OFL-licensed pixel CJK face:

- **Ark Pixel 方舟像素** — <https://github.com/TakWolf/ark-pixel-font> (OFL-1.1),
  12px, the closest match to what this design assumes
- **Fusion Pixel 缝合像素** — <https://github.com/TakWolf/fusion-pixel-font> (OFL-1.1)

Both are 12px designs, so swapping one in needs no layout change: replace the
file, rerun `frontend/scripts/subset-cjk-font.sh`, and update the `localFont`
src in `src/app/layout.tsx`.

## Regenerating the subset

Adding an indicator whose name uses a character no existing one does will make
that character fall back to a system face — visibly, since everything around
it is pixel type. Re-cut the subset when that happens:

```bash
frontend/scripts/subset-cjk-font.sh path/to/zpix.woff2
```
