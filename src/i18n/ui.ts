/**
 * Надписите по компонентите, на двата езика.
 *
 * Българските низове са пренесени ДУМА ПО ДУМА от компонентите, за да не се
 * промени нищо на българската версия при въвеждането на английската.
 *
 * Английският не е буквален превод навсякъде. Три места са нарочно различни,
 * защото буквалният превод би бил грешен, а не просто тромав:
 *   • „Работа с клиенти от цялата страна“ няма смисъл извън България;
 *   • „ти“ няма съответствие — английският няма учтива форма, така че
 *     непринудеността идва от избора на думи, не от местоимението;
 *   • анализаторът и блогът остават само на български, затова връзките към
 *     тях не се превеждат, а се скриват (виж `NAV` в `site.mjs`).
 */

export const UI = {
  bg: {
    layout: { skip: 'Към съдържанието', blogTitle: 'Блог' },

    header: { nav: 'Основна навигация', open: 'Отвори менюто', close: 'Затвори менюто', home: 'начало' },

    hero: {
      titleLead: 'Автоматизирам работата, която екипът ти още',
      titleAccent: 'върши на ръка',
      lead: 'Готови AI агенти и решения по мярка, които спестяват време на екипа, свалят разходите за ръчна работа и работят 24/7.',
      ctaPrimary: 'Запази безплатен разговор',
      ctaSecondary: 'Виж как работя',
      subnote:
        '30 минути, без ангажимент. Ако процесът ти не става за автоматизация, ще ти го кажа в разговора.',
      analyzerQ: 'Имаш сайт?',
      analyzerA: 'Провери го безплатно за 15 секунди →',
      facts: [
        '🤝 Работиш с мен, не с акаунт мениджър',
        '🧪 Тръгваме с малък пилот, преди да влагаш бюджет',
        '🎯 Целта, срокът и цената са ясни от офертата',
      ],
    },

    carousel: {
      title: 'Готови AI агенти',
      all: (n: number) => `Всички ${n} агента →`,
      prev: 'Предишен агент',
      next: 'Следващ агент',
      pick: 'Избор на агент',
    },

    services: {
      eyebrow: 'Услуги',
      title: 'С какво мога да помогна',
      note: 'Технологията е средство. Целта е процесът да стане по-бърз и да не зависи от това кой е на работа днес.',
      problem: 'Проблемът',
      solution: 'Решението',
      change: 'Какво се променя',
    },

    analyzerStrip: {
      eyebrow: 'Безплатен инструмент',
      title: 'Безплатна проверка на сайта ти',
      body: 'SEO, скорост, сигурност, достъпност, използвани технологии и това дали AI търсачките могат да четат сайта ти. Отнема 15 секунди. Без регистрация, без имейл и без заключени секции — резултатите излизат на екрана и остават твои.',
      note: 'Ако не си сигурен кое от намереното е важно, преглеждам отчета лично и ти казвам кои три неща да оправиш първо. Безплатно, до един работен ден.',
      cta: 'Провери сайта си →',
    },

    process: { eyebrow: 'Процес', title: 'Как протича работата', terms: 'Важните условия — ясни още в началото' },

    about: {
      eyebrow: 'За мен',
      imageAlt: 'Радослав Додников на сцената на техническа конференция',
      projectsStat: (total: number, forClients: number) =>
        ({ value: String(total), label: `пуснати проекта — ${forClients} от тях за клиенти` }),
    },

    products: {
      eyebrow: 'Проекти',
      title: 'Работещи проекти, които можеш да отвориш',
      note: 'Повечето са поръчани от клиенти, две са мои собствени продукти — пише го на всяка карта. Всичките са публични и работят в момента.',
      all: (n: number) => `Всички ${n} проекта →`,
      problem: 'Проблемът',
      solution: 'Решението',
      how: 'Как работи',
      own: 'Собствен продукт',
      client: 'Клиентски проект',
    },

    pilot: {
      eyebrow: 'Пилотна програма',
      title: 'Три свободни места',
      body: 'Имаш идея за автоматизация, но първо искаш да се увериш, че работи? Отварям три места за компании, които да проверят конкретен процес с реални данни. За пилота цената е с 20% по-ниска.',
      note: 'Накрая получаваш работещ прототип и ясна препоръка — има ли смисъл да се продължава. Ако резултатът стане за казус, го публикувам само с твоето одобрение.',
      cta: 'Заяви място в пилотната програма →',
    },

    pricing: {
      eyebrow: 'Цени',
      title: 'Ориентировъчни бюджети',
      note: 'Всеки проект е различен. Тези числа са, за да прецениш още сега дали изобщо си говорим.',
      afterA: 'Цената на пълното решение определям след пилота и техническата оценка. Текущите разходи за сървъри, модели и външни услуги ги казвам предварително — в',
      afterLink: 'офертата на една страница',
      afterB: ', преди да започнем, не после.',
    },

    blog: { eyebrow: 'Блог', title: 'Практично за AI и софтуер', all: 'Всички публикации →' },

    cta: {
      title: 'Имаш процес, който яде твърде много време?',
      body: 'Разкажи ми как върви в момента. Ще ти кажа дали може да се автоматизира и откъде е разумно да се започне. Ако не съм подходящият човек, ще ти го кажа още в разговора.',
      button: 'Запази безплатен разговор',
      note: '30 минути. Не се иска подготовка — покажи ми процеса както си е.',
    },

    footer: {
      nav: 'Долна навигация',
      navTitle: 'Навигация',
      contactTitle: 'Контакт',
      termsTitle: 'Условия',
      reach: '· Работа с клиенти от цялата страна',
      promise: 'Всеки проект — с писмена оферта, договор и фактура.',
      rights: '. Всички права запазени.',
      terms: 'Общи условия',
      privacy: 'Политика за поверителност',
      cookies: 'Политика за бисквитки',
    },


    form: {
      name: 'Име',
      namePlaceholder: 'Име и фамилия',
      email: 'Имейл',
      need: 'От какво имаш нужда?',
      message: 'Разкажи ми накратко',
      messagePlaceholder:
        'Опиши как работи процесът в момента, какво те затруднява и какъв резултат искаш да постигнеш. Не е необходимо да имаш готово техническо задание.',
      honeypot: 'Не попълвай това поле',
      submit: 'Изпрати запитването',
      sending: 'Изпращам…',
      sent: 'Изпратено ✓',
      orEmail: 'Или просто ми пиши на ',
      thanks: 'Благодаря! Получих запитването и ще ти отговоря до един работен ден.',
      /** `{url}` се замества с адреса, дошъл от анализатора. */
      prefill: 'Проверих {url} с безплатната проверка на сайтове. Кои три неща да оправя първо?',
    },

    cookies: {
      label: 'Съгласие за бисквитки',
      bodyA: 'Използвам Google Analytics, за да разбирам кои страници са полезни. Аналитични бисквитки се поставят само със съгласието ти —',
      link: 'виж политиката за бисквитки',
      accept: 'Приемам',
      decline: 'Отказвам',
    },
  },

  en: {
    layout: { skip: 'Skip to content', blogTitle: 'Blog' },

    header: { nav: 'Main navigation', open: 'Open menu', close: 'Close menu', home: 'home' },

    hero: {
      titleLead: 'I automate the work your team still does',
      titleAccent: 'by hand',
      lead: 'Packaged AI agents and custom builds that give your team its hours back, cut the cost of manual work and run around the clock.',
      ctaPrimary: 'Book a free call',
      ctaSecondary: 'See how I work',
      subnote:
        "30 minutes, no commitment. If your process isn't a good fit for automation, I'll tell you on the call.",
      analyzerQ: '',
      analyzerA: '',
      facts: [
        '🤝 You work with me, not an account manager',
        '🧪 We start with a small pilot, before you commit a budget',
        '🎯 Goal, deadline and price are settled in the quote',
      ],
    },

    carousel: {
      title: 'Ready-made AI agents',
      all: (n: number) => `All ${n} agents →`,
      prev: 'Previous agent',
      next: 'Next agent',
      pick: 'Choose an agent',
    },

    services: {
      eyebrow: 'Services',
      title: 'What I can help with',
      note: "Technology is the means. The point is a process that runs faster and doesn't depend on who happens to be in today.",
      problem: 'The problem',
      solution: 'The solution',
      change: 'What changes',
    },

    analyzerStrip: {
      eyebrow: '',
      title: '',
      body: '',
      note: '',
      cta: '',
    },

    process: { eyebrow: 'Process', title: 'How the work goes', terms: 'The terms that matter — stated upfront' },

    about: {
      eyebrow: 'About me',
      imageAlt: 'Radoslav Dodnikov speaking at a technical conference',
      projectsStat: (total: number, forClients: number) =>
        ({ value: String(total), label: `projects shipped — ${forClients} of them for clients` }),
    },

    products: {
      eyebrow: 'Projects',
      title: 'Working projects you can open right now',
      note: 'Most were commissioned by clients, two are my own products — each card says which. All of them are public and live.',
      all: (n: number) => `All ${n} projects →`,
      problem: 'The problem',
      solution: 'The solution',
      how: 'How it works',
      own: 'Own product',
      client: 'Client project',
    },

    pilot: {
      eyebrow: 'Pilot programme',
      title: 'Three places open',
      body: 'Have an automation in mind but want proof it works first? I keep three places open for companies to test one concrete process on real data. Pilots are priced 20% lower.',
      note: "You end up with a working prototype and a straight recommendation on whether to continue. If the result makes a good case study, I publish it only with your approval.",
      cta: 'Claim a pilot place →',
    },

    pricing: {
      eyebrow: 'Pricing',
      title: 'Indicative budgets',
      note: "Every project differs. These numbers are here so you can tell right now whether we're in the same range.",
      /* Без връзка: статията за офертата съществува само на български. */
      afterA: 'The price of the full build is set after the pilot and the technical assessment. Running costs for servers, models and third-party services are stated upfront — in the one-page quote, before we start, not after.',
      afterLink: '',
      afterB: '',
    },

    blog: { eyebrow: 'Blog', title: 'Practical notes on AI and software', all: 'All posts →' },

    cta: {
      title: 'Got a process eating too many hours?',
      body: "Tell me how it runs today. I'll tell you whether it can be automated and where it makes sense to start. If I'm not the right person, you'll hear that on the call.",
      button: 'Book a free call',
      note: 'Thirty minutes. No preparation needed — show me the process exactly as it is.',
    },

    footer: {
      nav: 'Footer navigation',
      navTitle: 'Navigation',
      contactTitle: 'Contact',
      termsTitle: 'Terms',
      reach: '· Working with clients across Europe',
      promise: 'Every project comes with a written quote, a contract and an invoice.',
      rights: '. All rights reserved.',
      terms: 'Terms of service',
      privacy: 'Privacy policy',
      cookies: 'Cookie policy',
    },


    form: {
      name: 'Name',
      namePlaceholder: 'First and last name',
      email: 'Email',
      need: 'What do you need?',
      message: 'Tell me briefly',
      messagePlaceholder:
        'Describe how the process runs today, what makes it hard, and what result you want. You do not need a finished technical specification.',
      honeypot: 'Leave this field empty',
      submit: 'Send enquiry',
      sending: 'Sending…',
      sent: 'Sent ✓',
      orEmail: 'Or just email me at ',
      thanks: 'Thank you. I have your enquiry and will reply within one working day.',
      prefill: 'I checked {url} with the free site audit. Which three things should I fix first?',
    },

    cookies: {
      label: 'Cookie consent',
      bodyA: 'I use Google Analytics to understand which pages are useful. Analytics cookies are set only with your consent —',
      link: 'read the cookie policy',
      accept: 'Accept',
      decline: 'Decline',
    },
  },
} as const;

export type UiStrings = (typeof UI)['bg'];
