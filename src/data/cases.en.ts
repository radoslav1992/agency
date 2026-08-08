/**
 * English mirror of `cases.ts` — the three featured products on the home page.
 *
 * The honesty rule carries over: `own` says which was commissioned by a
 * client and which was my own idea, because the two prove different things.
 * No quotes and no invented metrics — every claim can be checked by opening
 * the product.
 */

import type { ProductStory } from './cases.ts';

export const PRODUCTS_FEATURED: ProductStory[] = [
  {
    name: 'Routinly',
    url: 'https://routinly.org/',
    problem:
      'Writing a procedure takes hours. You describe every step, take the screenshots, then update the document on every change.',
    solution:
      'You record the screen while going through the process. Routinly returns a finished guide with steps and images.',
    under: 'It recognises the individual actions in the video, picks the frames and orders them into instructions.',
    takeaway: 'A guide that would take half a day comes out in five minutes.',
  },
  {
    name: 'Plumeo',
    url: 'https://plumeo.ink/',
    own: true,
    problem:
      'A well-set company document needs a designer or heavy software. And once three people have touched it, the layout falls apart.',
    solution:
      'You write in Markdown, Plumeo produces a branded PDF or web page — with your colours, font and logo.',
    under: 'It generates the diagrams and keeps the web and PDF versions looking the same.',
    takeaway: 'One source of content, two outputs.',
  },
  {
    name: 'Po nomer',
    url: 'https://ponomer.com/',
    problem:
      'Road tax, insurance, roadworthiness and fines each live in a different official system.',
    solution: 'You type the number plate once and see all of it at once.',
    under:
      'It connects several official sources, each of which works in its own way, and shows them on one screen.',
    takeaway: 'Four lookups, one field.',
  },
];
