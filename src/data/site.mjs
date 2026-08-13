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
  /**
   * Публичният идентификатор на гласовия агент в ElevenLabs (`agent_…`).
   * `null` изключва приставката изцяло — тя не се появява и нито ред от
   * техния скрипт не се тегли.
   *
   * Идентификаторът е публичен по замисъл и стои в кода на страницата, но
   * това важи САМО за агент, обявен за публичен в ElevenLabs. Стане ли той
   * частен, тук не е мястото на ключ: тогава се минава през подписан адрес
   * от Worker-а, а ключът се слага с `wrangler secret put`.
   *
   * Показва се само на български. Агентът говори български, а приставка,
   * която отговаря на друг език от този на страницата, е по-лоша от липсваща.
   */
  voiceAgentId: null,
  /** Booking link for the "30 минути разговор" card. `null` falls back to email. */
  bookingUrl: null,
};

/**
 * Заглавие и описание по език. Английското описание не е превод на
 * българското — то се чете от друг купувач, който не търси „в България“.
 */
/**
 * Името на студиото по език.
 *
 * Английската версия вече пишеше „Kova Studio is based in Sofia“ на
 * страницата за контакт, докато хедърът, футърът и заглавията на всички
 * подстраници оставаха на кирилица — заглавието на `/en/services/` беше
 * „Services, process and pricing — Кова студио“. Едно и също студио с две
 * изписвания в един и същ документ.
 */
export const BRAND_BY_LOCALE = {
  bg: { name: 'Кова студио', short: 'Кова', suffix: 'студио' },
  en: { name: 'Kova Studio', short: 'Kova', suffix: 'studio' },
};

/** Седалището по език — за футъра и структурираните данни. */
export const LOCATION_BY_LOCALE = {
  bg: { full: 'София, България', city: 'София' },
  en: { full: 'Sofia, Bulgaria', city: 'Sofia' },
};

/** Име и длъжност по език — латиница за английската версия. */
export const OWNER_BY_LOCALE = {
  bg: { name: 'Радослав Додников', role: 'Основател · Софтуерен и AI инженер' },
  en: { name: 'Radoslav Dodnikov', role: 'Founder · Software and AI engineer' },
};

/**
 * Име на изпълнителя за футъра и правните страници. Няма регистрирано
 * дружество — изпълнителят е физическо лице, затова английският вариант е
 * транслитерация на същото име, а не друго юридическо лице.
 */
export const LEGAL_NAME_BY_LOCALE = {
  bg: 'Кова студио · Радослав Додников',
  en: 'Kova Studio · Radoslav Dodnikov',
};

export const META = {
  bg: {
    title: 'Кова студио — AI асистенти, вътрешни системи и автоматизации',
    description:
      'Автоматизирам процеси, които екипът ти още върши на ръка — AI асистенти върху фирмени документи, вътрешни системи и интеграции. Работиш директно с инженера.',
  },
  en: {
    title: 'Kova Studio — AI agents, internal systems and automation',
    description:
      'I automate the work your team still does by hand: AI agents over company documents, phone and inbox, plus internal systems. You work directly with the engineer who builds it.',
  },
};

/**
 * Навигация по език.
 *
 * Английската е по-къса нарочно: анализаторът и блогът съществуват само на
 * български, а връзка, която сменя езика под краката на читателя, е по-лоша
 * от липсваща връзка.
 */
export const NAV_BY_LOCALE = {
  bg: [
    { label: 'Начало', href: '/' },
    /* Собствен адрес, не котва в началната: услугите, процесът, цените и
       условията вече са отделна страница и могат да се класират сами. */
    { label: 'Услуги', href: '/services/' },
    { label: 'AI агенти', href: '/agents/' },
    /** Временно „Проекти“ — връща се на „Казуси“ при първия външен казус. */
    { label: 'Проекти', href: '/projects/' },
    { label: 'Анализатор', href: '/analyzer/' },
    { label: 'За мен', href: '/#about' },
    { label: 'Блог', href: '/blog/' },
  ],
  en: [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services/' },
    { label: 'AI agents', href: '/agents/' },
    { label: 'Projects', href: '/projects/' },
    { label: 'About', href: '/#about' },
  ],
};

export const CTA_BY_LOCALE = {
  bg: { label: 'Да поговорим', href: '/contact/' },
  en: { label: "Let's talk", href: '/contact/' },
};

/** Български по подразбиране — за местата, които още не са двуезични. */
export const NAV = NAV_BY_LOCALE.bg;
export const CTA = CTA_BY_LOCALE.bg;
