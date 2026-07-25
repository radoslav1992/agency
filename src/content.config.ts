import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    tag: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    /** Reading time in minutes, as shown in the design ("6 мин"). */
    readMinutes: z.number().int().positive(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
