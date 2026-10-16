/**
 * When the sources were last reached (docs/adr/0023), beside the data's own
 * dates. "Knowledge as of" alone cannot tell a quiet week from a collector
 * that has stopped. The oldest group is the one quoted: the page is only as
 * fresh as its slowest source. Each group's own time is in the title.
 */

import type { Health } from "@/types/generated/wall";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

function minute(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

export function HealthStamp({ health, locale }: { health?: Health | null; locale: Locale }) {
  if (!health?.groups.length) return null;
  const h = dict(locale).health;
  const times = health.groups.map((g) => g.latest);
  const oldest = times.includes(null) ? null : [...(times as string[])].sort()[0] ?? null;
  const silent = health.groups.some((g) => g.silent);
  const detail = health.groups
    .map((g) => `${g.group} ${g.latest ? minute(g.latest) : h.never}`)
    .join(" · ");
  return (
    <span title={detail}>
      {h.reached(oldest ? minute(oldest) : h.never)}
      {silent && <span className="stale-tag long">{h.overdue}</span>}
    </span>
  );
}
