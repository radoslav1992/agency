/**
 * Site-wide constants. Imported both by `astro.config.mjs` (hence `.mjs`)
 * and by components/pages.
 */
export const SITE = {
  name: 'Кова студио',
  shortName: 'Кова',
  suffix: 'студио',
  /** The production domain — drives the sitemap, canonical and og:url адресите. */
  url: 'https://kova.bg',
  lang: 'bg',
  locale: 'bg_BG',
  title: 'Кова студио — AI асистенти, вътрешни системи и автоматизации',
  description:
    'Автоматизирам процеси, които екипът ти още върши на ръка — AI асистенти върху фирмени документи, вътрешни системи и интеграции. Работиш директно с инженера.',
  /** Общ фирмен имейл — за запитвания, футър и структурирани данни. */
  email: 'info@kova.bg',
  owner: {
    name: 'Радослав Додников',
    /** Български вариант за сайта; официалната длъжност остава в LinkedIn. */
    role: 'Основател · Софтуерен и AI инженер',
    /** Директен контакт с основателя. */
    email: 'radoslav.dodnikov@kova.bg',
    linkedin: 'https://www.linkedin.com/in/radoslav-dodnikov',
    linkedinLabel: 'linkedin.com/in/radoslav-dodnikov',
  },
  location: 'София, България',
  /** Година на основаване — стои във футъра и в структурираните данни. */
  founded: 2026,
  /**
   * Официално име на изпълнителя за футъра и общите условия. Смени го с
   * името на дружеството (напр. „Кова студио ЕООД, ЕИК …“), когато има такова.
   */
  legalName: 'Кова студио · Радослав Додников',
  /**
   * Google Analytics 4 measurement ID. Зарежда се само след съгласие от
   * банера за бисквитки. `null` изключва аналитиката и банера изцяло.
   */
  gaId: 'G-5B1VWF8HL4',
  /** Availability pill in the hero. Set to a string to show it again. */
  availability: null,
  /** Booking link for the "30 минути разговор" card. `null` falls back to email. */
  bookingUrl: null,
};

export const NAV = [
  { label: 'Начало', href: '/' },
  { label: 'Услуги', href: '/#services' },
  /** Временно „Проекти“ — връща се на „Казуси“ при първия външен казус. */
  { label: 'Проекти', href: '/projects/' },
  { label: 'Анализатор', href: '/analyzer/' },
  { label: 'За мен', href: '/#about' },
  { label: 'Блог', href: '/blog/' },
];

export const CTA = { label: 'Да поговорим', href: '/contact/' };
