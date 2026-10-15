/**
 * A tier's two colours, as custom properties for an element and its
 * children: the hue for marks (lines, swatches, rules) and its -ink twin for
 * text, which is darkened to clear WCAG AA where the hue alone does not.
 *
 * var() references rather than resolved colours, so the server and the
 * client render the same attribute and the theme toggle needs no re-render
 * (docs/adr/0019).
 */

import type { CSSProperties } from "react";
import type { Panel } from "@/types/generated/wall";

export function tierVars(tier: Panel["tier"]): CSSProperties {
  return {
    ["--tier" as string]: `var(--${tier})`,
    ["--tier-ink" as string]: `var(--${tier}-ink)`,
  };
}
