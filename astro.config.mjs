import { defineConfig } from 'astro/config';

/* Static HTML only. Retrieval agents (OAI-SearchBot, Claude-SearchBot, PerplexityBot, Bingbot)
   read the raw response, so nothing that matters may depend on client-side JavaScript.
   www + trailing slash is the one canonical form; netlify.toml 301s the others in one hop. */
export default defineConfig({
  site: 'https://www.nocoturf.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  /* The harness assigns the dev port via PORT; astro dev otherwise pins 4321. */
  server: { port: Number(process.env.PORT) || 4321 },
});
