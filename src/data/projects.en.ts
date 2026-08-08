/**
 * English mirror of `projects.ts`. Same order, same URLs, same screenshots —
 * only the prose differs, so `slugOf()` keeps finding the same image files.
 *
 * The helpers are re-exported rather than duplicated: they operate on the
 * URL, which is identical in both languages.
 */

import type { Project } from './projects.ts';

export { PROJECTS_ON_HOME, domainOf, initialOf, slugOf } from './projects.ts';

export const PROJECTS: Project[] = [
  {
    name: 'Saprichastie — Pazardzhik',
    url: 'https://saprichastie.org/',
    tagline:
      'A site for a foundation serving people with visual impairments — with a built-in accessibility mode, content structured for screen readers, and an English version.',
    tags: ['Accessibility', 'Bilingual'],
    alt: 'The Saprichastie — Pazardzhik home page, headlined "Sight is not a condition for a full life"',
  },
  {
    name: 'Routinly',
    url: 'https://routinly.org/',
    tagline:
      'Record a process on screen and Routinly produces a finished guide with steps and images. Work that usually takes hours can be done in minutes.',
    tags: ['AI', 'Documentation'],
    alt: 'The Routinly home page — "Hit record. Get documentation." and a screen of a generated guide',
  },
  {
    name: 'Radio Bulgaria',
    url: 'https://bulgariaradio.com/',
    tagline:
      'Over 120 Bulgarian radio stations — pop, rock, folk, news. Straight in the browser, free and without registration.',
    tags: ['Web app', 'Streaming'],
    alt: 'The Radio Bulgaria home page with a search box and a counter of 120 stations',
  },
  {
    name: 'Plumeo',
    own: true,
    url: 'https://plumeo.ink/',
    tagline:
      'Turns Markdown into well-set documents with diagrams, charts, brand colours, fonts and logo. The result can be published as a web page or downloaded as a PDF.',
    tags: ['Web app', 'Documents'],
    alt: 'The Plumeo home page with Markdown on the left and the finished document on the right',
  },
  {
    name: 'Po nomer',
    url: 'https://ponomer.com/',
    tagline:
      'Road tax, insurance, roadworthiness and fines — one check by number plate, against the official registers.',
    tags: ['Web app', 'Lookups'],
    alt: 'The Po nomer home page with a number-plate field and a "Check everything" button',
  },
  {
    name: 'Beaver Games',
    url: 'https://beavergames.online/',
    tagline:
      'A collection of browser games that load almost instantly — no installs, ads or sign-up. Some of them work offline too.',
    tags: ['Web app', 'Games'],
    alt: 'The Beaver Games home page reading "No downloads. Just press start." and a demo of Chicken Attack',
  },
  {
    name: 'Lovable Community',
    own: true,
    url: 'https://communitylovable.bg/',
    tagline:
      'The forum for Bulgarian Lovable builders — questions, guides, shared projects and events.',
    tags: ['Community', 'Forum'],
    alt: 'The Lovable Community forum with the latest threads and a community sidebar',
  },
  {
    name: 'Pension calculator',
    url: 'https://pensionen-kalkulator.bg/',
    tagline:
      'When you can retire and how much you will receive — under Bulgarian social security rules, covering the state pension and the second pillar, in euro.',
    tags: ['Calculator', 'Finance'],
    alt: 'The pension calculator with sliders for year of birth and years of service, and the earliest retirement year calculated',
  },
];
