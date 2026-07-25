import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPosts } from '../lib/posts.ts';
import { SITE } from '../data/site.mjs';

export const GET: APIRoute = async (context) => {
  const posts = await getPosts();

  return rss({
    title: `Блог — ${SITE.name}`,
    description: 'Записки за AI, уеб и малкия бизнес.',
    site: context.site ?? SITE.url,
    customData: `<language>bg-bg</language>`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.excerpt,
      pubDate: post.data.pubDate,
      categories: [post.data.tag],
      link: `/blog/${post.id}/`,
    })),
  });
};
