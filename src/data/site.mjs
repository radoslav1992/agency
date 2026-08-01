/**
 * Site-wide constants. Imported both by `astro.config.mjs` (hence `.mjs`)
 * and by components/pages.
 */
export const SITE = {
  name: 'Кова студио',
  shortName: 'Кова',
  suffix: 'студио',
  /** Change this to the production domain before the first deploy. */
  url: 'https://kova.studio',
  lang: 'bg',
  locale: 'bg_BG',
  title: 'Кова студио — сайтове, приложения и AI агенти',
  description:
    'Кова студио прави сайтове, уеб приложения и AI агенти за български бизнеси. Първи вариант до 2 седмици, работа на етапи и разговор на човешки език.',
  owner: {
    name: 'Радослав Додников',
    role: 'Основател · Senior AI Data Engineer',
    email: 'radoslav.dodnikov@gmail.com',
    linkedin: 'https://www.linkedin.com/in/radoslav-dodnikov',
    linkedinLabel: 'linkedin.com/in/radoslav-dodnikov',
  },
  location: 'София, България',
  /** Availability pill in the hero. Set to a string to show it again. */
  availability: null,
  /** Booking link for the "30 минути разговор" card. `null` falls back to email. */
  bookingUrl: null,
};

export const NAV = [
  { label: 'Начало', href: '/' },
  { label: 'Услуги', href: '/#services' },
  { label: 'Проекти', href: '/projects/' },
  { label: 'Анализатор', href: '/analyzer/' },
  { label: 'За мен', href: '/#about' },
  { label: 'Блог', href: '/blog/' },
];

export const CTA = { label: 'Да поговорим', href: '/contact/' };
