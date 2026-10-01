/**
 * The fact base, gated. Forked from TIMELESS Grass & Greens (src/data/brief.ts), adapted for NoCo.
 *
 * Every business fact the site renders comes through here. A fact whose status is not renderable,
 * or which carries no source, returns null — and a component handed null renders NOTHING rather
 * than a placeholder. The hole ships; the reason sits in a source comment (use `why()`).
 *
 * Statuses (truth.py): VERIFIED · CLIENT_STATED · CLIENT_CONFIRMED · EXTERNAL_SOURCE · INFERENCE · UNKNOWN
 * INFERENCE and UNKNOWN never render, by design.
 *
 * Phone: stored in the brief as "+1 970-528-1076". check-entity.py compares raw digits, so the
 * tel: href (+19705281076), the JSON-LD telephone and the brief all read 19705281076, and the
 * printed "970-528-1076" matches on its last ten digits.
 */
import raw from '../../.site/truth/brief.json';

const RENDERABLE = new Set(['VERIFIED', 'CLIENT_STATED', 'CLIENT_CONFIRMED', 'EXTERNAL_SOURCE']);

export type Fact<T = string> = {
  value: T | null;
  status?: string;
  source?: string | null;
  source_detail?: string | null;
  date?: string | null;
  note?: string;
};

/** The value if it may render, else null. Null means: render nothing. */
export function fact<T = string>(node: Fact<T> | undefined | null): T | null {
  if (!node) return null;
  if (!RENDERABLE.has(String(node.status))) return null;
  if (node.value === null || node.value === undefined || node.value === '') return null;
  if (!node.source) return null;
  return node.value;
}

/** Why a fact is absent — for a source comment in the rendered HTML. */
export function why(node: Fact<unknown> | undefined | null): string {
  if (!node) return 'not in the fact base';
  if (!RENDERABLE.has(String(node.status))) return `status ${node.status}${node.note ? ` — ${node.note}` : ''}`;
  if (!node.source) return 'no source on file';
  return 'present';
}

/** Map a list of fact nodes to their renderable values, dropping the rest. */
export function facts<T = string>(nodes: Fact<T>[] | undefined): T[] {
  return (nodes ?? []).map((n) => fact<T>(n)).filter((v): v is T => v !== null);
}

const b = raw as any;

export const identity = b.identity ?? {};
export const location = (identity.locations ?? [])[0] ?? {};

export const businessName = fact<string>(identity.display_name);
export const legalName = fact<string>(identity.legal_name);
export const foundedYear = fact<number>(identity.founded_year);
export const phone = fact<string>(location.phone);
export const email = fact<string>(location.email);
export const socialProfiles = facts<{ network: string; url: string }>(identity.social_profiles);

/** Printed form: the national number only ("970-528-1076"). */
export const phoneDisplay = phone ? phone.replace(/^\+1[\s-]?/, '') : null;
/** E.164 tel: href — never a tracking number, never divergent from the GBP. */
export const phoneHref = phone ? `tel:+1${phone.replace(/\D/g, '').slice(-10)}` : null;

export default b;
