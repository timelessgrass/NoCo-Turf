/**
 * Every layer record the build can see: the shared layer files (src/data/layers/*.json) and the three
 * owner-scoped directories — guide-owned files (src/data/layers/guides/{guide-id}.json), town-owned files
 * (src/data/layers/local/{town-slug}.json, a town's own facts for its town × service pages) and community-owned
 * files (src/data/layers/communities/{town}--{community}.json, a community page's own facts) — one array.
 * Pages that look a record up by id read it here, so an owned record resolves exactly like a shared one.
 * Contract and gate: docs/CONTRACTS.md, scripts/check-layers.mjs (ids are unique across all of these files;
 * the build fails before a clash).
 * The town pages read their named layer files directly (src/components/TownData.ts), plus a town's own
 * local/ records by id only: guide-owned records never land on a town page by accident.
 */
export type LayerRecord = {
  id: string; layer: string; applies_to: string[]; fact: string; quote?: string;
  source_url: string; source_label: string; checked: string; status: string; recheck?: string;
};

const files = import.meta.glob<LayerRecord[]>(['../data/layers/*.json', '../data/layers/guides/*.json', '../data/layers/local/*.json', '../data/layers/communities/*.json'], { eager: true, import: 'default' });

export const LAYER_RECORDS: LayerRecord[] = Object.values(files).flat();
export const layerById = new Map(LAYER_RECORDS.map((r) => [r.id, r]));
/** Records that may render: VERIFIED or EXTERNAL_SOURCE. UNVERIFIED never does. */
export const LIVE_LAYER_IDS = new Set(LAYER_RECORDS.filter((r) => r.status === 'VERIFIED' || r.status === 'EXTERNAL_SOURCE').map((r) => r.id));
