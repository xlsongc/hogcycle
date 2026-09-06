#!/usr/bin/env bash
# Cut a CJK pixel font down to the glyphs this app can actually render.
#
# A full CJK face is ~1 MB of woff2, which is most of the page weight for a
# static dashboard. Everything Chinese here comes from three places — the
# frontend source, the indicator registry, and the exported contract — so the
# set is closed and small (~750 glyphs, ~30 KB).
#
# Run this after adding UI copy or an indicator whose name uses a new
# character. A character outside the subset falls back to a system face,
# which is conspicuous when everything around it is pixel type.
#
#   frontend/scripts/subset-cjk-font.sh ~/Downloads/zpix.woff2
#
# Needs fonttools with brotli:  pip install "fonttools[woff]" brotli
set -euo pipefail

SRC="${1:-}"
if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "usage: $0 <source-font.woff2|.ttf>" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="$ROOT/frontend/src/fonts/Zpix-Subset.woff2"
CHARS="$(mktemp)"
trap 'rm -f "$CHARS"' EXIT

python3 - "$ROOT" "$CHARS" <<'PY'
import pathlib, sys
root, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
chars = set()
for p in [
    *(root / "frontend/src").rglob("*.tsx"),
    *(root / "frontend/src").rglob("*.ts"),
    *(root / "frontend/src").rglob("*.css"),
    root / "config/sources.yaml",
    root / "frontend/src/data/wall.json",
]:
    if p.exists():
        chars |= set(p.read_text(encoding="utf-8"))
cjk = {c for c in chars if any(a <= ord(c) <= b for a, b in (
    (0x3000, 0x303F), (0x4E00, 0x9FFF), (0xFF00, 0xFFEF), (0x2010, 0x203F)))}
# ASCII plus the few marks the instrument panel draws with.
extra = {chr(c) for c in range(0x20, 0x7F)} | set("◀▲▼·—　")
out.write_text("".join(sorted(cjk | extra)), encoding="utf-8")
print(f"{len(cjk)} CJK + {len(extra)} other = {len(cjk | extra)} glyphs", file=sys.stderr)
PY

# Name records are kept on purpose: they carry the font's author, version and
# source URL, and Zpix is not an open-source licence. See Zpix-NOTICE.md.
pyftsubset "$SRC" \
  --text-file="$CHARS" \
  --output-file="$OUT" \
  --flavor=woff2 \
  --layout-features='' \
  --no-hinting \
  --desubroutinize \
  --notdef-outline

printf 'wrote %s (%s KB)\n' "$OUT" "$(( $(wc -c < "$OUT") / 1024 ))"
