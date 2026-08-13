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
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'bg', locales: { bg: 'bg-BG', en: 'en' } },
      /**
       * Интеграцията изписва двойките за двата езика, но не и `x-default`.
       * Той стои в `<head>` на всяка преведена страница и ако липсва тук,
       * двата сигнала се разминават — а разминат ли се, търсачката вярва на
       * по-слабия. Резервът е българската версия на СЪЩИЯ адрес, същото,
       * което казва и `alternates()`.
       */
      serialize(item) {
        if (!item.links?.length) return item;
        const fallback = item.links.find((link) => link.lang === 'bg-BG');
        if (fallback) item.links = [...item.links, { url: fallback.url, lang: 'x-default' }];
        return item;
      },
    }),
  ],
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
