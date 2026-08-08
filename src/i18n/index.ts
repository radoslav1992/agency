/**
 * Двуезичие: български на корена, английски под `/en/`.
 *
 * Българският е по подразбиране и НЕ получава префикс — съществуващите
 * адреси не се променят и нищо не се пренасочва. Английският е огледало,
 * не отделен сайт: същите компоненти, друг речник.
 *
 * Компонентите не получават език като свойство. Взимат го от
 * `Astro.currentLocale`, което Astro попълва от адреса. Така добавянето на
 * секция не изисква прекарване на език през пет нива.
 */

export const LOCALES = ['bg', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'bg';

/** Езикът на текущата страница, със сигурен резерв. */
export function localeOf(currentLocale: string | undefined): Locale {
  return (LOCALES as readonly string[]).includes(currentLocale ?? '')
    ? (currentLocale as Locale)
    : DEFAULT_LOCALE;
}

/**
 * Адрес на същата страница на друг език.
 *
 * `/agents/` ⇄ `/en/agents/`, `/` ⇄ `/en/`. Работи и в двете посоки, за да
 * може превключвателят да е един компонент.
 */
export function pathForLocale(pathname: string, target: Locale): string {
  const bare = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  const withSlash = bare.startsWith('/') ? bare : `/${bare}`;
  if (target === DEFAULT_LOCALE) return withSlash;
  return withSlash === '/' ? '/en/' : `/en${withSlash}`;
}

/** Префикс за вътрешните връзки в даден език: `''` за български, `/en` иначе. */
export function prefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

/**
 * Адрес вътре в текущия език. `href('/contact/', 'en')` → `/en/contact/`.
 * Външните адреси и котвите се връщат непроменени.
 */
export function href(path: string, locale: Locale): string {
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  return `${prefix(locale)}${path}`;
}

/**
 * Страниците, които съществуват и на двата езика.
 *
 * Анализаторът, блогът и /research са само на български. Без този списък
 * `hreflang` сочеше към `/en/analyzer/` и подобни, които връщат 404 — а
 * `hreflang` към несъществуваща страница е грешка, която Search Console
 * отчита. Същият списък пази и превключвателя да не води в нищото.
 */
const TRANSLATED = ['/', '/agents/', '/projects/', '/contact/', '/terms/', '/privacy/', '/cookies/'];

/** Пътят без езиков префикс — за сравнение между двата езика. */
export function barePath(pathname: string): string {
  return pathname.replace(/^\/en(?=\/|$)/, '') || '/';
}

/** Има ли тази страница вариант на другия език. */
export function hasTranslation(pathname: string): boolean {
  return TRANSLATED.includes(barePath(pathname));
}

/**
 * Езиковите двойки за `hreflang` в `<head>`.
 *
 * Върху непреведена страница връща само нейния собствен език: една самотна
 * двойка не носи информация, но погрешната води робота в 404.
 */
export function alternates(pathname: string): { locale: Locale; hreflang: string; path: string }[] {
  if (!hasTranslation(pathname)) return [];
  return [
    { locale: 'bg', hreflang: 'bg', path: pathForLocale(pathname, 'bg') },
    { locale: 'en', hreflang: 'en', path: pathForLocale(pathname, 'en') },
  ];
}

/** `lang` и `og:locale` за съответния език. */
export const HTML_LANG: Record<Locale, string> = { bg: 'bg', en: 'en' };
export const OG_LOCALE: Record<Locale, string> = { bg: 'bg_BG', en: 'en_GB' };
