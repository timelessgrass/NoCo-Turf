/**
 * The differentiation gate for town pages (~/.claude/skills/site/reference/programmatic.md).
 *
 * A town page may publish only if it carries at least three substantive blocks, at least two of
 * them true only of that town (own: true), and at least one real photograph. City name in a
 * heading is not a block; a swapped phone number is not a block.
 *
 * Returns { pass, reasons[] } so the checker can print exactly what is missing — the reasons are
 * the research to-do list for that town, not a verdict on the town.
 */
export function townGate(data) {
  const reasons = [];
  const blocks = data?.blocks ?? [];
  const own = blocks.filter((b) => b.own);
  if (blocks.length < 3) reasons.push(`${blocks.length} blocks — needs ≥3 substantive blocks`);
  if (own.length < 2) reasons.push(`${own.length} town-specific (own) blocks — needs ≥2`);
  if (!data?.photo) reasons.push('no photograph — every leaf needs ≥1 real photo from Brian');
  for (const [i, b] of blocks.entries()) {
    if (!b.sources?.length && !b.layerRefs?.length && !['job', 'photo', 'review'].includes(b.kind)) {
      reasons.push(`block ${i + 1} (${b.kind}) has no source and no layer reference`);
    }
  }
  return { pass: reasons.length === 0, reasons };
}
