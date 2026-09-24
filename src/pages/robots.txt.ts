/**
 * robots.txt. PRELAUNCH: disallow everything. At launch: allow search + retrieval + training
 * agents by name (being in answer engines is the point), block CCBot (training-corpus
 * collection; blocking it costs no citations), and name the sitemap.
 *
 * Roles (verified 2026-09-24 — wf2/aeo-2026.md): retrieval/search = OAI-SearchBot, ChatGPT-User,
 * Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Applebot, Bingbot, Googlebot.
 * Training = GPTBot, ClaudeBot, Applebot-Extended, Google-Extended (Gemini only — it has no effect on
 * Search or AI Overviews; that lever is Search Console's "Search generative AI" control).
 */
import type { APIRoute } from 'astro';
import { SITE, PRELAUNCH } from '../data/site';

const LAUNCH = `# NoCo Turf Co.

# --- search and retrieval agents: these fetch pages to answer live questions ---
User-agent: Googlebot
User-agent: Bingbot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Applebot
Allow: /

# --- model training: allowed (Brian benefits from being known to the models) ---
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: anthropic-ai
User-agent: Applebot-Extended
User-agent: Google-Extended
Allow: /

# --- training-corpus collection, not retrieval: blocked. costs no citations ---
User-agent: CCBot
Disallow: /

User-agent: *
Allow: /
Disallow: /.netlify/

Sitemap: ${SITE}/sitemap.xml
`;

const HOLD = `# NoCo Turf Co. — PRELAUNCH. Nothing here is meant to be indexed yet.
User-agent: *
Disallow: /
`;

export const GET: APIRoute = () => new Response(PRELAUNCH ? HOLD : LAUNCH, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
