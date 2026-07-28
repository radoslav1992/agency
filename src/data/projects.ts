/**
 * Портфолио — реални проекти на Кова студио.
 *
 * ⚠️ ОПИСАНИЯТА СА ЗА ПОТВЪРЖДЕНИЕ. Средата, в която беше построен сайтът,
 * няма достъп до интернет, така че съдържанието на сайтовете не е четено —
 * текстовете по-долу са предположение по името на домейна. Прегледай ги и
 * поправи `tagline` и `tags` за всеки проект.
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

export const PROJECTS: Project[] = [
  {
    name: 'Routinly',
    url: 'https://routinly.org/',
    tagline: 'Приложение за изграждане и проследяване на ежедневни навици и рутини.',
    tags: ['Уеб приложение', 'Продукт'],
  },
  {
    name: 'The AI Cofounder',
    url: 'https://the-ai-cofounder.com/',
    tagline: 'AI съосновател за предприемачи — помага при идеите, плана и следващата стъпка.',
    tags: ['AI агент', 'Продукт'],
  },
  {
    name: 'Bulgaria Radio',
    url: 'https://bulgariaradio.com/',
    tagline: 'Българските радиостанции на едно място — слушане директно в браузъра.',
    tags: ['Уеб приложение', 'Стрийминг'],
  },
  {
    name: 'Plumeo',
    url: 'https://plumeo.ink/',
    tagline: 'Инструмент за писане, подпомогнат от езикови модели.',
    tags: ['Уеб приложение', 'AI'],
  },
  {
    name: 'Пенсионен калкулатор',
    url: 'https://pensionen-kalkulator.bg/',
    tagline: 'Изчислява очакваната пенсия по българските правила — на разбираем език.',
    tags: ['Калкулатор', 'Сайт'],
  },
  {
    name: 'Community Lovable BG',
    url: 'https://communitylovable.bg/',
    tagline: 'Общността на българските Lovable създатели — новини, събития и проекти.',
    tags: ['Общност', 'Сайт'],
  },
  {
    name: 'Omni Coworker',
    url: 'https://omnicoworker.eu/',
    tagline: 'AI колега, който поема рутинните задачи в екипа.',
    tags: ['AI агент', 'Автоматизации'],
  },
  {
    name: 'AI Help Center',
    url: 'https://aihelpcenter.dev/',
    tagline: 'Помощен център, в който AI отговаря на въпросите на потребителите по документацията.',
    tags: ['RAG', 'Поддръжка'],
  },
  {
    name: 'Sentinel Local',
    url: 'https://sentinellocal.org/',
    tagline: 'Наблюдение и сигнали, които работят локално — без данните да напускат средата.',
    tags: ['Локални LLM', 'Мониторинг'],
  },
  {
    name: 'Prompts BG',
    url: 'https://promptsbg.com/',
    tagline: 'Библиотека с промптове на български — готови за реална работа.',
    tags: ['AI', 'Ресурс'],
  },
  {
    name: 'Fiction & Fact Library',
    url: 'https://fictionandfactlibrary.com/',
    tagline: 'Библиотека за книги — художествена литература и нехудожествени заглавия на едно място.',
    tags: ['Уеб приложение', 'Съдържание'],
  },
  {
    name: 'The Everyday Revolution',
    url: 'https://theeverydayrevolution.com/',
    tagline: 'Издание за малките ежедневни промени, които се натрупват в голяма разлика.',
    tags: ['Съдържание', 'Сайт'],
  },
  {
    name: 'Ponomer',
    url: 'https://ponomer.com/',
    tagline: 'Бърза справка по номер, без регистрация и без излишни стъпки.',
    tags: ['Уеб приложение'],
  },
];
