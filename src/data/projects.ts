/**
 * Портфолио — реални проекти на Кова студио.
 *
 * Редът в масива е редът на страницата. Началната страница показва първите
 * `PROJECTS_ON_HOME` проекта, а `/projects/` показва всички — така новите
 * проекти се добавят само тук, на едно място.
 */

export type Project = {
  /** Име на проекта, както искаш да се чете. */
  name: string;
  /** Пълен адрес, с https://. */
  url: string;
  /** Едно изречение: какво прави и за кого. */
  tagline: string;
  /** 1–3 етикета: тип проект, технология, домейн. */
  tags: string[];
  /** Година или период — по желание. */
  year?: string;
};

/** Колко проекта се показват на началната страница. */
export const PROJECTS_ON_HOME = 6;

/** Домейнът без протокол и без завършваща наклонена черта — за показване. */
export function domainOf(project: Project): string {
  return project.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/** Инициал за плочката на картата. */
export function initialOf(project: Project): string {
  return project.name.trim().charAt(0).toUpperCase();
}

/**
 * Име на файла за екранната снимка на проекта: домейнът без разширението.
 * `routinly.org` → `routinly`, тоест `src/assets/projects/routinly.png`.
 */
export function slugOf(project: Project): string {
  return domainOf(project).replace(/\.[^.]+$/, '');
}

export const PROJECTS: Project[] = [
  {
    name: 'Routinly',
    url: 'https://routinly.org/',
    tagline:
      'Записваш екрана си, а Routinly написва ръководството стъпка по стъпка, със снимки. Това, което отнемаше следобед, става за пет минути.',
    tags: ['AI', 'Документация'],
  },
  {
    name: 'Радио България',
    url: 'https://bulgariaradio.com/',
    tagline:
      'Над 120 български радиостанции — поп, рок, фолк, новини. Директно в браузъра, безплатно и без регистрация.',
    tags: ['Уеб приложение', 'Стрийминг'],
  },
  {
    name: 'Plumeo',
    url: 'https://plumeo.ink/',
    tagline:
      'Превръща обикновен Markdown в документи с живи диаграми и графики — и ги изнася в твоите цветове, шрифт и лого, като PDF или уеб страница.',
    tags: ['Уеб приложение', 'Документи'],
  },
  {
    name: 'По номер',
    url: 'https://ponomer.com/',
    tagline:
      'Винетка, Гражданска отговорност, ГТП и глоби — една проверка по регистрационен номер, с данни от официалните системи.',
    tags: ['Уеб приложение', 'Справки'],
  },
  {
    name: 'Lovable Общност',
    url: 'https://communitylovable.bg/',
    tagline:
      'Форумът на българските Lovable билдъри — въпроси, ръководства, споделени проекти и събития.',
    tags: ['Общност', 'Форум'],
  },
  {
    name: 'Пенсионен калкулатор',
    url: 'https://pensionen-kalkulator.bg/',
    tagline:
      'Кога можеш да се пенсионираш и колко ще получаваш — по правилата на КСО, с държавната пенсия и втория стълб, в евро.',
    tags: ['Калкулатор', 'Финанси'],
  },
];
