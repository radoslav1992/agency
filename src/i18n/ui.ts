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
        'Работиш с мен, не с акаунт мениджър',
        'Тръгваме с малък пилот, преди да влагаш бюджет',
        'Целта, срокът и цената са ясни от офертата',
      ],
    },

    carousel: {
      title: 'Готови AI агенти',
      all: (n: number) => `Всички ${n} агента →`,
      prev: 'Предишен агент',
      next: 'Следващ агент',
      pick: 'Избор на агент',
    },

    /*
     * Изявлението след hero-а. Всеки ред се появява отделно при скрол,
     * затова текстът е нарязан по редове, а не на едно изречение —
     * пренасянето не бива да зависи от ширината на екрана.
     *
     * `accent` стои изрично навсякъде, включително `false`. При `as const`
     * пропуснатото свойство липсва в типа и `astro check` се спъва в
     * обединението на двата езика.
     */
    statement: {
      eyebrow: 'Защо изобщо',
      lines: [
        { text: 'Екипът ти губи', accent: false },
        { text: 'часове', accent: true },
        { text: 'за неща, които', accent: false },
        { text: 'машината върши', accent: false },
        { text: 'за секунди', accent: true },
      ],
    },

    journey: {
      eyebrow: 'Как става',
      title: 'Намери работата.',
      lead: 'Три стъпки. Всяка завършва с нещо, което можеш да пипнеш.',
      steps: [
        {
          n: '01',
          title: 'Открий',
          kicker: 'Къде изтичат времето и парите.',
          body: 'Минаваме процеса такъв, какъвто е днес, и броим часовете и стъпките, в които се губят. Ако нищо тук не си струва да се автоматизира, чуваш го на първия разговор — безплатно.',
        },
        {
          n: '02',
          title: 'Построй',
          kicker: 'Процесът става система.',
          body: 'Тръгваме с ограничен пилот върху твоите реални данни, не с демонстрация върху измислени. Виждаш работеща версия още докато я правя, а не чак накрая.',
        },
        {
          n: '03',
          title: 'Работи',
          kicker: 'Всеки ден, без някой да натиска бутони.',
          body: 'Пускане, документация, всички достъпи и обучение да работиш сам със системата. Какво покривам след пускането пише в офертата — преди да започнем, не после.',
        },
      ],
    },

    agentIndex: {
      eyebrow: 'AI агенти',
      /* Броят идва от `AGENTS.length` — заглавие с изписано число остарява
         тихо в деня, в който се добави девети агент. */
      title: (n: number) => `${n} готови агента.`,
      lead: 'Всеки поема по един канал от край до край — глас, чат, поща, документи. Пакетирани, с познат обхват и предвидима цена.',
      hint: 'Посочи агент, за да го видиш.',
      all: (n: number) => `Всичките ${n} агента, с обхват и ограничения →`,
    },

    proof: {
      eyebrow: 'Доказателството',
      title: 'Не говоря за AI. Строя го.',
      lead: 'Работещи продукти, които можеш да отвориш в нов раздел още сега. Не са казуси на хартия.',
      open: 'Отвори',
      all: (n: number) => `Всички ${n} проекта →`,
    },

    servicesPage: {
      title: 'Услуги, процес и цени',
      description:
        'AI агенти, автоматизации, вътрешни системи и бизнес сайтове — с процеса, ориентировъчните бюджети и условията, казани предварително.',
      heading: 'Какво правя и как работя',
      lead: 'Какво правя, как протича работата, колко струва и при какви условия. Всичко на една страница, за да не го питаш по имейл.',
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
      checks: ['SEO', 'Скорост', 'Сигурност', 'Достъпност', 'Технологии', 'Четимост за AI'],
      seconds: '15 секунди',
      free: 'Без регистрация и без имейл',
    },

    /*
     * Надписите по гласовия агент.
     *
     * Ключовете НЕ са измислени — те са същите, с които приставката държи
     * своите английски стойности по подразбиране, и се подават наведнъж
     * през свойството `text-contents`. Отделни свойства от рода на
     * `start-call-text` НЕ съществуват: приставката ги подминава мълчаливо.
     *
     * Преведено е всичко, а не само видимото на пръв поглед. Пропуснат
     * ключ се показва на английски и разговорът тръгва на два езика.
     */
    voiceAgent: {
      main_label: 'Имаш въпрос?',
      start_call: 'Започни разговор',
      start_chat: 'Напиши съобщение',
      send_message: 'Изпрати',
      new_call: 'Нов разговор',
      end_call: 'Приключи',
      mute_microphone: 'Изключи микрофона',
      text_mode: 'Премини към писане',
      voice_mode: 'Премини към говорене',
      switched_to_text_mode: 'Превключено на писане',
      switched_to_voice_mode: 'Превключено на говорене',
      change_language: 'Смени езика',
      collapse: 'Свий',
      expand: 'Разгъни',
      copied: 'Копирано!',
      accept_terms: 'Приемам',
      dismiss_terms: 'Отказ',
      listening_status: 'Слушам',
      speaking_status: 'Говори, за да ме прекъснеш',
      connecting_status: 'Свързвам се',
      chatting_status: 'Разговор с AI агент',
      input_label: 'Поле за съобщение',
      input_placeholder: 'Напиши съобщение…',
      input_placeholder_text_only: 'Напиши съобщение…',
      input_placeholder_new_conversation: 'Започни нов разговор',
      user_ended_conversation: 'Ти приключи разговора',
      agent_ended_conversation: 'Агентът приключи разговора',
      conversation_id: 'ID',
      error_occurred: 'Възникна грешка',
      copy_id: 'Копирай ID',
      initiate_feedback: 'Как мина разговорът?',
      request_follow_up_feedback: 'Разкажи повече',
      thanks_for_feedback: 'Благодаря за отзива!',
      thanks_for_feedback_details: 'Отзивът помага следващият разговор да е по-добър.',
      follow_up_feedback_placeholder: 'Разкажи какво ти направи впечатление…',
      submit: 'Изпрати',
      go_back: 'Назад',
      copy: 'Копирай',
      download: 'Изтегли',
      wrap: 'Пренасяй редовете',
      agent_working: 'Работя…',
      agent_done: 'Готово',
      agent_error: 'Възникна грешка',
      attach_file: 'Прикачи файл',
      remove_file: 'Премахни файла',
      file_upload_error: 'Файлът не се качи.',
      file_type_unsupported: 'Неподдържан тип файл. Приемат се:',
      file_too_large: 'Файлът е над допустимия размер.',
      file_limit_reached: 'Достигнат е максималният брой файлове за този разговор.',
      typing_indicator: 'Агентът пише…',
    },

    process: { eyebrow: 'Процес', title: 'Как протича работата', terms: 'Важните условия — ясни още в началото' },

    about: {
      eyebrow: 'За мен',
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
        'You work with me, not an account manager',
        'We start with a small pilot, before you commit a budget',
        'Goal, deadline and price are settled in the quote',
      ],
    },

    carousel: {
      title: 'Ready-made AI agents',
      all: (n: number) => `All ${n} agents →`,
      prev: 'Previous agent',
      next: 'Next agent',
      pick: 'Choose an agent',
    },

    statement: {
      eyebrow: 'Why bother',
      lines: [
        { text: 'Your team spends', accent: false },
        { text: 'hours', accent: true },
        { text: 'doing things', accent: false },
        { text: 'a machine could do', accent: false },
        { text: 'in seconds', accent: true },
      ],
    },

    journey: {
      eyebrow: 'How it goes',
      title: 'Find the work.',
      lead: 'Three steps. Each one ends with something you can actually touch.',
      steps: [
        {
          n: '01',
          title: 'Discover',
          kicker: 'Where the time and the money disappear.',
          body: 'We walk the process exactly as it runs today and count the hours and the steps that leak them. If nothing here is worth automating, you hear it on the first call — free.',
        },
        {
          n: '02',
          title: 'Build',
          kicker: 'The process becomes a system.',
          body: 'We start with a limited pilot on your real data, not a demo on invented data. You see a working version while I am building it, not at the end.',
        },
        {
          n: '03',
          title: 'Run',
          kicker: 'Every day, without someone pushing buttons.',
          body: 'Launch, documentation, every access credential and training so you can run it yourself. What I cover after launch is in the quote — before we start, not after.',
        },
      ],
    },

    agentIndex: {
      eyebrow: 'AI agents',
      title: (n: number) => `${n} agents, ready to go.`,
      lead: 'Each one takes a single channel end to end — voice, chat, inbox, documents. Packaged, with a known scope and a predictable price.',
      hint: 'Point at an agent to see it.',
      all: (n: number) => `All ${n} agents, with scope and limits →`,
    },

    proof: {
      eyebrow: 'The proof',
      title: "I don't talk about AI. I build it.",
      lead: 'Working products you can open in a new tab right now. Not case studies on paper.',
      open: 'Open',
      all: (n: number) => `All ${n} projects →`,
    },

    servicesPage: {
      title: 'Services, process and pricing',
      description:
        'AI agents, automation, internal systems and business websites — with the process, indicative budgets and terms stated upfront.',
      heading: 'What I do and how I work',
      lead: 'What I do, how the work goes, what it costs and on what terms. All on one page, so you never have to ask by email.',
    },

    services: {
      eyebrow: 'Services',
      title: 'What I can help with',
      note: "Technology is the means. The point is a process that runs faster and doesn't depend on who happens to be in today.",
      problem: 'The problem',
      solution: 'The solution',
      change: 'What changes',
    },

    /* Анализаторът съществува само на български. Празният `title` е
       сигналът, по който секцията не се рендерира на английски. */
    analyzerStrip: {
      eyebrow: '',
      title: '',
      body: '',
      note: '',
      cta: '',
      checks: [],
      seconds: '',
      free: '',
    },

    /* Празно нарочно. Приставката се показва само на български, а нейните
       стойности по подразбиране и без това са английски — няма какво да се
       подава. Ключът стои, за да е еднаква формата на двата езика. */
    voiceAgent: {},

    process: { eyebrow: 'Process', title: 'How the work goes', terms: 'The terms that matter — stated upfront' },

    about: {
      eyebrow: 'About me',
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
