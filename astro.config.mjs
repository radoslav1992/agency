// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

import { SITE } from './src/data/site.mjs';

// Everything is prerendered at build time except `src/pages/api/contact.ts`,
// which opts out with `export const prerender = false` and runs on the Worker.
export default defineConfig({
  site: SITE.url,
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
    platformProxy: { enabled: true },
  }),
  integrations: [sitemap({ i18n: { defaultLocale: 'bg', locales: { bg: 'bg-BG', en: 'en' } } })],
  /**
   * Българският е по подразбиране и остава на корена — `/` е български,
   * `/en/` е английски. Така съществуващите адреси не се променят и нищо
   * не се пренасочва.
   */
  i18n: {
    defaultLocale: 'bg',
    locales: ['bg', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  build: { format: 'directory' },
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
});
