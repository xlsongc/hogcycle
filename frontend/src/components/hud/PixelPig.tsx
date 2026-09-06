"use client";

/**
 * The one thing on this page that is not data.
 *
 * It is drawn on a pixel grid rather than as a smooth glyph so it sits on the
 * same lattice as Departure Mono and zpix — a vector pig would read as a logo
 * dropped onto a schematic. Monochrome for the same reason: the header is a
 * technical drawing, and the tier hues are spoken for by the palette, where
 * they carry meaning. A pink pig would be the only colour on the page that
 * means nothing.
 *
 * The turn is a real Y rotation of a flat sprite, stepped rather than smooth
 * so it advances in discrete frames like an animation cel. 18 steps of 20° is
 * chosen so the sprite never lands exactly on 90° or 270°, where a flat thing
 * has zero width and would blink out twice per revolution.
 */

// # body · o eye · = snout · space transparent. Side view, facing left, with
// the tail curl at the right — the silhouette that reads as "pig" smallest.
const PIG = [
  //          ear        tail
  "     ##       #    ",
  "    ####      ##   ",
  "  ##############   ",
  " ##############    ",
  "###o###########    ",
  "==#############    ",
  "==#############    ",
  "###############    ",
  " ##############    ",
  "  ###   ### ###    ",
  "  ###   ### ###    ",
  "  ##    ##  ##     ",
];

const W = 19;
const H = PIG.length;

// A ragged row would silently shear the sprite, and miscounting spaces in
// ASCII art is far easier than noticing the result.
if (PIG.some((r) => r.length !== W)) {
  throw new Error(`PixelPig: every row must be ${W} chars wide`);
}

type Kind = "body" | "eye" | "snout";
type Cell = { x: number; y: number; kind: Kind };

const KIND: Record<string, Kind> = { "#": "body", o: "eye", "=": "snout" };

const FILL: Record<Kind, string> = {
  body: "var(--pig-ink)",
  eye: "var(--pig-bg)",
  snout: "var(--pig-shade)",
};

const CELLS: Cell[] = [];
PIG.forEach((row, y) => {
  [...row].forEach((ch, x) => {
    const kind = KIND[ch];
    if (kind) CELLS.push({ x, y, kind });
  });
});

export function PixelPig({ scale = 5 }: { scale?: number }) {
  return (
    <div className="pig-turn" aria-hidden="true">
      <svg
        width={W * scale}
        height={H * scale}
        viewBox={`0 0 ${W} ${H}`}
        shapeRendering="crispEdges"
        role="img"
      >
        {CELLS.map((c) => (
          <rect
            key={`${c.x}-${c.y}`}
            x={c.x}
            y={c.y}
            width={1}
            height={1}
            fill={FILL[c.kind]}
          />
        ))}
      </svg>
    </div>
  );
}
