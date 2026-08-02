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
  title: 'Кова студио — AI решения, вътрешни приложения и автоматизации',
  description:
    'Бутиково студио за AI асистенти, вътрешни бизнес приложения и интелигентни автоматизации за малки и средни компании. Всеки проект се води лично от senior инженер, с ясен бюджет и измерим резултат.',
  /** Общ фирмен имейл — за запитвания, футър и структурирани данни. */
  email: 'info@kova.bg',
  owner: {
    name: 'Радослав Додников',
    role: 'Основател · Senior AI Data Engineer',
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
  /** Availability pill in the hero. Set to a string to show it again. */
  availability: null,
  /** Booking link for the "30 минути разговор" card. `null` falls back to email. */
  bookingUrl: null,
};

export const NAV = [
  { label: 'Начало', href: '/' },
  { label: 'Услуги', href: '/#services' },
  { label: 'Казуси', href: '/projects/' },
  { label: 'Анализатор', href: '/analyzer/' },
  { label: 'За мен', href: '/#about' },
  { label: 'Блог', href: '/blog/' },
];

export const CTA = { label: 'Опиши ми процеса', href: '/contact/' };
